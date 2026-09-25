import { Request, Response, NextFunction } from 'express';
import { chatService } from './chat.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { parsePaginationQuery } from '../../utils/pagination';
import type { AuthenticatedRequest } from '../../types';

export class ChatController {
  async getDirect(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const conversation = await chatService.getOrCreateDirectConversation(userId, req.params.targetUserId);
      sendSuccess(res, { conversation });
    } catch (e) { next(e); }
  }

  async createGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const conversation = await chatService.createGroupConversation(userId, req.body.name, req.body.memberIds ?? []);
      sendCreated(res, { conversation }, 'Group created');
    } catch (e) { next(e); }
  }

  async listConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await chatService.getUserConversations(userId, page, limit);
      sendSuccess(res, result.items, 'Conversations', 200, result.meta);
    } catch (e) { next(e); }
  }

  async getConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const conversation = await chatService.getConversation(req.params.id, userId);
      sendSuccess(res, { conversation });
    } catch (e) { next(e); }
  }

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const message = await chatService.sendMessage(req.params.id, userId, req.body);
      sendCreated(res, { message }, 'Sent');
    } catch (e) { next(e); }
  }

  async sendFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      if (!req.file) { res.status(400).json({ success: false, message: 'No file' }); return; }
      const message = await chatService.sendFileMessage(req.params.id, userId, req.file);
      sendCreated(res, { message }, 'File sent');
    } catch (e) { next(e); }
  }

  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const cursor = req.query.cursor as string | undefined;
      const limit = Number(req.query.limit ?? 30);
      const result = await chatService.getMessages(req.params.id, userId, cursor, limit);
      sendSuccess(res, result.items, 'Messages');
    } catch (e) { next(e); }
  }

  async editMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const message = await chatService.editMessage(req.params.messageId, userId, req.body.content);
      sendSuccess(res, { message }, 'Updated');
    } catch (e) { next(e); }
  }

  async deleteMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      await chatService.deleteMessage(req.params.messageId, userId);
      sendSuccess(res, null, 'Deleted');
    } catch (e) { next(e); }
  }

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      await chatService.markRead(req.params.id, userId, req.body.messageId);
      sendSuccess(res, null, 'Marked read');
    } catch (e) { next(e); }
  }
}

export const chatController = new ChatController();
