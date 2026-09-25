import { Router } from 'express';
import { commentsController } from './comments.controller';
import { authenticate } from '../../middlewares/authenticate';

const router = Router({ mergeParams: true });

// Post comments: mounted at /posts/:postId/comments
router.get('/', (req, res, next) => commentsController.listPostComments(req, res, next));
router.post('/', authenticate, (req, res, next) => commentsController.create(req, res, next));
router.get('/:id/replies', (req, res, next) => commentsController.listReplies(req, res, next));
router.put('/:id', authenticate, (req, res, next) => commentsController.update(req, res, next));
router.delete('/:id', authenticate, (req, res, next) => commentsController.remove(req, res, next));

// Reactions
router.post('/:commentId/react', authenticate, (req, res, next) => commentsController.reactComment(req, res, next));

export const reactionsRouter = Router({ mergeParams: true });
reactionsRouter.post('/', authenticate, (req, res, next) => commentsController.reactPost(req, res, next));
reactionsRouter.get('/', (req, res, next) => commentsController.getPostReactions(req, res, next));

export default router;
