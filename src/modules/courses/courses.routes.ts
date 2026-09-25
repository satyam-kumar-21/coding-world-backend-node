import { Router } from 'express';
import { coursesController } from './courses.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authenticate';
import { validateBody, validateQuery } from '../../middlewares/validate';
import { thumbnailUpload, uploadRateLimiter } from '../../middlewares';
import { Role } from '@prisma/client';
import {
  createCourseSchema, updateCourseSchema, createSectionSchema, createLectureSchema,
  courseReviewSchema, courseQuerySchema, reorderSectionsSchema, reorderLecturesSchema, lectureProgressSchema,
} from './courses.validators';

const router = Router();
const isInstructor = authorize(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN);

// Public
router.get('/', validateQuery(courseQuerySchema), (req, res, next) => coursesController.list(req, res, next));
router.get('/categories', (req, res, next) => coursesController.listCategories(req, res, next));
router.get('/tags', (req, res, next) => coursesController.listTags(req, res, next));
router.get('/:idOrSlug', (req, res, next) => coursesController.getOne(req, res, next));
router.get('/:courseId/reviews', (req, res, next) => coursesController.listReviews(req, res, next));

// Instructor / Admin
router.post('/', authenticate, isInstructor, validateBody(createCourseSchema), (req, res, next) => coursesController.create(req, res, next));
router.put('/:id', authenticate, isInstructor, validateBody(updateCourseSchema), (req, res, next) => coursesController.update(req, res, next));
router.delete('/:id', authenticate, isInstructor, (req, res, next) => coursesController.remove(req, res, next));
router.post('/:id/publish', authenticate, isInstructor, (req, res, next) => coursesController.publish(req, res, next));
router.post('/:id/unpublish', authenticate, isInstructor, (req, res, next) => coursesController.unpublish(req, res, next));
router.post('/:id/thumbnail', authenticate, isInstructor, uploadRateLimiter, thumbnailUpload.single('thumbnail'), (req, res, next) => coursesController.uploadThumbnail(req, res, next));
router.get('/instructor/my', authenticate, isInstructor, (req, res, next) => coursesController.myInstructorCourses(req, res, next));

// Sections
router.post('/:courseId/sections', authenticate, isInstructor, validateBody(createSectionSchema), (req, res, next) => coursesController.createSection(req, res, next));
router.put('/:courseId/sections/:sectionId', authenticate, isInstructor, validateBody(createSectionSchema.partial()), (req, res, next) => coursesController.updateSection(req, res, next));
router.delete('/:courseId/sections/:sectionId', authenticate, isInstructor, (req, res, next) => coursesController.deleteSection(req, res, next));
router.post('/:courseId/sections/reorder', authenticate, isInstructor, validateBody(reorderSectionsSchema), (req, res, next) => coursesController.reorderSections(req, res, next));

// Lectures
router.post('/:courseId/sections/:sectionId/lectures', authenticate, isInstructor, validateBody(createLectureSchema), (req, res, next) => coursesController.createLecture(req, res, next));
router.put('/:courseId/sections/:sectionId/lectures/:lectureId', authenticate, isInstructor, validateBody(createLectureSchema.partial()), (req, res, next) => coursesController.updateLecture(req, res, next));
router.delete('/:courseId/sections/:sectionId/lectures/:lectureId', authenticate, isInstructor, (req, res, next) => coursesController.deleteLecture(req, res, next));
router.post('/:courseId/sections/:sectionId/lectures/reorder', authenticate, isInstructor, validateBody(reorderLecturesSchema), (req, res, next) => coursesController.reorderLectures(req, res, next));

// Student
router.post('/:courseId/enroll', authenticate, (req, res, next) => coursesController.enrollFree(req, res, next));
router.get('/enrolled/my', authenticate, (req, res, next) => coursesController.getEnrolledCourses(req, res, next));
router.post('/:courseId/progress/:lectureId', authenticate, validateBody(lectureProgressSchema), (req, res, next) => coursesController.trackProgress(req, res, next));
router.get('/:courseId/progress', authenticate, (req, res, next) => coursesController.getProgress(req, res, next));
router.post('/:courseId/reviews', authenticate, validateBody(courseReviewSchema), (req, res, next) => coursesController.createReview(req, res, next));

export default router;
