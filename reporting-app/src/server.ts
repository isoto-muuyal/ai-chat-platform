import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { testConnection } from './config/db.js';

const server = http.createServer(app);

let isShuttingDown = false;

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  return () => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown');

    server.close((err) => {
      if (err) {
        logger.error({ err }, 'Error during server shutdown');
        process.exit(1);
      }

      logger.info('Server closed successfully');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };
};

process.on('SIGTERM', gracefulShutdown('SIGTERM'));
process.on('SIGINT', gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, 'Unhandled rejection');
  process.exit(1);
});

const PORT = env.PORT;

// Test database connection before starting server
testConnection()
  .then((connected) => {
    if (!connected) {
      logger.error('Failed to connect to database. Server will not start.');
      process.exit(1);
    }

    server.listen(PORT, () => {
      logger.info({ port: PORT, env: env.NODE_ENV }, 'Server started');
    });
  })
  .catch((err) => {
    logger.fatal({ err }, 'Fatal error during startup');
    process.exit(1);
  });


