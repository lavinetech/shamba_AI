import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from './config/env.js';
import { query } from './db/pool.js';
import { issueSession, requireAuth } from './middleware/auth.js';
import { completeChat } from './services/gradient-ai.js';
import { getWeather } from './services/weather.js';
import { calculateProfit } from './services/calculator.js';

const publicDir = path.resolve('public');
const uploadDir = path.resolve(env.uploadDir);
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)) });
const emailSchema = z.string().email().max(254);
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(publicDir));

const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true });
const aiLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true });
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'shamba-ai', time: new Date().toISOString() }));

app.post('/api/auth/register', authLimit, asyncRoute(async (req, res) => {
  const body = z.object({ email: emailSchema, password: z.string().min(8).max(128), fullName: z.string().trim().min(2).max(100) }).parse(req.body);
  const passwordHash = await bcrypt.hash(body.password, 12);
  try {
    const { rows } = await query('INSERT INTO users (email,password_hash,full_name) VALUES ($1,$2,$3) RETURNING id,email,full_name', [body.email.toLowerCase(), passwordHash, body.fullName]);
    issueSession(res, rows[0]);
    res.status(201).json({ user: rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'An account with that email already exists.' });
    throw error;
  }
}));
app.post('/api/auth/login', authLimit, asyncRoute(async (req, res) => {
  const body = z.object({ email: emailSchema, password: z.string().min(1) }).parse(req.body);
  const { rows } = await query('SELECT id,email,full_name,password_hash FROM users WHERE email=$1', [body.email.toLowerCase()]);
  if (!rows[0] || !(await bcrypt.compare(body.password, rows[0].password_hash))) return res.status(401).json({ error: 'Invalid email or password.' });
  issueSession(res, rows[0]);
  res.json({ user: { id: rows[0].id, email: rows[0].email, full_name: rows[0].full_name } });
}));
app.post('/api/auth/logout', (_req, res) => { res.clearCookie('shamba_token'); res.status(204).end(); });
app.get('/api/auth/me', requireAuth, asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT id,email,full_name,location,created_at FROM users WHERE id=$1', [req.user.id]);
  if (!rows[0]) return res.status(401).json({ error: 'Account not found.' });
  res.json({ user: rows[0] });
}));

app.get('/api/guides', asyncRoute(async (req, res) => {
  const term = String(req.query.search || '').trim();
  const category = String(req.query.category || '').trim();
  const { rows } = await query('SELECT id,slug,title,category,overview FROM farming_guides WHERE ($1 = \'\' OR title ILIKE $2 OR overview ILIKE $2) AND ($3 = \'\' OR category=$3) ORDER BY title', [term, `%${term}%`, category]);
  res.json({ guides: rows });
}));
app.get('/api/guides/:id', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM farming_guides WHERE id=$1 OR slug=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Guide not found.' });
  res.json({ guide: rows[0] });
}));

app.get('/api/farms', requireAuth, asyncRoute(async (req, res) => { const { rows } = await query('SELECT * FROM farms WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]); res.json({ farms: rows }); }));
app.post('/api/farms', requireAuth, asyncRoute(async (req, res) => { const b = z.object({ name: z.string().trim().min(1).max(100), location: z.string().trim().max(200).optional(), area: z.coerce.number().nonnegative().optional(), areaUnit: z.string().max(20).default('acres') }).parse(req.body); const { rows } = await query('INSERT INTO farms (user_id,name,location,area,area_unit) VALUES ($1,$2,$3,$4,$5) RETURNING *', [req.user.id,b.name,b.location || null,b.area ?? null,b.areaUnit]); res.status(201).json({ farm: rows[0] }); }));
app.delete('/api/farms/:id', requireAuth, asyncRoute(async (req, res) => { const result = await query('DELETE FROM farms WHERE id=$1 AND user_id=$2', [req.params.id,req.user.id]); if (!result.rowCount) return res.status(404).json({ error: 'Farm not found.' }); res.status(204).end(); }));

app.get('/api/tasks', requireAuth, asyncRoute(async (req, res) => { const { rows } = await query('SELECT * FROM farm_tasks WHERE user_id=$1 ORDER BY due_date', [req.user.id]); res.json({ tasks: rows }); }));
app.post('/api/tasks', requireAuth, asyncRoute(async (req, res) => { const b = z.object({ title:z.string().trim().min(1).max(120), dueDate:z.string(), taskType:z.string().max(40).default('other'), farmId:z.string().uuid().optional(), cropName:z.string().max(80).optional(), notes:z.string().max(1000).optional() }).parse(req.body); const { rows } = await query('INSERT INTO farm_tasks (user_id,farm_id,title,due_date,task_type,crop_name,notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [req.user.id,b.farmId || null,b.title,b.dueDate,b.taskType,b.cropName || null,b.notes || null]); res.status(201).json({ task: rows[0] }); }));
app.patch('/api/tasks/:id', requireAuth, asyncRoute(async (req, res) => { const b = z.object({ status:z.enum(['pending','completed']).optional(), title:z.string().trim().min(1).max(120).optional() }).parse(req.body); const { rows } = await query('UPDATE farm_tasks SET status=COALESCE($1,status),title=COALESCE($2,title) WHERE id=$3 AND user_id=$4 RETURNING *', [b.status || null,b.title || null,req.params.id,req.user.id]); if (!rows[0]) return res.status(404).json({ error:'Task not found.' }); res.json({ task: rows[0] }); }));

app.get('/api/ai/conversations', requireAuth, asyncRoute(async (req, res) => { const { rows } = await query('SELECT * FROM ai_conversations WHERE user_id=$1 ORDER BY updated_at DESC', [req.user.id]); res.json({ conversations: rows }); }));
app.post('/api/ai/chat', requireAuth, aiLimit, asyncRoute(async (req, res) => {
  const b = z.object({ conversationId:z.string().uuid().optional(), message:z.string().trim().min(1).max(4000) }).parse(req.body);
  let conversationId = b.conversationId;
  if (conversationId) { const owned = await query('SELECT id FROM ai_conversations WHERE id=$1 AND user_id=$2', [conversationId,req.user.id]); if (!owned.rowCount) return res.status(404).json({ error:'Conversation not found.' }); }
  else { const created = await query('INSERT INTO ai_conversations (user_id,title) VALUES ($1,$2) RETURNING id', [req.user.id,b.message.slice(0,60)]); conversationId = created.rows[0].id; }
  const history = await query('SELECT role,content FROM ai_messages WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT 20', [conversationId]);
  await query('INSERT INTO ai_messages (conversation_id,role,content) VALUES ($1,$2,$3)', [conversationId,'user',b.message]);
  let answer;
  try { answer = await completeChat([...history.rows.reverse(), { role:'user', content:b.message }]); }
  catch (error) { return res.status(503).json({ error: error.message }); }
  await query('INSERT INTO ai_messages (conversation_id,role,content) VALUES ($1,$2,$3)', [conversationId,'assistant',answer]);
  res.json({ conversationId, answer });
}));

app.get('/api/weather', requireAuth, asyncRoute(async (req, res) => { const location = z.string().trim().min(2).max(100).parse(req.query.location); try { res.json({ weather: await getWeather(location) }); } catch (error) { res.status(503).json({ error: error.message }); } }));
app.post('/api/profit-estimates', requireAuth, asyncRoute(async (req, res) => { const input = z.record(z.union([z.string(),z.number()])).parse(req.body); const results = calculateProfit(input); const { rows } = await query('INSERT INTO profit_estimates (user_id,name,inputs,results) VALUES ($1,$2,$3,$4) RETURNING *', [req.user.id,String(input.name || 'Estimate'),input,results]); res.status(201).json({ estimate: rows[0] }); }));
app.get('/api/dashboard/summary', requireAuth, asyncRoute(async (req, res) => { const [farms,tasks,conversations] = await Promise.all([query('SELECT count(*)::int AS count FROM farms WHERE user_id=$1',[req.user.id]),query('SELECT count(*)::int AS count FROM farm_tasks WHERE user_id=$1 AND status=\'pending\'',[req.user.id]),query('SELECT count(*)::int AS count FROM ai_conversations WHERE user_id=$1',[req.user.id])]); res.json({ farms:farms.rows[0].count, pendingTasks:tasks.rows[0].count, conversations:conversations.rows[0].count }); }));
app.post('/api/disease/analyze', requireAuth, upload.single('image'), asyncRoute(async (req, res) => { if (!req.file) return res.status(400).json({ error:'Upload a JPEG, PNG, or WebP image up to 5 MB.' }); const b = z.object({ cropName:z.string().trim().min(1).max(80), location:z.string().max(100).optional(), symptoms:z.string().max(1000).optional() }).parse(req.body); const { rows } = await query('INSERT INTO disease_analyses (user_id,crop_name,location,symptoms,filename,status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,crop_name,location,symptoms,status,created_at', [req.user.id,b.cropName,b.location || null,b.symptoms || null,req.file.filename,'pending']); res.status(202).json({ analysis: rows[0], message:'Image received. Vision analysis is only available when a configured model supports image input; no diagnosis has been claimed.' }); }));

app.use((error, _req, res, _next) => { if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request.', details: error.flatten() }); if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Image exceeds the 5 MB limit.' : 'Invalid upload.' }); console.error(error.message); res.status(500).json({ error: 'An unexpected server error occurred.' }); });
export function createApp() { return app; }
