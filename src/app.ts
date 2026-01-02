import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './config/logger.js';
import routes from './routes/index.js';

const app = express();

// Request logging middleware
app.use(pinoHttp({ logger }));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

