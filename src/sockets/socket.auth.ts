import { Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../config/database';
import type { SocketAuthPayload } from '../types';

export async function socketAuth(socket: Socket, next: (err?: Error) => void) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return next(new Error('Invalid token'));
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, username: true, role: true, isActive: true, deletedAt: true },
    });

    if (!user || !user.isActive || user.deletedAt) {
      return next(new Error('Account not found'));
    }

    (socket.data as SocketAuthPayload & { userId: string }) = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
}
