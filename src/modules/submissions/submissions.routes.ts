import { Router } from 'express';
import { submissionsController } from './submissions.controller';
import { authenticate } from '../../middlewares/authenticate';
import { validateBody } from '../../middlewares/validate';
import { submissionRateLimiter } from '../../middlewares/rateLimiter';
import { createSubmissionSchema } from './submissions.validators';

const router = Router();

router.post('/', authenticate, submissionRateLimiter, validateBody(createSubmissionSchema), (req, res, next) => submissionsController.submit(req, res, next));
router.get('/my', authenticate, (req, res, next) => submissionsController.mySubmissions(req, res, next));
router.get('/:id', authenticate, (req, res, next) => submissionsController.getOne(req, res, next));
router.get('/problem/:problemId', authenticate, (req, res, next) => submissionsController.problemSubmissions(req, res, next));
// Internal worker callback — secured by separate API key check in production
router.post('/:id/result', (req, res, next) => submissionsController.workerCallback(req, res, next));

export default router;
