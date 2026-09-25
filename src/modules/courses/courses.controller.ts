import { Request, Response, NextFunction } from 'express';
import { coursesService } from './courses.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { parsePaginationQuery } from '../../utils/pagination';
import type { AuthenticatedRequest } from '../../types';

export class CoursesController {
  // ─── Courses ──────────────────────────────────────────────────
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await coursesService.listCourses(req.query as never);
      sendSuccess(res, result.items, 'Courses fetched', 200, result.meta);
    } catch (e) { next(e); }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const course = await coursesService.getCourse(req.params.idOrSlug);
      sendSuccess(res, { course });
    } catch (e) { next(e); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const course = await coursesService.createCourse(userId, req.body);
      sendCreated(res, { course }, 'Course created');
    } catch (e) { next(e); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const course = await coursesService.updateCourse(req.params.id, userId, role, req.body);
      sendSuccess(res, { course }, 'Course updated');
    } catch (e) { next(e); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      await coursesService.deleteCourse(req.params.id, userId, role);
      sendSuccess(res, null, 'Course deleted');
    } catch (e) { next(e); }
  }

  async publish(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      await coursesService.publishCourse(req.params.id, userId, role);
      sendSuccess(res, null, 'Course published');
    } catch (e) { next(e); }
  }

  async unpublish(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      await coursesService.unpublishCourse(req.params.id, userId, role);
      sendSuccess(res, null, 'Course unpublished');
    } catch (e) { next(e); }
  }

  async uploadThumbnail(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      if (!req.file) { res.status(400).json({ success: false, message: 'No file' }); return; }
      const result = await coursesService.uploadThumbnail(req.params.id, userId, role, req.file);
      sendSuccess(res, result, 'Thumbnail uploaded');
    } catch (e) { next(e); }
  }

  async myInstructorCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await coursesService.getInstructorCourses(userId, page, limit);
      sendSuccess(res, result.items, 'Courses fetched', 200, result.meta);
    } catch (e) { next(e); }
  }

  // ─── Sections ─────────────────────────────────────────────────
  async createSection(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const section = await coursesService.createSection(req.params.courseId, userId, role, req.body);
      sendCreated(res, { section }, 'Section created');
    } catch (e) { next(e); }
  }

  async updateSection(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const section = await coursesService.updateSection(req.params.sectionId, req.params.courseId, userId, role, req.body);
      sendSuccess(res, { section }, 'Section updated');
    } catch (e) { next(e); }
  }

  async deleteSection(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      await coursesService.deleteSection(req.params.sectionId, req.params.courseId, userId, role);
      sendSuccess(res, null, 'Section deleted');
    } catch (e) { next(e); }
  }

  async reorderSections(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      await coursesService.reorderSections(req.params.courseId, userId, role, req.body.sections);
      sendSuccess(res, null, 'Sections reordered');
    } catch (e) { next(e); }
  }

  // ─── Lectures ─────────────────────────────────────────────────
  async createLecture(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const lecture = await coursesService.createLecture(req.params.sectionId, req.params.courseId, userId, role, req.body);
      sendCreated(res, { lecture }, 'Lecture created');
    } catch (e) { next(e); }
  }

  async updateLecture(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const lecture = await coursesService.updateLecture(req.params.lectureId, req.params.courseId, userId, role, req.body);
      sendSuccess(res, { lecture }, 'Lecture updated');
    } catch (e) { next(e); }
  }

  async deleteLecture(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      await coursesService.deleteLecture(req.params.lectureId, req.params.courseId, userId, role);
      sendSuccess(res, null, 'Lecture deleted');
    } catch (e) { next(e); }
  }

  async reorderLectures(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      await coursesService.reorderLectures(req.params.sectionId, req.params.courseId, userId, role, req.body.lectures);
      sendSuccess(res, null, 'Lectures reordered');
    } catch (e) { next(e); }
  }

  // ─── Enrollment & Progress ────────────────────────────────────
  async enrollFree(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const enrollment = await coursesService.enrollFree(userId, req.params.courseId);
      sendCreated(res, { enrollment }, 'Enrolled successfully');
    } catch (e) { next(e); }
  }

  async getEnrolledCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await coursesService.getEnrolledCourses(userId, page, limit);
      sendSuccess(res, result.items, 'Enrolled courses', 200, result.meta);
    } catch (e) { next(e); }
  }

  async trackProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { courseId, lectureId } = req.params;
      await coursesService.trackLectureProgress(userId, courseId, lectureId, req.body);
      sendSuccess(res, null, 'Progress updated');
    } catch (e) { next(e); }
  }

  async getProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const progress = await coursesService.getCourseProgress(userId, req.params.courseId);
      sendSuccess(res, { progress });
    } catch (e) { next(e); }
  }

  // ─── Reviews ──────────────────────────────────────────────────
  async createReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const review = await coursesService.createReview(userId, req.params.courseId, req.body);
      sendCreated(res, { review }, 'Review submitted');
    } catch (e) { next(e); }
  }

  async listReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await coursesService.listReviews(req.params.courseId, page, limit);
      sendSuccess(res, result.items, 'Reviews', 200, result.meta);
    } catch (e) { next(e); }
  }

  async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await coursesService.listCategories();
      sendSuccess(res, { categories });
    } catch (e) { next(e); }
  }

  async listTags(req: Request, res: Response, next: NextFunction) {
    try {
      const tags = await coursesService.listTags();
      sendSuccess(res, { tags });
    } catch (e) { next(e); }
  }
}

export const coursesController = new CoursesController();
