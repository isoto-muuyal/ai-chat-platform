import express from 'express';
import session from 'express-session';
import pinoHttp from 'pino-http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from './config/logger.js';
import { env } from './config/env.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import apiRouter from './routes/api.js';
import exportRouter from './routes/export.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Request logging middleware
app.use(pinoHttp({ logger }));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - same origin only
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || origin === req.headers.host) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  return next();
});

// Session middleware
app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.COOKIE_SECURE,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
  })
);

// API routes
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);
app.use('/api/export', exportRouter);
app.use(healthRouter);

// Serve React app in production
if (env.NODE_ENV === 'production') {
  const publicPath = join(__dirname, '../dist/public');
  app.use(express.static(publicPath));
  app.get('*', (_req, res) => {
    return res.sendFile(join(publicPath, 'index.html'));
  });
}

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
