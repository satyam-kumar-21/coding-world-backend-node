import { prisma } from '../../config/database';
import { buildPaginatedResult } from '../../utils/pagination';
import { NotFoundError } from '../../middlewares/errorHandler';
import { Role } from '@prisma/client';

export class AdminService {
  async getDashboard() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const monthAgo = new Date(now.getTime() - 30 * 86400000);

    const [
      totalUsers, activeUsers, newUsersWeek, newUsersMonth,
      totalCourses, publishedCourses, totalEnrollments,
      totalProblems, totalSubmissions, acceptedSubmissions,
      totalPosts, totalBootcamps,
      pendingReports,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.course.count({ where: { deletedAt: null } }),
      prisma.course.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
      prisma.courseEnrollment.count(),
      prisma.problem.count({ where: { deletedAt: null } }),
      prisma.submission.count(),
      prisma.submission.count({ where: { status: 'ACCEPTED' } }),
      prisma.post.count({ where: { deletedAt: null } }),
      prisma.bootcamp.count({ where: { deletedAt: null } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
    ]);

    // Revenue
    const revenueResult = await prisma.transaction.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    });

    return {
      users: { total: totalUsers, active: activeUsers, newWeek: newUsersWeek, newMonth: newUsersMonth },
      courses: { total: totalCourses, published: publishedCourses, enrollments: totalEnrollments },
      problems: { total: totalProblems, submissions: totalSubmissions, accepted: acceptedSubmissions },
      content: { posts: totalPosts, bootcamps: totalBootcamps },
      moderation: { pendingReports },
      revenue: { total: revenueResult._sum.amount ?? 0 },
    };
  }

  async listUsers(page: number, limit: number, search?: string, role?: Role) {
    const skip = (page - 1) * limit;
    const where = {
      deletedAt: null,
      ...(search ? { OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { username: { contains: search, mode: 'insensitive' as const } },
      ]} : {}),
      ...(role ? { role } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, username: true, role: true, isActive: true, isEmailVerified: true, createdAt: true, profile: { select: { firstName: true, lastName: true, avatar: true } } },
      }),
      prisma.user.count({ where }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async updateUserRole(userId: string, role: Role) {
    return prisma.user.update({ where: { id: userId }, data: { role } });
  }

  async suspendUser(userId: string) {
    return prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  }

  async restoreUser(userId: string) {
    return prisma.user.update({ where: { id: userId }, data: { isActive: true, isDeactivated: false, deactivatedAt: null } });
  }

  async listReports(page: number, limit: number, status?: string) {
    const skip = (page - 1) * limit;
    const where = { ...(status ? { status: status as never } : {}) };
    const [items, total] = await Promise.all([
      prisma.report.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { reporter: { select: { id: true, username: true } }, reportedUser: { select: { id: true, username: true } } },
      }),
      prisma.report.count({ where }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async moderateReport(reportId: string, moderatorId: string, action: string, reason?: string) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundError('Report not found');
    await prisma.report.update({ where: { id: reportId }, data: { status: 'REVIEWED', reviewedAt: new Date() } });
    await prisma.moderationAction.create({ data: { reportId, moderatorId, action, reason } });
    return { success: true };
  }

  async listTransactions(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, username: true } }, order: { include: { items: true } } },
      }),
      prisma.transaction.count(),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }
}

export const adminService = new AdminService();
