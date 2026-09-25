import { Request, Response, NextFunction } from 'express';
import { commentsService } from './comments.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { parsePaginationQuery } from '../../utils/pagination';
import type { AuthenticatedRequest } from '../../types';
import { ReactionType } from '@prisma/client';

export class CommentsController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { postId } = req.params;
      const comment = await commentsService.createComment(userId, postId, req.body.content, req.body.parentId);
      sendCreated(res, { comment }, 'Comment added');
    } catch (e) { next(e); }
  }

  async listPostComments(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await commentsService.getPostComments(req.params.postId, page, limit);
      sendSuccess(res, result.items, 'Comments', 200, result.meta);
    } catch (e) { next(e); }
  }

  async listReplies(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await commentsService.getReplies(req.params.commentId, page, limit);
      sendSuccess(res, result.items, 'Replies', 200, result.meta);
    } catch (e) { next(e); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const comment = await commentsService.updateComment(req.params.id, userId, req.body.content);
      sendSuccess(res, { comment }, 'Updated');
    } catch (e) { next(e); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      await commentsService.deleteComment(req.params.id, userId);
      sendSuccess(res, null, 'Deleted');
    } catch (e) { next(e); }
  }

  async reactPost(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const result = await commentsService.reactToPost(userId, req.params.postId, req.body.type as ReactionType);
      sendSuccess(res, result);
    } catch (e) { next(e); }
  }

  async reactComment(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const result = await commentsService.reactToComment(userId, req.params.commentId, req.body.type as ReactionType);
      sendSuccess(res, result);
    } catch (e) { next(e); }
  }

  async getPostReactions(req: Request, res: Response, next: NextFunction) {
    try {
      const reactions = await commentsService.getPostReactions(req.params.postId);
      sendSuccess(res, { reactions });
    } catch (e) { next(e); }
  }
}

export const commentsController = new CommentsController();
