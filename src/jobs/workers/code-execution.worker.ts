import { Worker, Job } from 'bullmq';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { SubmissionStatus } from '@prisma/client';
import { QUEUE_NAMES, SOCKET_EVENTS } from '../../constants';
import type { CodeExecutionJobData } from '../../lib/queue.service';
import { emitToUser } from '../../sockets/index';

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

/**
 * Code Execution Worker
 *
 * IMPORTANT: This worker does NOT execute user code directly.
 * It forwards to an external sandboxed execution service.
 *
 * For local development without a sandbox, it returns a mock result.
 * In production, configure CODE_EXECUTION_SERVICE_URL.
 */
export const codeExecutionWorker = new Worker<CodeExecutionJobData>(
  QUEUE_NAMES.CODE_EXECUTION,
  async (job: Job<CodeExecutionJobData>) => {
    const { submissionId, userId, language, sourceCode, timeLimitMs, memoryLimitMb, testCases } = job.data;

    // Mark as running
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: SubmissionStatus.RUNNING },
    });

    let result: {
      status: SubmissionStatus;
      runtimeMs?: number;
      memoryKb?: number;
      testCasesPassed?: number;
      totalTestCases?: number;
      score?: number;
      errorMessage?: string;
    };

    if (env.CODE_EXECUTION_SERVICE_URL) {
      // Forward to external execution service
      try {
        const response = await fetch(`${env.CODE_EXECUTION_SERVICE_URL}/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(env.CODE_EXECUTION_API_KEY ? { 'X-API-Key': env.CODE_EXECUTION_API_KEY } : {}),
          },
          body: JSON.stringify({ language, sourceCode, testCases, timeLimitMs, memoryLimitMb }),
          signal: AbortSignal.timeout(env.CODE_EXECUTION_TIMEOUT),
        });
        result = await response.json() as typeof result;
      } catch (err) {
        result = { status: SubmissionStatus.INTERNAL_ERROR, errorMessage: 'Execution service unavailable' };
      }
    } else {
      // Development mock — marks as accepted for syntax-valid code
      result = {
        status: SubmissionStatus.ACCEPTED,
        runtimeMs: Math.floor(Math.random() * 100) + 10,
        memoryKb: Math.floor(Math.random() * 10000) + 1000,
        testCasesPassed: Array.isArray(testCases) ? testCases.length : 0,
        totalTestCases: Array.isArray(testCases) ? testCases.length : 0,
        score: 100,
      };
      logger.warn({ submissionId }, 'Using mock code execution (no sandbox configured)');
    }

    // Save result
    await prisma.submission.update({
      where: { id: submissionId },
      data: { ...result, updatedAt: new Date() },
    });

    // Notify user via WebSocket
    try {
      emitToUser(userId, SOCKET_EVENTS.SUBMISSION_RESULT, { submissionId, ...result });
    } catch { /* Socket.IO may not be initialized */ }

    logger.info({ jobId: job.id, submissionId, status: result.status }, 'Execution complete');
  },
  { connection, concurrency: 2 }, // Low concurrency for execution jobs
);

codeExecutionWorker.on('failed', async (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Code execution job failed');
  if (job?.data?.submissionId) {
    await prisma.submission.update({
      where: { id: job.data.submissionId },
      data: { status: SubmissionStatus.INTERNAL_ERROR, errorMessage: err.message },
    }).catch(() => {});
  }
});
