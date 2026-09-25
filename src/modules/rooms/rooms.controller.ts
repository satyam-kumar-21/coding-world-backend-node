import { Request, Response, NextFunction } from 'express';
import { roomsService } from './rooms.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { parsePaginationQuery } from '../../utils/pagination';
import type { AuthenticatedRequest } from '../../types';

export class RoomsController {
  async request(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const session = await roomsService.requestSession(userId, req.body.targetUserId);
      sendCreated(res, { session }, 'Session requested');
    } catch (e) { next(e); }
  }

  async accept(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const session = await roomsService.respond(req.params.id, userId, true);
      sendSuccess(res, { session }, 'Session accepted');
    } catch (e) { next(e); }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const session = await roomsService.respond(req.params.id, userId, false);
      sendSuccess(res, { session }, 'Session rejected');
    } catch (e) { next(e); }
  }

  async end(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      await roomsService.endSession(req.params.id, userId);
      sendSuccess(res, null, 'Session ended');
    } catch (e) { next(e); }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const session = await roomsService.getSession(req.params.id, userId);
      sendSuccess(res, { session });
    } catch (e) { next(e); }
  }

  async mySessions(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await roomsService.getMySessions(userId, page, limit);
      sendSuccess(res, result.items, 'Sessions', 200, result.meta);
    } catch (e) { next(e); }
  }

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const msg = await roomsService.sendMessage(req.params.id, userId, req.body.content);
      sendCreated(res, { message: msg }, 'Sent');
    } catch (e) { next(e); }
  }

  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await roomsService.getMessages(req.params.id, userId, page, limit);
      sendSuccess(res, result.items, 'Messages', 200, result.meta);
    } catch (e) { next(e); }
  }
}

export const roomsController = new RoomsController();
