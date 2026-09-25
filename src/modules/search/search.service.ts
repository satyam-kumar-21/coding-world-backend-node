import { prisma } from '../../config/database';
import { buildPaginatedResult } from '../../utils/pagination';

export class SearchService {
  async search(query: string, type: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const q = query.trim();

    switch (type) {
      case 'users': return this.searchUsers(q, skip, limit);
      case 'courses': return this.searchCourses(q, skip, limit);
      case 'problems': return this.searchProblems(q, skip, limit);
      case 'posts': return this.searchPosts(q, skip, limit);
      case 'bootcamps': return this.searchBootcamps(q, skip, limit);
      default: return this.searchAll(q, skip, limit, page);
    }
  }

  private async searchUsers(q: string, skip: number, limit: number) {
    const where = {
      deletedAt: null, isActive: true,
      OR: [
        { username: { contains: q, mode: 'insensitive' as const } },
        { profile: { firstName: { contains: q, mode: 'insensitive' as const } } },
        { profile: { lastName: { contains: q, mode: 'insensitive' as const } } },
        { profile: { skills: { has: q } } },
      ],
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: limit,
        select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatar: true, currentRole: true, skills: true, developerLevel: true } } },
      }),
      prisma.user.count({ where }),
    ]);
    return { type: 'users', items, total };
  }

  private async searchCourses(q: string, skip: number, limit: number) {
    const where = {
      deletedAt: null, status: 'PUBLISHED' as const,
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
    };
    const [items, total] = await Promise.all([
      prisma.course.findMany({
        where, skip, take: limit,
        select: { id: true, title: true, slug: true, shortDescription: true, thumbnailUrl: true, price: true, level: true, averageRating: true, totalEnrollments: true },
      }),
      prisma.course.count({ where }),
    ]);
    return { type: 'courses', items, total };
  }

  private async searchProblems(q: string, skip: number, limit: number) {
    const where = {
      deletedAt: null, isPublished: true,
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
    };
    const [items, total] = await Promise.all([
      prisma.problem.findMany({
        where, skip, take: limit,
        select: { id: true, title: true, slug: true, difficulty: true, category: true, type: true, totalSubmissions: true },
      }),
      prisma.problem.count({ where }),
    ]);
    return { type: 'problems', items, total };
  }

  private async searchPosts(q: string, skip: number, limit: number) {
    const where = {
      deletedAt: null, visibility: 'PUBLIC' as const,
      content: { contains: q, mode: 'insensitive' as const },
    };
    const [items, total] = await Promise.all([
      prisma.post.findMany({
        where, skip, take: limit,
        select: { id: true, type: true, content: true, createdAt: true, author: { select: { id: true, username: true } } },
      }),
      prisma.post.count({ where }),
    ]);
    return { type: 'posts', items, total };
  }

  private async searchBootcamps(q: string, skip: number, limit: number) {
    const where = {
      deletedAt: null, isPublished: true,
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
    };
    const [items, total] = await Promise.all([
      prisma.bootcamp.findMany({ where, skip, take: limit, select: { id: true, title: true, slug: true, shortDescription: true, price: true, status: true } }),
      prisma.bootcamp.count({ where }),
    ]);
    return { type: 'bootcamps', items, total };
  }

  private async searchAll(q: string, skip: number, limit: number, page: number) {
    const [users, courses, problems, posts] = await Promise.all([
      this.searchUsers(q, 0, 5),
      this.searchCourses(q, 0, 5),
      this.searchProblems(q, 0, 5),
      this.searchPosts(q, 0, 5),
    ]);
    return { users: users.items, courses: courses.items, problems: problems.items, posts: posts.items };
  }
}

export const searchService = new SearchService();
