import { prisma } from '../../config/database';
import { enqueueCodeExecution, enqueueXpUpdate } from '../../lib/queue.service';
import { buildPaginatedResult } from '../../utils/pagination';
import { NotFoundError, ForbiddenError } from '../../middlewares/errorHandler';
import { SubmissionStatus, ProblemDifficulty } from '@prisma/client';
import { XP_CONFIG } from '../../constants';
import type { CreateSubmissionInput } from './submissions.validators';

const XP_BY_DIFFICULTY: Record<ProblemDifficulty, number> = {
  EASY: XP_CONFIG.EASY_PROBLEM,
  MEDIUM: XP_CONFIG.MEDIUM_PROBLEM,
  HARD: XP_CONFIG.HARD_PROBLEM,
  EXPERT: XP_CONFIG.EXPERT_PROBLEM,
};

export class SubmissionsService {
  async create(userId: string, data: CreateSubmissionInput) {
    const problem = await prisma.problem.findFirst({
      where: { id: data.problemId, isPublished: true, deletedAt: null },
      select: { id: true, timeLimitMs: true, memoryLimitMb: true, hiddenTestCases: true, testCases: true, difficulty: true },
    });
    if (!problem) throw new NotFoundError('Problem not found');

    // Create submission in PENDING state
    const submission = await prisma.submission.create({
      data: {
        userId,
        problemId: data.problemId,
        language: data.language,
        sourceCode: data.sourceCode,
        status: SubmissionStatus.PENDING,
        isPublic: data.isPublic,
      },
    });

    // Enqueue for execution — NEVER execute code inline
    const jobId = await enqueueCodeExecution({
      submissionId: submission.id,
      userId,
      problemId: data.problemId,
      language: data.language,
      sourceCode: data.sourceCode,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
      testCases: (problem.testCases as unknown[]) ?? [],
    });

    await prisma.submission.update({ where: { id: submission.id }, data: { executionJobId: jobId } });

    return submission;
  }

  /** Called by the code execution worker when results are ready */
  async handleResult(submissionId: string, result: {
    status: SubmissionStatus;
    runtimeMs?: number;
    memoryKb?: number;
    testCasesPassed?: number;
    totalTestCases?: number;
    score?: number;
    errorMessage?: string;
    compilerOutput?: string;
  }) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { problem: { select: { id: true, difficulty: true, totalSubmissions: true, acceptedSubmissions: true } } },
    });
    if (!submission) return;

    await prisma.submission.update({
      where: { id: submissionId },
      data: { ...result, updatedAt: new Date() },
    });

    // Update problem stats
    await prisma.problem.update({
      where: { id: submission.problemId },
      data: {
        totalSubmissions: { increment: 1 },
        ...(result.status === SubmissionStatus.ACCEPTED ? { acceptedSubmissions: { increment: 1 } } : {}),
      },
    });

    // Award XP on first accepted submission
    if (result.status === SubmissionStatus.ACCEPTED) {
      const previousAccepted = await prisma.submission.count({
        where: { userId: submission.userId, problemId: submission.problemId, status: SubmissionStatus.ACCEPTED, id: { not: submissionId } },
      });
      if (previousAccepted === 0) {
        const xp = XP_BY_DIFFICULTY[submission.problem.difficulty] ?? XP_CONFIG.EASY_PROBLEM;
        await enqueueXpUpdate({
          userId: submission.userId,
          amount: xp,
          type: 'PROBLEM_SOLVED',
          entityId: submission.problemId,
          entityType: 'PROBLEM',
          description: `Solved problem`,
        });
      }
    }

    return submission;
  }

  async getSubmission(id: string, userId: string) {
    const sub = await prisma.submission.findUnique({
      where: { id },
      include: { problem: { select: { id: true, title: true, slug: true, difficulty: true } } },
    });
    if (!sub) throw new NotFoundError('Submission not found');
    if (sub.userId !== userId && !sub.isPublic) throw new ForbiddenError('Access denied');
    return sub;
  }

  async listUserSubmissions(userId: string, query: { page: number; limit: number; problemId?: string; status?: string; language?: string }) {
    const { page, limit, problemId, status, language } = query;
    const skip = (page - 1) * limit;
    const where = {
      userId,
      ...(problemId ? { problemId } : {}),
      ...(status ? { status: status as SubmissionStatus } : {}),
      ...(language ? { language } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.submission.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { problem: { select: { id: true, title: true, slug: true, difficulty: true } } },
      }),
      prisma.submission.count({ where }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async listProblemSubmissions(problemId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = { problemId, isPublic: true };
    const [items, total] = await Promise.all([
      prisma.submission.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        select: { id: true, language: true, status: true, runtimeMs: true, memoryKb: true, createdAt: true, user: { select: { id: true, username: true } } },
      }),
      prisma.submission.count({ where }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }
}

export const submissionsService = new SubmissionsService();
