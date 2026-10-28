import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;
export const pool = env.databaseUrl
  ? new Pool({ connectionString: env.databaseUrl, ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined })
  : null;

export async function query(text, params = []) {
  if (!pool) throw new Error('Database is not configured. Set DATABASE_URL.');
  return pool.query(text, params);
}
