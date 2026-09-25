import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';
import { sendSuccess } from '../../utils/response';
import type { AuthenticatedRequest } from '../../types';

export class NotificationsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const cursor = req.query.cursor as string | undefined;
      const limit = Number(req.query.limit ?? 20);
      const result = await notificationsService.getNotifications(userId, cursor, limit);
      sendSuccess(res, result.items, 'Notifications');
    } catch (e) { next(e); }
  }

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      await notificationsService.markRead(userId, req.params.id);
      sendSuccess(res, null, 'Marked read');
    } catch (e) { next(e); }
  }

  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      await notificationsService.markAllRead(userId);
      sendSuccess(res, null, 'All marked read');
    } catch (e) { next(e); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      await notificationsService.deleteNotification(userId, req.params.id);
      sendSuccess(res, null, 'Deleted');
    } catch (e) { next(e); }
  }

  async unreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const count = await notificationsService.getUnreadCount(userId);
      sendSuccess(res, { count });
    } catch (e) { next(e); }
  }
}

export const notificationsController = new NotificationsController();
