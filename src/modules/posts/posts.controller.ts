import { Request, Response, NextFunction } from 'express';
import { postsService } from './posts.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import type { AuthenticatedRequest } from '../../types';

export class PostsController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const post = await postsService.create(userId, req.body);
      sendCreated(res, { post }, 'Post created');
    } catch (e) { next(e); }
  }

  async getFeed(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user?.userId;
      const result = await postsService.getFeed(userId, req.query as never);
      if ('items' in result) {
        sendSuccess(res, result.items, 'Feed', 200, result.meta);
      } else {
        sendSuccess(res, result.items, 'Feed');
      }
    } catch (e) { next(e); }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const post = await postsService.getOne(req.params.id);
      sendSuccess(res, { post });
    } catch (e) { next(e); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const post = await postsService.update(req.params.id, userId, req.body);
      sendSuccess(res, { post }, 'Updated');
    } catch (e) { next(e); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      await postsService.delete(req.params.id, userId);
      sendSuccess(res, null, 'Deleted');
    } catch (e) { next(e); }
  }

  async votePoll(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const result = await postsService.votePoll(userId, req.params.id, req.body.optionId);
      sendSuccess(res, { option: result }, 'Vote cast');
    } catch (e) { next(e); }
  }
}

export const postsController = new PostsController();
