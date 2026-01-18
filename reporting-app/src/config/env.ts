import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const envSchema = z.object({
  PORT: z
    .string()
    .default('3001')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(65535)),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  DB_URL: z.string().url('DB_URL must be a valid PostgreSQL connection URL'),
  ADMIN_USER: z.string().min(1, 'ADMIN_USER is required'),
  ADMIN_PASS: z.string().min(1, 'ADMIN_PASS is required'),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters')
    .default('change-this-secret-in-production-min-32-chars'),
  AUTH_RATE_LIMIT_WINDOW_MS: z
    .string()
    .default('60000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1000)),
  AUTH_RATE_LIMIT_MAX: z
    .string()
    .default('10')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1)),
  MESSAGE_ENCRYPTION_KEY: z.string().min(16, 'MESSAGE_ENCRYPTION_KEY is required'),
  MAILERSEND_API_KEY: z.string().min(1, 'MAILERSEND_API_KEY is required'),
  MAIL_FROM: z.string().email('MAIL_FROM must be a valid email'),
  APP_BASE_URL: z.string().url('APP_BASE_URL must be a valid URL'),
  CHAT_API_URL: z.string().url('CHAT_API_URL must be a valid URL'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    error.issues.forEach((err) => {
      console.error(`  ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export { env };
