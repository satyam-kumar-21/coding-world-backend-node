import { Worker, Job } from 'bullmq';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { rankingsService } from '../../modules/rankings/rankings.service';
import { QUEUE_NAMES } from '../../constants';
import type { XpUpdateJobData } from '../../lib/queue.service';

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

export const xpWorker = new Worker<XpUpdateJobData>(
  QUEUE_NAMES.XP_UPDATE,
  async (job: Job<XpUpdateJobData>) => {
    const { userId, amount, type, entityId, entityType, description } = job.data;
    await rankingsService.addXp(userId, amount, type, entityId, entityType, description);
    await rankingsService.checkAndAwardAchievements(userId);
    // Update problem stats if this is a problem solve
    if (type === 'PROBLEM_SOLVE' && entityType === 'PROBLEM' && entityId) {
      const { prisma } = await import('../../config/database');
      const problem = await prisma.problem.findUnique({ where: { id: entityId }, select: { difficulty: true } });
      if (problem) await rankingsService.updateProblemStats(userId, problem.difficulty);
    }
    logger.info({ jobId: job.id, userId, amount }, 'XP updated');
  },
  { connection, concurrency: env.BULL_CONCURRENCY },
);

xpWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'XP job failed'));
