import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function requireAuth(req, res, next) {
  const token = req.cookies?.shamba_token;
  if (!token || !env.jwtSecret) return res.status(401).json({ error: 'Authentication required.' });
  try {
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

export function issueSession(res, user) {
  if (!env.jwtSecret) throw new Error('JWT_SECRET is not configured.');
  const token = jwt.sign({ id: user.id, email: user.email }, env.jwtSecret, { expiresIn: '7d' });
  res.cookie('shamba_token', token, { httpOnly: true, sameSite: 'lax', secure: env.cookieSecure, maxAge: 7 * 86400000 });
}
