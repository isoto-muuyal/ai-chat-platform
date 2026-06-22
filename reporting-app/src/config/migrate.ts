import { readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const migrationsDir = join(__dirname, '../../sql/migrations');

export async function runMigrations(): Promise<void> {
  let files: string[];
  try {
    files = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();
  } catch (err) {
    logger.warn({ err, migrationsDir }, 'No migrations directory found, skipping migrations');
    return;
  }

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    try {
      await pool.query(sql);
      logger.info({ file }, 'Applied migration');
    } catch (err) {
      logger.error({ err, file }, 'Migration failed');
      throw err;
    }
  }
}
