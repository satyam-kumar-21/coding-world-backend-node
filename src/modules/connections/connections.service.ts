import { prisma } from '../../config/database';
import { buildPaginatedResult } from '../../utils/pagination';
import { NotFoundError, ForbiddenError, ConflictError, AppError } from '../../middlewares/errorHandler';
import { ConnectionStatus } from '@prisma/client';
import { HTTP_STATUS } from '../../constants';
import { enqueueNotification } from '../../lib/queue.service';

export class ConnectionsService {
  async sendRequest(senderId: string, receiverId: string, message?: string) {
    if (senderId === receiverId) throw new AppError('Cannot connect with yourself', HTTP_STATUS.BAD_REQUEST);

    // Check if blocked
    const block = await prisma.connection.findFirst({
      where: {
        OR: [
          { senderId, receiverId, status: ConnectionStatus.BLOCKED },
          { senderId: receiverId, receiverId: senderId, status: ConnectionStatus.BLOCKED },
        ],
      },
    });
    if (block) throw new ForbiddenError('Connection not allowed');

    // Check existing
    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });
    if (existing) {
      if (existing.status === ConnectionStatus.ACCEPTED) throw new ConflictError('Already connected');
      if (existing.status === ConnectionStatus.PENDING) throw new ConflictError('Request already sent');
    }

    const connection = await prisma.connection.create({
      data: { senderId, receiverId, message, status: ConnectionStatus.PENDING },
    });

    await enqueueNotification({
      userId: receiverId, type: 'CONNECTION_REQUEST',
      title: 'New connection request',
      message: 'Someone sent you a connection request',
      entityId: connection.id, entityType: 'CONNECTION',
    });

    return connection;
  }

  async respond(connectionId: string, userId: string, accept: boolean) {
    const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
    if (!connection) throw new NotFoundError('Connection request not found');
    if (connection.receiverId !== userId) throw new ForbiddenError('Not your request');
    if (connection.status !== ConnectionStatus.PENDING) throw new AppError('Request already handled', HTTP_STATUS.BAD_REQUEST);

    const status = accept ? ConnectionStatus.ACCEPTED : ConnectionStatus.REJECTED;
    const updated = await prisma.connection.update({
      where: { id: connectionId },
      data: { status, respondedAt: new Date() },
    });

    if (accept) {
      await enqueueNotification({
        userId: connection.senderId, type: 'CONNECTION_ACCEPTED',
        title: 'Connection accepted',
        message: 'Your connection request was accepted',
        entityId: connectionId, entityType: 'CONNECTION',
      });
    }

    return updated;
  }

  async cancel(connectionId: string, userId: string) {
    const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
    if (!connection) throw new NotFoundError('Request not found');
    if (connection.senderId !== userId) throw new ForbiddenError('Not your request');
    if (connection.status !== ConnectionStatus.PENDING) throw new AppError('Cannot cancel', HTTP_STATUS.BAD_REQUEST);
    await prisma.connection.delete({ where: { id: connectionId } });
  }

  async remove(userId: string, targetUserId: string) {
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: userId },
        ],
        status: ConnectionStatus.ACCEPTED,
      },
    });
    if (!connection) throw new NotFoundError('Connection not found');
    await prisma.connection.delete({ where: { id: connection.id } });
  }

  async block(userId: string, targetUserId: string) {
    if (userId === targetUserId) throw new AppError('Cannot block yourself', HTTP_STATUS.BAD_REQUEST);
    // Remove existing connection/request
    await prisma.connection.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: userId },
        ],
      },
    });
    return prisma.connection.create({ data: { senderId: userId, receiverId: targetUserId, status: ConnectionStatus.BLOCKED } });
  }

  async unblock(userId: string, targetUserId: string) {
    await prisma.connection.deleteMany({
      where: { senderId: userId, receiverId: targetUserId, status: ConnectionStatus.BLOCKED },
    });
  }

  async getPendingRequests(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = { receiverId: userId, status: ConnectionStatus.PENDING };
    const [items, total] = await Promise.all([
      prisma.connection.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { sender: { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatar: true, currentRole: true } } } } },
      }),
      prisma.connection.count({ where }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async getConnections(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = {
      OR: [{ senderId: userId }, { receiverId: userId }],
      status: ConnectionStatus.ACCEPTED,
    };
    const [items, total] = await Promise.all([
      prisma.connection.findMany({
        where, skip, take: limit, orderBy: { respondedAt: 'desc' },
        include: {
          sender: { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatar: true, isOnline: true } } } },
          receiver: { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatar: true, isOnline: true } } } },
        },
      }),
      prisma.connection.count({ where }),
    ]);
    // Return the "other" user
    const mapped = items.map(c => ({
      connectionId: c.id,
      connectedAt: c.respondedAt,
      user: c.senderId === userId ? c.receiver : c.sender,
    }));
    return buildPaginatedResult(mapped, total, page, limit);
  }

  async getConnectionStatus(userId: string, targetUserId: string) {
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: userId },
        ],
      },
    });
    return { status: connection?.status ?? null, connectionId: connection?.id ?? null, isSender: connection?.senderId === userId };
  }
}

export const connectionsService = new ConnectionsService();
