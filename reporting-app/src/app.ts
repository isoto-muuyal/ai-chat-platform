import express from 'express';
import session from 'express-session';
import pinoHttp from 'pino-http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from './config/logger.js';
import { env } from './config/env.js';
import loginRouter from './routes/login.js';
import healthRouter from './routes/health.js';
import indexRouter from './routes/index.js';
import apiRouter from './routes/api.js';
import apiConversationsRouter from './routes/api-conversations.js';
import conversationsRouter from './routes/conversations.js';
import exportRouter from './routes/export.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', join(__dirname, '../views'));

// Request logging middleware
app.use(pinoHttp({ logger }));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Routes
app.use(healthRouter);
app.use(loginRouter);
app.use('/api', apiRouter);
app.use('/api', apiConversationsRouter);
app.use('/export', exportRouter);
app.use('/conversations', conversationsRouter);
app.use(indexRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).render('error', { message: 'Page not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).render('error', { message: 'Internal Server Error' });
});

export default app;

