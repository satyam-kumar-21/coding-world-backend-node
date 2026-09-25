import { prisma } from '../../config/database';
import { CourseStatus } from '@prisma/client';
import type { CreateCourseInput, UpdateCourseInput, CreateSectionInput, CreateLectureInput, CourseQueryInput } from './courses.validators';

export class CoursesRepository {
  // ─── Courses ──────────────────────────────────────────────────
  async create(instructorId: string, data: CreateCourseInput, slug: string) {
    const { requirements = [], learningOutcomes = [], tagIds = [], ...rest } = data;
    return prisma.course.create({
      data: {
        ...rest,
        slug,
        instructorId,
        isFree: data.price === 0 || data.isFree,
        requirements: {
          create: requirements.map((d, i) => ({ description: d, sortOrder: i })),
        },
        learningOutcomes: {
          create: learningOutcomes.map((d, i) => ({ description: d, sortOrder: i })),
        },
        tags: tagIds.length ? { create: tagIds.map(tagId => ({ tagId })) } : undefined,
      },
      include: courseInclude,
    });
  }

  async findById(id: string) {
    return prisma.course.findFirst({
      where: { id, deletedAt: null },
      include: courseInclude,
    });
  }

  async findBySlug(slug: string) {
    return prisma.course.findFirst({
      where: { slug, deletedAt: null },
      include: courseInclude,
    });
  }

  async update(id: string, data: UpdateCourseInput) {
    const { requirements, learningOutcomes, tagIds, ...rest } = data;
    return prisma.course.update({
      where: { id },
      data: {
        ...rest,
        ...(requirements !== undefined ? {
          requirements: {
            deleteMany: {},
            create: requirements.map((d, i) => ({ description: d, sortOrder: i })),
          },
        } : {}),
        ...(learningOutcomes !== undefined ? {
          learningOutcomes: {
            deleteMany: {},
            create: learningOutcomes.map((d, i) => ({ description: d, sortOrder: i })),
          },
        } : {}),
        ...(tagIds !== undefined ? {
          tags: { deleteMany: {}, create: tagIds.map(tagId => ({ tagId })) },
        } : {}),
      },
      include: courseInclude,
    });
  }

  async softDelete(id: string) {
    return prisma.course.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async publish(id: string) {
    return prisma.course.update({
      where: { id },
      data: { status: CourseStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  async unpublish(id: string) {
    return prisma.course.update({
      where: { id },
      data: { status: CourseStatus.DRAFT },
    });
  }

  async list(q: CourseQueryInput) {
    const { page, limit, search, categoryId, level, isFree, isFeatured, sortBy, sortOrder } = q;
    const skip = (page - 1) * limit;
    const where = {
      deletedAt: null,
      status: CourseStatus.PUBLISHED,
      ...(search ? { OR: [
        { title: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ]} : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(level ? { level } : {}),
      ...(isFree !== undefined ? { isFree } : {}),
      ...(isFeatured !== undefined ? { isFeatured } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.course.findMany({
        where, skip, take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: courseListInclude,
      }),
      prisma.course.count({ where }),
    ]);
    return { items, total };
  }

  async instructorCourses(instructorId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.course.findMany({
        where: { instructorId, deletedAt: null },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: courseListInclude,
      }),
      prisma.course.count({ where: { instructorId, deletedAt: null } }),
    ]);
    return { items, total };
  }

  // ─── Sections ─────────────────────────────────────────────────
  async createSection(courseId: string, data: CreateSectionInput) {
    const count = await prisma.courseSection.count({ where: { courseId } });
    return prisma.courseSection.create({
      data: { courseId, ...data, sortOrder: data.sortOrder ?? count },
    });
  }

  async updateSection(id: string, data: Partial<CreateSectionInput>) {
    return prisma.courseSection.update({ where: { id }, data });
  }

  async deleteSection(id: string) {
    return prisma.courseSection.delete({ where: { id } });
  }

  async reorderSections(sections: { id: string; sortOrder: number }[]) {
    return prisma.$transaction(
      sections.map(s => prisma.courseSection.update({ where: { id: s.id }, data: { sortOrder: s.sortOrder } })),
    );
  }

  // ─── Lectures ─────────────────────────────────────────────────
  async createLecture(sectionId: string, data: CreateLectureInput) {
    const count = await prisma.lecture.count({ where: { sectionId } });
    return prisma.lecture.create({
      data: { sectionId, ...data, sortOrder: data.sortOrder ?? count },
    });
  }

  async updateLecture(id: string, data: Partial<CreateLectureInput>) {
    return prisma.lecture.update({ where: { id }, data });
  }

  async deleteLecture(id: string) {
    return prisma.lecture.delete({ where: { id } });
  }

  async reorderLectures(lectures: { id: string; sortOrder: number }[]) {
    return prisma.$transaction(
      lectures.map(l => prisma.lecture.update({ where: { id: l.id }, data: { sortOrder: l.sortOrder } })),
    );
  }

  // ─── Enrollment ───────────────────────────────────────────────
  async findEnrollment(userId: string, courseId: string) {
    return prisma.courseEnrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  }

  async createEnrollment(userId: string, courseId: string, orderId?: string) {
    const enrollment = await prisma.courseEnrollment.create({
      data: { userId, courseId, orderId },
    });
    await prisma.course.update({
      where: { id: courseId },
      data: { totalEnrollments: { increment: 1 } },
    });
    // Create progress record
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { totalLectures: true } });
    await prisma.courseProgress.create({
      data: { userId, courseId, totalLectures: course?.totalLectures ?? 0 },
    });
    return enrollment;
  }

  async getEnrolledCourses(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.courseEnrollment.findMany({
        where: { userId, isActive: true },
        skip, take: limit,
        orderBy: { enrolledAt: 'desc' },
        include: {
          course: { include: courseListInclude },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      }),
      prisma.courseEnrollment.count({ where: { userId, isActive: true } }),
    ]);
    return { items, total };
  }

  // ─── Progress ─────────────────────────────────────────────────
  async updateLectureProgress(userId: string, courseId: string, lectureId: string, watched: number, completed: boolean) {
    const progress = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!progress) return null;

    await prisma.lectureProgress.upsert({
      where: { courseProgressId_lectureId: { courseProgressId: progress.id, lectureId } },
      update: { watchedSeconds: watched, isCompleted: completed, ...(completed ? { completedAt: new Date() } : {}) },
      create: { courseProgressId: progress.id, lectureId, watchedSeconds: watched, isCompleted: completed, ...(completed ? { completedAt: new Date() } : {}) },
    });

    if (completed) {
      const completedCount = await prisma.lectureProgress.count({
        where: { courseProgressId: progress.id, isCompleted: true },
      });
      const pct = progress.totalLectures > 0 ? (completedCount / progress.totalLectures) * 100 : 0;
      await prisma.courseProgress.update({
        where: { id: progress.id },
        data: {
          completedLectures: completedCount,
          percentComplete: pct,
          lastAccessedAt: new Date(),
          ...(pct >= 100 ? { completedAt: new Date() } : {}),
        },
      });
      if (pct >= 100) {
        await prisma.courseEnrollment.updateMany({
          where: { userId, courseId },
          data: { completedAt: new Date() },
        });
      }
    }
    return progress;
  }

  async getCourseProgress(userId: string, courseId: string) {
    return prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: { lectureProgress: true },
    });
  }

  // ─── Reviews ──────────────────────────────────────────────────
  async createReview(userId: string, courseId: string, data: { rating: number; title?: string; body?: string }) {
    const review = await prisma.courseReview.create({
      data: { userId, courseId, ...data },
    });
    await this.recalcRating(courseId);
    return review;
  }

  async updateReview(id: string, data: Partial<{ rating: number; title: string; body: string }>) {
    const review = await prisma.courseReview.update({ where: { id }, data });
    await this.recalcRating(review.courseId);
    return review;
  }

  async deleteReview(id: string) {
    const review = await prisma.courseReview.findUnique({ where: { id } });
    await prisma.courseReview.delete({ where: { id } });
    if (review) await this.recalcRating(review.courseId);
  }

  async listReviews(courseId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.courseReview.findMany({
        where: { courseId, isVisible: true },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatar: true } } } } },
      }),
      prisma.courseReview.count({ where: { courseId, isVisible: true } }),
    ]);
    return { items, total };
  }

  private async recalcRating(courseId: string) {
    const agg = await prisma.courseReview.aggregate({
      where: { courseId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.course.update({
      where: { id: courseId },
      data: { averageRating: agg._avg.rating ?? 0, totalRatings: agg._count.rating },
    });
  }

  // ─── Categories & tags ────────────────────────────────────────
  async listCategories() {
    return prisma.courseCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async listTags() {
    return prisma.courseTag.findMany({ orderBy: { name: 'asc' } });
  }
}

const courseListInclude = {
  instructor: { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatar: true } } } },
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
  _count: { select: { sections: true, enrollments: true, reviews: true } },
};

const courseInclude = {
  ...courseListInclude,
  sections: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      lectures: {
        orderBy: { sortOrder: 'asc' as const },
        select: { id: true, title: true, type: true, videoDuration: true, isPreview: true, isPublished: true, sortOrder: true },
      },
    },
  },
  requirements: { orderBy: { sortOrder: 'asc' as const } },
  learningOutcomes: { orderBy: { sortOrder: 'asc' as const } },
};

export const coursesRepository = new CoursesRepository();
