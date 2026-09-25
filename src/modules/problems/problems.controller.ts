import { Request, Response, NextFunction } from 'express';
import { problemsService } from './problems.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { parsePaginationQuery } from '../../utils/pagination';
import type { AuthenticatedRequest } from '../../types';
import { Role } from '@prisma/client';

export class ProblemsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = (req as AuthenticatedRequest).user;
      const isAdmin = auth && (auth.role === Role.ADMIN || auth.role === Role.SUPER_ADMIN);
      const result = await problemsService.list(req.query as never, isAdmin);
      sendSuccess(res, result.items, 'Problems', 200, result.meta);
    } catch (e) { next(e); }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const role = (req as AuthenticatedRequest).user?.role;
      const problem = await problemsService.getOne(req.params.idOrSlug, role);
      sendSuccess(res, { problem });
    } catch (e) { next(e); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const problem = await problemsService.create(userId, req.body);
      sendCreated(res, { problem }, 'Problem created');
    } catch (e) { next(e); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const problem = await problemsService.update(req.params.id, userId, role, req.body);
      sendSuccess(res, { problem }, 'Updated');
    } catch (e) { next(e); }
  }

  async publish(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      await problemsService.publish(req.params.id, userId, role);
      sendSuccess(res, null, 'Published');
    } catch (e) { next(e); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      await problemsService.delete(req.params.id, userId, role);
      sendSuccess(res, null, 'Deleted');
    } catch (e) { next(e); }
  }

  async listTags(req: Request, res: Response, next: NextFunction) {
    try {
      const tags = await problemsService.listTags();
      sendSuccess(res, { tags });
    } catch (e) { next(e); }
  }

  async mySolved(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await problemsService.getUserSolvedProblems(userId, page, limit);
      sendSuccess(res, result.items, 'Solved problems', 200, result.meta);
    } catch (e) { next(e); }
  }
}

export const problemsController = new ProblemsController();
