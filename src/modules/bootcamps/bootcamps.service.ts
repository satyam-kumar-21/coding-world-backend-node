import { prisma } from '../../config/database';
import { slugifyUnique } from '../../utils/slugify';
import { buildPaginatedResult } from '../../utils/pagination';
import { NotFoundError, ForbiddenError, ConflictError, AppError } from '../../middlewares/errorHandler';
import { HTTP_STATUS } from '../../constants';
import { Role } from '@prisma/client';
import type { CreateBootcampInput, CreateSessionInput } from './bootcamps.validators';

export class BootcampsService {
  async create(instructorId: string, data: CreateBootcampInput) {
    const slug = slugifyUnique(data.title);
    return prisma.bootcamp.create({
      data: {
        ...data,
        slug,
        instructorId,
        isFree: data.price === 0 || data.isFree,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async list(page: number, limit: number, status?: string) {
    const skip = (page - 1) * limit;
    const where = { deletedAt: null, isPublished: true, ...(status ? { status: status as never } : {}) };
    const [items, total] = await Promise.all([
      prisma.bootcamp.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: bootcampInclude }),
      prisma.bootcamp.count({ where }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async getOne(idOrSlug: string) {
    const bootcamp = await prisma.bootcamp.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], deletedAt: null },
      include: { ...bootcampInclude, sessions: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!bootcamp) throw new NotFoundError('Bootcamp not found');
    return bootcamp;
  }

  async update(id: string, userId: string, role: Role, data: Partial<CreateBootcampInput>) {
    const bootcamp = await prisma.bootcamp.findUnique({ where: { id } });
    if (!bootcamp) throw new NotFoundError('Bootcamp not found');
    if (bootcamp.instructorId !== userId && role !== Role.ADMIN && role !== Role.SUPER_ADMIN)
      throw new ForbiddenError('Not authorized');
    return prisma.bootcamp.update({ where: { id }, data: { ...data, startDate: data.startDate ? new Date(data.startDate) : undefined, endDate: data.endDate ? new Date(data.endDate) : undefined } });
  }

  async publish(id: string, userId: string, role: Role) {
    const bootcamp = await prisma.bootcamp.findUnique({ where: { id } });
    if (!bootcamp) throw new NotFoundError('Bootcamp not found');
    if (bootcamp.instructorId !== userId && role !== Role.ADMIN && role !== Role.SUPER_ADMIN)
      throw new ForbiddenError('Not authorized');
    return prisma.bootcamp.update({ where: { id }, data: { isPublished: true } });
  }

  async delete(id: string, userId: string, role: Role) {
    const bootcamp = await prisma.bootcamp.findUnique({ where: { id } });
    if (!bootcamp) throw new NotFoundError('Bootcamp not found');
    if (bootcamp.instructorId !== userId && role !== Role.ADMIN && role !== Role.SUPER_ADMIN)
      throw new ForbiddenError('Not authorized');
    await prisma.bootcamp.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async createSession(bootcampId: string, userId: string, role: Role, data: CreateSessionInput) {
    const bootcamp = await prisma.bootcamp.findUnique({ where: { id: bootcampId } });
    if (!bootcamp) throw new NotFoundError('Bootcamp not found');
    if (bootcamp.instructorId !== userId && role !== Role.ADMIN && role !== Role.SUPER_ADMIN)
      throw new ForbiddenError('Not authorized');
    return prisma.bootcampSession.create({
      data: { bootcampId, ...data, startTime: new Date(data.startTime), endTime: new Date(data.endTime) },
    });
  }

  async enrollFree(userId: string, bootcampId: string) {
    const bootcamp = await prisma.bootcamp.findUnique({ where: { id: bootcampId } });
    if (!bootcamp) throw new NotFoundError('Bootcamp not found');
    if (!bootcamp.isFree) throw new AppError('Payment required', HTTP_STATUS.BAD_REQUEST);
    if (bootcamp.capacity) {
      const count = await prisma.bootcampEnrollment.count({ where: { bootcampId, isActive: true } });
      if (count >= bootcamp.capacity) throw new AppError('Bootcamp is full', HTTP_STATUS.CONFLICT);
    }
    const existing = await prisma.bootcampEnrollment.findUnique({ where: { userId_bootcampId: { userId, bootcampId } } });
    if (existing) throw new ConflictError('Already enrolled');
    return prisma.bootcampEnrollment.create({ data: { userId, bootcampId } });
  }

  async getMyEnrollments(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.bootcampEnrollment.findMany({ where: { userId, isActive: true }, skip, take: limit, orderBy: { enrolledAt: 'desc' }, include: { bootcamp: true } }),
      prisma.bootcampEnrollment.count({ where: { userId, isActive: true } }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async markAttendance(userId: string, enrollmentId: string, sessionId: string, durationMins: number) {
    const enrollment = await prisma.bootcampEnrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment || enrollment.userId !== userId) throw new ForbiddenError('Not your enrollment');
    return prisma.bootcampAttendance.upsert({
      where: { enrollmentId_sessionId: { enrollmentId, sessionId } },
      update: { durationMins },
      create: { enrollmentId, sessionId, durationMins },
    });
  }
}

const bootcampInclude = {
  instructor: { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatar: true } } } },
  _count: { select: { enrollments: true, sessions: true } },
};

export const bootcampsService = new BootcampsService();
