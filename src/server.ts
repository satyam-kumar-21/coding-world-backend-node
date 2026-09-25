import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { initSocketIO } from './sockets';
import { startWorkers, stopWorkers } from './jobs';
import { logger } from './config/logger';
import { env } from './config/env';

async function bootstrap() {
  // ─── Connect dependencies ──────────────────────────────────
  await connectDatabase();
  await connectRedis();

  // ─── Create HTTP server ────────────────────────────────────
  const app = createApp();
  const httpServer = http.createServer(app);

  // ─── Socket.IO ─────────────────────────────────────────────
  initSocketIO(httpServer);
  logger.info('✅ Socket.IO initialized');

  // ─── BullMQ workers ────────────────────────────────────────
  await startWorkers();

  // ─── Start listening ───────────────────────────────────────
  httpServer.listen(env.PORT, () => {
    logger.info(`✅ ${env.APP_NAME} server running on port ${env.PORT}`);
    logger.info(`   Environment : ${env.NODE_ENV}`);
    logger.info(`   API prefix  : /api/v1`);
    logger.info(`   API docs    : http://localhost:${env.PORT}/api/docs`);
    logger.info(`   Health      : http://localhost:${env.PORT}/health`);
  });

  // ─── Graceful shutdown ─────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');
    httpServer.close(async () => {
      logger.info('HTTP server closed');
      await stopWorkers();
      await disconnectDatabase();
      await disconnectRedis();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    });
    // Force exit after 30s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — shutting down');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Bootstrap failed');
  process.exit(1);
});
