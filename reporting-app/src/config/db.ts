import { Pool } from 'pg';
import { env } from './env.js';
import { logger } from './logger.js';

export const pool = new Pool({
  connectionString: env.DB_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test connection on startup
pool.on('connect', () => {
  logger.info('PostgreSQL client connected');
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
});

// Test the connection
export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info({ time: result.rows[0].now }, 'PostgreSQL connection test successful');
    return true;
  } catch (err) {
    logger.error({ err }, 'PostgreSQL connection test failed');
    return false;
  }
}

