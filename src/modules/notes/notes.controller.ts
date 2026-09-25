import { Request, Response, NextFunction } from 'express';
import { notesService } from './notes.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { parsePaginationQuery } from '../../utils/pagination';
import type { AuthenticatedRequest } from '../../types';
import { ResourceType } from '@prisma/client';

export class NotesController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const note = await notesService.createNote(userId, req.body);
      sendCreated(res, { note }, 'Note created');
    } catch (e) { next(e); }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { page, limit } = parsePaginationQuery(req.query);
      const courseId = req.query.courseId as string | undefined;
      const result = await notesService.getUserNotes(userId, page, limit, courseId);
      sendSuccess(res, result.items, 'Notes', 200, result.meta);
    } catch (e) { next(e); }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const note = await notesService.getNote(userId, req.params.noteId);
      sendSuccess(res, { note });
    } catch (e) { next(e); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const note = await notesService.updateNote(userId, req.params.noteId, req.body);
      sendSuccess(res, { note }, 'Note updated');
    } catch (e) { next(e); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      await notesService.deleteNote(userId, req.params.noteId);
      sendSuccess(res, null, 'Note deleted');
    } catch (e) { next(e); }
  }

  async uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      if (!req.file) { res.status(400).json({ success: false, message: 'No file' }); return; }
      const type = (req.query.type as ResourceType) ?? ResourceType.OTHER;
      const file = await notesService.uploadResource(userId, req.file, type);
      sendCreated(res, { file }, 'File uploaded');
    } catch (e) { next(e); }
  }

  async listFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await notesService.getUserFiles(userId, page, limit);
      sendSuccess(res, result.items, 'Files', 200, result.meta);
    } catch (e) { next(e); }
  }

  async getSignedUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const result = await notesService.getSignedUrl(userId, req.params.fileId);
      sendSuccess(res, result);
    } catch (e) { next(e); }
  }

  async deleteFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      await notesService.deleteFile(userId, req.params.fileId);
      sendSuccess(res, null, 'File deleted');
    } catch (e) { next(e); }
  }
}

export const notesController = new NotesController();
