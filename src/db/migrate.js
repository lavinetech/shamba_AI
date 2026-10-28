import fs from 'node:fs/promises';
import { query, pool } from './pool.js';

await query(await fs.readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
console.log('Database schema is ready.');
await pool.end();
