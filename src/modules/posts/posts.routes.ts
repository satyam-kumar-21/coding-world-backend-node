import { Router } from 'express';
import { postsController } from './posts.controller';
import { authenticate, optionalAuthenticate } from '../../middlewares/authenticate';
import { validateBody, validateQuery } from '../../middlewares/validate';
import { createPostSchema, updatePostSchema, postQuerySchema } from './posts.validators';

const router = Router();

router.get('/', optionalAuthenticate, validateQuery(postQuerySchema), (req, res, next) => postsController.getFeed(req, res, next));
router.get('/:id', optionalAuthenticate, (req, res, next) => postsController.getOne(req, res, next));
router.post('/', authenticate, validateBody(createPostSchema), (req, res, next) => postsController.create(req, res, next));
router.put('/:id', authenticate, validateBody(updatePostSchema), (req, res, next) => postsController.update(req, res, next));
router.delete('/:id', authenticate, (req, res, next) => postsController.remove(req, res, next));
router.post('/:id/poll/vote', authenticate, (req, res, next) => postsController.votePoll(req, res, next));

export default router;
