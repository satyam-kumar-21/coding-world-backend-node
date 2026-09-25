import { emailWorker } from './workers/email.worker';
import { notificationWorker } from './workers/notification.worker';
import { xpWorker } from './workers/xp.worker';
import { codeExecutionWorker } from './workers/code-execution.worker';
import { cleanupWorker } from './workers/cleanup.worker';
import { logger } from '../config/logger';
import { Queue } from 'bullmq';
import { env } from '../config/env';

const connection = (() => {
  const url = new URL(env.REDIS_URL.replace('redis://', 'http://'));
  return {
    host: url.hostname,
    port: parseInt(url.port || '6379'),
    password: url.password || env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  };
})();

export async function startWorkers() {
  logger.info('Starting BullMQ workers...');
  // Workers auto-start on import — just log
  logger.info('✅ Email worker ready');
  logger.info('✅ Notification worker ready');
  logger.info('✅ XP worker ready');
  logger.info('✅ Code execution worker ready');
  logger.info('✅ Cleanup worker ready');

  // Schedule cleanup job every 6 hours
  const cleanupQueue = new Queue('cleanup', { connection });
  await cleanupQueue.add('cleanup', {}, {
    repeat: { every: 6 * 60 * 60 * 1000 },
    removeOnComplete: true,
  });
  await cleanupQueue.close();
}

export async function stopWorkers() {
  await Promise.all([
    emailWorker.close(),
    notificationWorker.close(),
    xpWorker.close(),
    codeExecutionWorker.close(),
    cleanupWorker.close(),
  ]);
  logger.info('All workers stopped');
}
