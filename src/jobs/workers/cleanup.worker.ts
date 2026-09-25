import { Worker, Job } from 'bullmq';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { QUEUE_NAMES } from '../../constants';

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

export const cleanupWorker = new Worker(
  QUEUE_NAMES.CLEANUP,
  async (job: Job) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    // Delete expired refresh tokens
    await prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: now } } });

    // Delete used email verifications older than 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    await prisma.emailVerification.deleteMany({ where: { usedAt: { lt: sevenDaysAgo } } });

    // Delete used password resets older than 7 days
    await prisma.passwordReset.deleteMany({ where: { usedAt: { lt: sevenDaysAgo } } });

    logger.info({ jobId: job.id }, 'Cleanup job completed');
  },
  { connection, concurrency: 1 },
);
