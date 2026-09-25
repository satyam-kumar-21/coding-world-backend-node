import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { QUEUE_NAMES } from '../constants';

const connection = { maxRetriesPerRequest: null, enableReadyCheck: false, ...(() => {
  const url = new URL(env.REDIS_URL.replace('redis://', 'http://'));
  return {
    host: url.hostname,
    port: parseInt(url.port || '6379'),
    password: url.password || env.REDIS_PASSWORD || undefined,
  };
})() };

// ─── Queue Factory ────────────────────────────────────────────────────────────

const queues: Map<string, Queue> = new Map();

export function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    const q = new Queue(name, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    });
    queues.set(name, q);
  }
  return queues.get(name)!;
}

// ─── Typed Queue Helpers ──────────────────────────────────────────────────────

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  template?: string;
  templateData?: Record<string, unknown>;
}

export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  data?: Record<string, unknown>;
}

export interface CodeExecutionJobData {
  submissionId: string;
  userId: string;
  problemId: string;
  language: string;
  sourceCode: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  testCases: unknown[];
}

export interface XpUpdateJobData {
  userId: string;
  amount: number;
  type: string;
  entityId?: string;
  entityType?: string;
  description?: string;
}

export interface LeaderboardJobData {
  type: 'global' | 'weekly' | 'monthly';
}

export interface CertificateJobData {
  userId: string;
  courseId: string;
  courseTitle: string;
  userName: string;
  completedAt: string;
}

// ─── Queue instances ──────────────────────────────────────────────────────────

export const emailQueue = getQueue(QUEUE_NAMES.EMAIL);
export const notificationQueue = getQueue(QUEUE_NAMES.NOTIFICATIONS);
export const codeExecutionQueue = getQueue(QUEUE_NAMES.CODE_EXECUTION);
export const leaderboardQueue = getQueue(QUEUE_NAMES.LEADERBOARD);
export const certificateQueue = getQueue(QUEUE_NAMES.CERTIFICATES);
export const cleanupQueue = getQueue(QUEUE_NAMES.CLEANUP);
export const xpUpdateQueue = getQueue(QUEUE_NAMES.XP_UPDATE);

// ─── Job producers ────────────────────────────────────────────────────────────

export async function enqueueEmail(data: EmailJobData, opts?: { delay?: number }): Promise<void> {
  await emailQueue.add('send-email', data, {
    delay: opts?.delay,
    priority: 1,
  });
}

export async function enqueueNotification(data: NotificationJobData): Promise<void> {
  await notificationQueue.add('send-notification', data);
}

export async function enqueueCodeExecution(data: CodeExecutionJobData): Promise<string> {
  const job = await codeExecutionQueue.add('execute-code', data, {
    attempts: 1,
    removeOnFail: false,
  });
  return job.id!;
}

export async function enqueueXpUpdate(data: XpUpdateJobData): Promise<void> {
  await xpUpdateQueue.add('update-xp', data);
}

export async function enqueueCertificate(data: CertificateJobData): Promise<void> {
  await certificateQueue.add('generate-certificate', data);
}

// ─── Close all queues ─────────────────────────────────────────────────────────

export async function closeAllQueues(): Promise<void> {
  const closePromises = Array.from(queues.values()).map((q) => q.close());
  await Promise.all(closePromises);
  logger.info('All BullMQ queues closed');
}
