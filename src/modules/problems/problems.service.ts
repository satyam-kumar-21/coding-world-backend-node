import { prisma } from '../../config/database';
import { slugifyUnique } from '../../utils/slugify';
import { buildPaginatedResult } from '../../utils/pagination';
import { NotFoundError, ForbiddenError } from '../../middlewares/errorHandler';
import { Role } from '@prisma/client';
import type { CreateProblemInput, ProblemQueryInput } from './problems.validators';

const problemSelect = {
  id: true, title: true, slug: true, difficulty: true, type: true, category: true,
  constraints: true, examples: true, starterCode: true, supportedLanguages: true,
  timeLimitMs: true, memoryLimitMb: true, explanation: true, xpReward: true,
  totalSubmissions: true, acceptedSubmissions: true, isPublished: true, createdAt: true,
  createdBy: { select: { id: true, username: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
};

// Hidden test cases & editorial only shown to admin/instructor
const problemFullSelect = { ...problemSelect, hiddenTestCases: true, testCases: true, editorial: true };

export class ProblemsService {
  async create(userId: string, data: CreateProblemInput) {
    const slug = slugifyUnique(data.title);
    const { tagIds = [], ...rest } = data;
    return prisma.problem.create({
      data: {
        ...rest,
        slug,
        createdById: userId,
        tags: tagIds.length ? { create: tagIds.map(tagId => ({ tagId })) } : undefined,
      },
      select: problemFullSelect,
    });
  }

  async list(query: ProblemQueryInput, isAdmin = false) {
    const { page, limit, search, difficulty, category, type, tagId, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;
    const where = {
      deletedAt: null,
      ...(isAdmin ? {} : { isPublished: true }),
      ...(search ? { OR: [
        { title: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ]} : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(category ? { category } : {}),
      ...(type ? { type } : {}),
      ...(tagId ? { tags: { some: { tagId } } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.problem.findMany({ where, skip, take: limit, orderBy: { [sortBy]: sortOrder }, select: problemSelect }),
      prisma.problem.count({ where }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async getOne(idOrSlug: string, role?: Role) {
    const problem = await prisma.problem.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], deletedAt: null },
      select: role === Role.ADMIN || role === Role.SUPER_ADMIN || role === Role.INSTRUCTOR
        ? problemFullSelect : problemSelect,
    });
    if (!problem) throw new NotFoundError('Problem not found');
    return problem;
  }

  async update(id: string, userId: string, role: Role, data: Partial<CreateProblemInput>) {
    const problem = await prisma.problem.findUnique({ where: { id } });
    if (!problem) throw new NotFoundError('Problem not found');
    if (problem.createdById !== userId && role !== Role.ADMIN && role !== Role.SUPER_ADMIN)
      throw new ForbiddenError('Not authorized');
    const { tagIds, ...rest } = data;
    return prisma.problem.update({
      where: { id },
      data: {
        ...rest,
        ...(tagIds !== undefined ? { tags: { deleteMany: {}, create: tagIds.map(tagId => ({ tagId })) } } : {}),
      },
      select: problemFullSelect,
    });
  }

  async publish(id: string, userId: string, role: Role) {
    const problem = await prisma.problem.findUnique({ where: { id } });
    if (!problem) throw new NotFoundError('Problem not found');
    if (problem.createdById !== userId && role !== Role.ADMIN && role !== Role.SUPER_ADMIN)
      throw new ForbiddenError('Not authorized');
    return prisma.problem.update({ where: { id }, data: { isPublished: true } });
  }

  async delete(id: string, userId: string, role: Role) {
    const problem = await prisma.problem.findUnique({ where: { id } });
    if (!problem) throw new NotFoundError('Problem not found');
    if (problem.createdById !== userId && role !== Role.ADMIN && role !== Role.SUPER_ADMIN)
      throw new ForbiddenError('Not authorized');
    await prisma.problem.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async listTags() {
    return prisma.problemTag.findMany({ orderBy: { name: 'asc' } });
  }

  async getUserSolvedProblems(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = { userId, status: 'ACCEPTED' as const };
    const [items, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        skip, take: limit,
        distinct: ['problemId'],
        orderBy: { createdAt: 'desc' },
        include: { problem: { select: { id: true, title: true, slug: true, difficulty: true, category: true } } },
      }),
      prisma.submission.groupBy({ by: ['problemId'], where }).then(r => r.length),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }
}

export const problemsService = new ProblemsService();
