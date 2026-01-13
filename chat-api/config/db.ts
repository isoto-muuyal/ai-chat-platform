import { Pool } from 'pg';
import { env } from './env.js';
import { logger } from './logger.js';

export const pool = new Pool({
  connectionString: env.DB_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  logger.info('PostgreSQL client connected');
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
});
