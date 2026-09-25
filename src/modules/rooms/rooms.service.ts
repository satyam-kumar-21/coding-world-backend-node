import { prisma } from '../../config/database';
import { generateRoomCode } from '../../utils/crypto';
import { buildPaginatedResult } from '../../utils/pagination';
import { NotFoundError, ForbiddenError } from '../../middlewares/errorHandler';
import { CollaborationSessionStatus } from '@prisma/client';
import { enqueueNotification } from '../../lib/queue.service';

export class RoomsService {
  async requestSession(initiatorId: string, targetUserId: string) {
    const session = await prisma.collaborationSession.create({
      data: {
        initiatorId,
        status: CollaborationSessionStatus.REQUESTED,
        roomCode: generateRoomCode(),
        members: {
          create: [
            { userId: initiatorId, role: 'HOST' },
            { userId: targetUserId, role: 'MEMBER' },
          ],
        },
      },
      include: sessionInclude,
    });

    await enqueueNotification({
      userId: targetUserId,
      type: 'COLLABORATION_REQUEST',
      title: 'Collaboration request',
      message: 'Someone wants to collaborate with you',
      entityId: session.id,
      entityType: 'SESSION',
    });

    return session;
  }

  async respond(sessionId: string, userId: string, accept: boolean) {
    const session = await prisma.collaborationSession.findUnique({ where: { id: sessionId }, include: { members: true } });
    if (!session) throw new NotFoundError('Session not found');
    const isMember = session.members.some(m => m.userId === userId);
    if (!isMember) throw new ForbiddenError('Not your session');

    const status = accept ? CollaborationSessionStatus.ACCEPTED : CollaborationSessionStatus.REJECTED;
    const updated = await prisma.collaborationSession.update({
      where: { id: sessionId },
      data: { status, ...(accept ? { startedAt: new Date() } : {}) },
      include: sessionInclude,
    });

    if (accept) {
      await enqueueNotification({
        userId: session.initiatorId,
        type: 'COLLABORATION_ACCEPTED',
        title: 'Collaboration accepted',
        message: 'Your collaboration request was accepted',
        entityId: session.id,
        entityType: 'SESSION',
      });
    }

    return updated;
  }

  async endSession(sessionId: string, userId: string) {
    const session = await prisma.collaborationSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundError('Session not found');
    if (session.initiatorId !== userId) throw new ForbiddenError('Only initiator can end');
    return prisma.collaborationSession.update({
      where: { id: sessionId },
      data: { status: CollaborationSessionStatus.ENDED, endedAt: new Date() },
    });
  }

  async getSession(sessionId: string, userId: string) {
    const session = await prisma.collaborationSession.findUnique({ where: { id: sessionId }, include: sessionInclude });
    if (!session) throw new NotFoundError('Session not found');
    const isMember = session.members.some(m => m.userId === userId);
    if (!isMember) throw new ForbiddenError('Not a member');
    return session;
  }

  async getMySessions(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = { members: { some: { userId } } };
    const [items, total] = await Promise.all([
      prisma.collaborationSession.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: sessionInclude }),
      prisma.collaborationSession.count({ where }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async sendMessage(sessionId: string, userId: string, content: string) {
    const session = await prisma.collaborationSession.findUnique({ where: { id: sessionId }, include: { members: true } });
    if (!session) throw new NotFoundError('Session not found');
    if (!session.members.some(m => m.userId === userId)) throw new ForbiddenError('Not a member');
    return prisma.sessionMessage.create({
      data: { sessionId, senderId: userId, content, type: 'TEXT' },
    });
  }

  async getMessages(sessionId: string, userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.sessionMessage.findMany({ where: { sessionId }, skip, take: limit, orderBy: { createdAt: 'asc' } }),
      prisma.sessionMessage.count({ where: { sessionId } }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }
}

const sessionInclude = {
  members: {
    include: { user: { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatar: true } } } } },
  },
};

export const roomsService = new RoomsService();
