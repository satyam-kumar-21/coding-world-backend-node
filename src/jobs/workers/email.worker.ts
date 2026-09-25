import { Worker, Job } from 'bullmq';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { emailService } from '../../lib/email.service';
import { QUEUE_NAMES } from '../../constants';
import type { EmailJobData } from '../../lib/queue.service';

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

export const emailWorker = new Worker<EmailJobData>(
  QUEUE_NAMES.EMAIL,
  async (job: Job<EmailJobData>) => {
    const { to, subject, html, text } = job.data;
    await emailService.send({ to, subject, html, text });
    logger.info({ jobId: job.id, to }, 'Email sent via worker');
  },
  {
    connection,
    concurrency: env.BULL_CONCURRENCY,
  },
);

emailWorker.on('completed', (job) => logger.debug({ jobId: job.id }, 'Email job completed'));
emailWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Email job failed'));
