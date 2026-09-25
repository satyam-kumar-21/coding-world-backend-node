import { prisma } from '../../config/database';
import { storageService, generateStorageKey } from '../../lib/storage.service';
import { buildPaginatedResult } from '../../utils/pagination';
import { NotFoundError, ForbiddenError } from '../../middlewares/errorHandler';
import type { CreateNoteInput, UpdateNoteInput } from './notes.validators';
import { ResourceType } from '@prisma/client';

export class NotesService {
  async createNote(userId: string, data: CreateNoteInput) {
    return prisma.note.create({ data: { userId, ...data } });
  }

  async getUserNotes(userId: string, page: number, limit: number, courseId?: string) {
    const skip = (page - 1) * limit;
    const where = { userId, ...(courseId ? { courseId } : {}) };
    const [items, total] = await Promise.all([
      prisma.note.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' } }),
      prisma.note.count({ where }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async getNote(userId: string, noteId: string) {
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundError('Note not found');
    if (note.isPrivate && note.userId !== userId) throw new ForbiddenError('Access denied');
    return note;
  }

  async updateNote(userId: string, noteId: string, data: UpdateNoteInput) {
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundError('Note not found');
    if (note.userId !== userId) throw new ForbiddenError('Not your note');
    return prisma.note.update({ where: { id: noteId }, data });
  }

  async deleteNote(userId: string, noteId: string) {
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundError('Note not found');
    if (note.userId !== userId) throw new ForbiddenError('Not your note');
    await prisma.note.delete({ where: { id: noteId } });
  }

  // ─── File Resources ───────────────────────────────────────────
  async uploadResource(userId: string, file: Express.Multer.File, resourceType: ResourceType) {
    const key = generateStorageKey('resources', userId, file.originalname);
    const result = await storageService.upload(key, file.buffer, file.mimetype, false);
    return prisma.fileResource.create({
      data: {
        uploadedById: userId,
        fileName: key.split('/').pop() ?? key,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        storageKey: key,
        url: result.url,
        resourceType,
        bucket: result.bucket,
        isPublic: false,
      },
    });
  }

  async getUserFiles(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.fileResource.findMany({
        where: { uploadedById: userId, deletedAt: null },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.fileResource.count({ where: { uploadedById: userId, deletedAt: null } }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async getSignedUrl(userId: string, fileId: string) {
    const file = await prisma.fileResource.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundError('File not found');
    if (file.uploadedById !== userId) throw new ForbiddenError('Access denied');
    const url = await storageService.getSignedUrl(file.storageKey, 3600);
    return { url, expiresIn: 3600 };
  }

  async deleteFile(userId: string, fileId: string) {
    const file = await prisma.fileResource.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundError('File not found');
    if (file.uploadedById !== userId) throw new ForbiddenError('Access denied');
    await storageService.delete(file.storageKey);
    await prisma.fileResource.update({ where: { id: fileId }, data: { deletedAt: new Date() } });
  }
}

export const notesService = new NotesService();
