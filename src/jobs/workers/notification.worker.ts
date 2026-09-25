import { Worker, Job } from 'bullmq';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { notificationsService } from '../../modules/notifications/notifications.service';
import { emitToUser } from '../../sockets/index';
import { QUEUE_NAMES, SOCKET_EVENTS } from '../../constants';
import type { NotificationJobData } from '../../lib/queue.service';

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

export const notificationWorker = new Worker<NotificationJobData>(
  QUEUE_NAMES.NOTIFICATIONS,
  async (job: Job<NotificationJobData>) => {
    const notification = await notificationsService.create(job.data);
    // Push real-time notification via Socket.IO
    try {
      emitToUser(job.data.userId, SOCKET_EVENTS.NOTIFICATION_NEW, { notification });
    } catch {
      // Socket.IO may not be initialized in worker context — that's fine
    }
    logger.info({ jobId: job.id, userId: job.data.userId }, 'Notification created');
  },
  { connection, concurrency: env.BULL_CONCURRENCY },
);

notificationWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Notification job failed'));
