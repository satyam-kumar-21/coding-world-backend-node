import { coursesRepository } from './courses.repository';
import { storageService, generateStorageKey } from '../../lib/storage.service';
import { enqueueEmail, enqueueCertificate, enqueueXpUpdate } from '../../lib/queue.service';
import { emailTemplates } from '../../lib/email.service';
import { redisService } from '../../lib/redis.service';
import { prisma } from '../../config/database';
import { slugifyUnique } from '../../utils/slugify';
import { buildPaginatedResult } from '../../utils/pagination';
import { AppError, NotFoundError, ForbiddenError, ConflictError } from '../../middlewares/errorHandler';
import { HTTP_STATUS, XP_CONFIG, CACHE_TTL } from '../../constants';
import { env } from '../../config/env';
import { Role } from '@prisma/client';
import type {
  CreateCourseInput, UpdateCourseInput, CreateSectionInput,
  CreateLectureInput, CourseReviewInput, CourseQueryInput, LectureProgressInput,
} from './courses.validators';

export class CoursesService {
  async createCourse(instructorId: string, data: CreateCourseInput) {
    const slug = slugifyUnique(data.title);
    return coursesRepository.create(instructorId, data, slug);
  }

  async getCourse(idOrSlug: string) {
    const cacheKey = `course:${idOrSlug}`;
    const cached = await redisService.getJson(cacheKey);
    if (cached) return cached;
    const course = await coursesRepository.findBySlug(idOrSlug) ?? await coursesRepository.findById(idOrSlug);
    if (!course) throw new NotFoundError('Course not found');
    await redisService.setJson(cacheKey, course, CACHE_TTL.COURSE_LIST);
    return course;
  }

  async updateCourse(courseId: string, userId: string, role: Role, data: UpdateCourseInput) {
    const course = await coursesRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== userId && role !== Role.ADMIN && role !== Role.SUPER_ADMIN)
      throw new ForbiddenError('Not authorized to update this course');
    await redisService.del(`course:${courseId}`);
    await redisService.del(`course:${course.slug}`);
    return coursesRepository.update(courseId, data);
  }

  async deleteCourse(courseId: string, userId: string, role: Role) {
    const course = await coursesRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== userId && role !== Role.ADMIN && role !== Role.SUPER_ADMIN)
      throw new ForbiddenError('Not authorized');
    await coursesRepository.softDelete(courseId);
    await redisService.del(`course:${courseId}`);
  }

  async publishCourse(courseId: string, userId: string, role: Role) {
    const course = await coursesRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== userId && role !== Role.ADMIN && role !== Role.SUPER_ADMIN)
      throw new ForbiddenError('Not authorized');
    if (course.sections.length === 0) throw new AppError('Add at least one section before publishing', HTTP_STATUS.BAD_REQUEST);
    await coursesRepository.publish(courseId);
    await redisService.del(`course:${courseId}`);
  }

  async unpublishCourse(courseId: string, userId: string, role: Role) {
    const course = await coursesRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== userId && role !== Role.ADMIN && role !== Role.SUPER_ADMIN)
      throw new ForbiddenError('Not authorized');
    await coursesRepository.unpublish(courseId);
    await redisService.del(`course:${courseId}`);
  }

  async listCourses(query: CourseQueryInput) {
    const { items, total } = await coursesRepository.list(query);
    return buildPaginatedResult(items, total, query.page, query.limit);
  }

  async getInstructorCourses(instructorId: string, page: number, limit: number) {
    const { items, total } = await coursesRepository.instructorCourses(instructorId, page, limit);
    return buildPaginatedResult(items, total, page, limit);
  }

  // ─── Sections ─────────────────────────────────────────────────
  async createSection(courseId: string, userId: string, role: Role, data: CreateSectionInput) {
    await this.assertInstructor(courseId, userId, role);
    const section = await coursesRepository.createSection(courseId, data);
    await this.invalidateCourse(courseId);
    return section;
  }

  async updateSection(sectionId: string, courseId: string, userId: string, role: Role, data: Partial<CreateSectionInput>) {
    await this.assertInstructor(courseId, userId, role);
    const section = await coursesRepository.updateSection(sectionId, data);
    await this.invalidateCourse(courseId);
    return section;
  }

  async deleteSection(sectionId: string, courseId: string, userId: string, role: Role) {
    await this.assertInstructor(courseId, userId, role);
    await coursesRepository.deleteSection(sectionId);
    await this.invalidateCourse(courseId);
  }

  async reorderSections(courseId: string, userId: string, role: Role, sections: { id: string; sortOrder: number }[]) {
    await this.assertInstructor(courseId, userId, role);
    await coursesRepository.reorderSections(sections);
    await this.invalidateCourse(courseId);
  }

  // ─── Lectures ─────────────────────────────────────────────────
  async createLecture(sectionId: string, courseId: string, userId: string, role: Role, data: CreateLectureInput) {
    await this.assertInstructor(courseId, userId, role);
    const lecture = await coursesRepository.createLecture(sectionId, data);
    await prisma.course.update({ where: { id: courseId }, data: { totalLectures: { increment: 1 } } });
    await this.invalidateCourse(courseId);
    return lecture;
  }

  async updateLecture(lectureId: string, courseId: string, userId: string, role: Role, data: Partial<CreateLectureInput>) {
    await this.assertInstructor(courseId, userId, role);
    const lecture = await coursesRepository.updateLecture(lectureId, data);
    await this.invalidateCourse(courseId);
    return lecture;
  }

  async deleteLecture(lectureId: string, courseId: string, userId: string, role: Role) {
    await this.assertInstructor(courseId, userId, role);
    await coursesRepository.deleteLecture(lectureId);
    await prisma.course.update({ where: { id: courseId }, data: { totalLectures: { decrement: 1 } } });
    await this.invalidateCourse(courseId);
  }

  async reorderLectures(sectionId: string, courseId: string, userId: string, role: Role, lectures: { id: string; sortOrder: number }[]) {
    await this.assertInstructor(courseId, userId, role);
    await coursesRepository.reorderLectures(lectures);
    await this.invalidateCourse(courseId);
  }

  async uploadThumbnail(courseId: string, userId: string, role: Role, file: Express.Multer.File) {
    await this.assertInstructor(courseId, userId, role);
    const key = generateStorageKey('thumbnails', userId, file.originalname);
    const result = await storageService.upload(key, file.buffer, file.mimetype, true);
    await prisma.fileResource.create({
      data: {
        uploadedById: userId,
        fileName: key.split('/').pop() ?? key,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        storageKey: key,
        url: result.url,
        resourceType: 'IMAGE',
        bucket: result.bucket,
        isPublic: true,
      },
    });
    await coursesRepository.update(courseId, { thumbnailUrl: result.url } as UpdateCourseInput);
    await this.invalidateCourse(courseId);
    return { thumbnailUrl: result.url };
  }

  // ─── Enrollment ───────────────────────────────────────────────
  async enrollFree(userId: string, courseId: string) {
    const course = await coursesRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (!course.isFree) throw new AppError('This course requires payment', HTTP_STATUS.BAD_REQUEST);
    const existing = await coursesRepository.findEnrollment(userId, courseId);
    if (existing) throw new ConflictError('Already enrolled');
    const enrollment = await coursesRepository.createEnrollment(userId, courseId);
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (user) {
      const courseUrl = `${env.CLIENT_URL}/courses/${course.slug}`;
      await enqueueEmail({
        to: user.email,
        subject: `You're enrolled in ${course.title}`,
        html: emailTemplates.courseEnrollmentEmail(user.profile?.firstName ?? user.username, course.title, courseUrl),
      });
    }
    return enrollment;
  }

  async trackLectureProgress(userId: string, courseId: string, lectureId: string, data: LectureProgressInput) {
    const enrollment = await coursesRepository.findEnrollment(userId, courseId);
    if (!enrollment) throw new ForbiddenError('Not enrolled in this course');
    const progress = await coursesRepository.updateLectureProgress(userId, courseId, lectureId, data.watchedSeconds ?? 0, data.isCompleted ?? false);
    if (data.isCompleted) {
      const updated = await coursesRepository.getCourseProgress(userId, courseId);
      if (updated && updated.percentComplete >= 100) {
        await enqueueXpUpdate({ userId, amount: XP_CONFIG.COURSE_COMPLETE, type: 'COURSE_COMPLETE', entityId: courseId, entityType: 'COURSE' });
        const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
        if (user) await enqueueCertificate({ userId, courseId, courseTitle: '', userName: `${user.profile?.firstName} ${user.profile?.lastName}`, completedAt: new Date().toISOString() });
      } else {
        await enqueueXpUpdate({ userId, amount: XP_CONFIG.LECTURE_COMPLETE, type: 'LECTURE_COMPLETE', entityId: lectureId, entityType: 'LECTURE' });
      }
    }
    return progress;
  }

  async getCourseProgress(userId: string, courseId: string) {
    const enrollment = await coursesRepository.findEnrollment(userId, courseId);
    if (!enrollment) throw new ForbiddenError('Not enrolled');
    return coursesRepository.getCourseProgress(userId, courseId);
  }

  async getEnrolledCourses(userId: string, page: number, limit: number) {
    const { items, total } = await coursesRepository.getEnrolledCourses(userId, page, limit);
    return buildPaginatedResult(items, total, page, limit);
  }

  // ─── Reviews ──────────────────────────────────────────────────
  async createReview(userId: string, courseId: string, data: CourseReviewInput) {
    const enrollment = await coursesRepository.findEnrollment(userId, courseId);
    if (!enrollment) throw new ForbiddenError('Must be enrolled to review');
    const existing = await prisma.courseReview.findUnique({ where: { userId_courseId: { userId, courseId } } });
    if (existing) throw new ConflictError('Already reviewed');
    return coursesRepository.createReview(userId, courseId, data);
  }

  async listReviews(courseId: string, page: number, limit: number) {
    const { items, total } = await coursesRepository.listReviews(courseId, page, limit);
    return buildPaginatedResult(items, total, page, limit);
  }

  async listCategories() { return coursesRepository.listCategories(); }
  async listTags() { return coursesRepository.listTags(); }

  private async assertInstructor(courseId: string, userId: string, role: Role) {
    if (role === Role.ADMIN || role === Role.SUPER_ADMIN) return;
    const course = await coursesRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== userId) throw new ForbiddenError('Not your course');
  }

  private async invalidateCourse(courseId: string) {
    const course = await coursesRepository.findById(courseId);
    await redisService.del(`course:${courseId}`);
    if (course) await redisService.del(`course:${course.slug}`);
  }
}

export const coursesService = new CoursesService();
