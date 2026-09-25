import { Request, Response, NextFunction } from 'express';
import { connectionsService } from './connections.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { parsePaginationQuery } from '../../utils/pagination';
import type { AuthenticatedRequest } from '../../types';

export class ConnectionsController {
  async send(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const conn = await connectionsService.sendRequest(userId, req.body.receiverId, req.body.message);
      sendCreated(res, { connection: conn }, 'Request sent');
    } catch (e) { next(e); }
  }

  async accept(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const conn = await connectionsService.respond(req.params.id, userId, true);
      sendSuccess(res, { connection: conn }, 'Connection accepted');
    } catch (e) { next(e); }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const conn = await connectionsService.respond(req.params.id, userId, false);
      sendSuccess(res, { connection: conn }, 'Request rejected');
    } catch (e) { next(e); }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      await connectionsService.cancel(req.params.id, userId);
      sendSuccess(res, null, 'Request cancelled');
    } catch (e) { next(e); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      await connectionsService.remove(userId, req.params.userId);
      sendSuccess(res, null, 'Connection removed');
    } catch (e) { next(e); }
  }

  async block(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      await connectionsService.block(userId, req.body.targetUserId);
      sendSuccess(res, null, 'User blocked');
    } catch (e) { next(e); }
  }

  async unblock(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      await connectionsService.unblock(userId, req.params.userId);
      sendSuccess(res, null, 'User unblocked');
    } catch (e) { next(e); }
  }

  async pending(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await connectionsService.getPendingRequests(userId, page, limit);
      sendSuccess(res, result.items, 'Pending requests', 200, result.meta);
    } catch (e) { next(e); }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await connectionsService.getConnections(userId, page, limit);
      sendSuccess(res, result.items, 'Connections', 200, result.meta);
    } catch (e) { next(e); }
  }

  async status(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const data = await connectionsService.getConnectionStatus(userId, req.params.userId);
      sendSuccess(res, data);
    } catch (e) { next(e); }
  }
}

export const connectionsController = new ConnectionsController();
