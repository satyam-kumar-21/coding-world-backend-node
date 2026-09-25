import { Router } from 'express';
import { bootcampsController } from './bootcamps.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authenticate';
import { validateBody } from '../../middlewares/validate';
import { Role } from '@prisma/client';
import { createBootcampSchema, updateBootcampSchema, createSessionSchema } from './bootcamps.validators';

const router = Router();
const isInstructor = authorize(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN);

router.get('/', (req, res, next) => bootcampsController.list(req, res, next));
router.get('/enrolled/my', authenticate, (req, res, next) => bootcampsController.myEnrollments(req, res, next));
router.get('/:idOrSlug', (req, res, next) => bootcampsController.getOne(req, res, next));
router.post('/', authenticate, isInstructor, validateBody(createBootcampSchema), (req, res, next) => bootcampsController.create(req, res, next));
router.put('/:id', authenticate, isInstructor, validateBody(updateBootcampSchema), (req, res, next) => bootcampsController.update(req, res, next));
router.post('/:id/publish', authenticate, isInstructor, (req, res, next) => bootcampsController.publish(req, res, next));
router.delete('/:id', authenticate, isInstructor, (req, res, next) => bootcampsController.remove(req, res, next));
router.post('/:id/sessions', authenticate, isInstructor, validateBody(createSessionSchema), (req, res, next) => bootcampsController.createSession(req, res, next));
router.post('/:id/enroll', authenticate, (req, res, next) => bootcampsController.enrollFree(req, res, next));
router.post('/enrollments/:enrollmentId/sessions/:sessionId/attend', authenticate, (req, res, next) => bootcampsController.markAttendance(req, res, next));

export default router;
