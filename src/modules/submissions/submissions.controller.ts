import { Request, Response, NextFunction } from 'express';
import { submissionsService } from './submissions.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { parsePaginationQuery } from '../../utils/pagination';
import type { AuthenticatedRequest } from '../../types';

export class SubmissionsController {
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const submission = await submissionsService.create(userId, req.body);
      sendCreated(res, { submission }, 'Submission queued');
    } catch (e) { next(e); }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const submission = await submissionsService.getSubmission(req.params.id, userId);
      sendSuccess(res, { submission });
    } catch (e) { next(e); }
  }

  async mySubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await submissionsService.listUserSubmissions(userId, {
        page, limit,
        problemId: req.query.problemId as string,
        status: req.query.status as string,
        language: req.query.language as string,
      });
      sendSuccess(res, result.items, 'Submissions', 200, result.meta);
    } catch (e) { next(e); }
  }

  async problemSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await submissionsService.listProblemSubmissions(req.params.problemId, page, limit);
      sendSuccess(res, result.items, 'Submissions', 200, result.meta);
    } catch (e) { next(e); }
  }

  // Internal callback from worker
  async workerCallback(req: Request, res: Response, next: NextFunction) {
    try {
      await submissionsService.handleResult(req.params.id, req.body);
      sendSuccess(res, null, 'Result saved');
    } catch (e) { next(e); }
  }
}

export const submissionsController = new SubmissionsController();
