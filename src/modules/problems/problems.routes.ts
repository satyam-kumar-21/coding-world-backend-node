import { Router } from 'express';
import { problemsController } from './problems.controller';
import { authenticate, optionalAuthenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authenticate';
import { validateBody, validateQuery } from '../../middlewares/validate';
import { Role } from '@prisma/client';
import { createProblemSchema, updateProblemSchema, problemQuerySchema } from './problems.validators';

const router = Router();
const isInstructor = authorize(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN);

router.get('/', optionalAuthenticate, validateQuery(problemQuerySchema), (req, res, next) => problemsController.list(req, res, next));
router.get('/tags', (req, res, next) => problemsController.listTags(req, res, next));
router.get('/solved/my', authenticate, (req, res, next) => problemsController.mySolved(req, res, next));
router.get('/:idOrSlug', optionalAuthenticate, (req, res, next) => problemsController.getOne(req, res, next));
router.post('/', authenticate, isInstructor, validateBody(createProblemSchema), (req, res, next) => problemsController.create(req, res, next));
router.put('/:id', authenticate, isInstructor, validateBody(updateProblemSchema), (req, res, next) => problemsController.update(req, res, next));
router.post('/:id/publish', authenticate, isInstructor, (req, res, next) => problemsController.publish(req, res, next));
router.delete('/:id', authenticate, isInstructor, (req, res, next) => problemsController.remove(req, res, next));

export default router;
