import express from 'express';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import routes from '../routes/index.js';

const app = express();

// Request logging middleware
app.use(pinoHttp({ logger }));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const chatLimiter = rateLimit({
  windowMs: env.CHAT_RATE_LIMIT_WINDOW_MS,
  max: env.CHAT_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/v1/chat', chatLimiter);

// Routes
app.use(routes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
