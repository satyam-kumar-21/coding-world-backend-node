import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../../constants';
import { logger } from '../../config/logger';

export function registerRoomHandlers(io: Server, socket: Socket) {
  const userId = (socket.data as { userId: string }).userId;

  socket.on(SOCKET_EVENTS.SESSION_JOINED, (data: { sessionId: string }) => {
    socket.join(`session:${data.sessionId}`);
    socket.to(`session:${data.sessionId}`).emit(SOCKET_EVENTS.SESSION_JOINED, { userId, sessionId: data.sessionId });
  });

  socket.on(SOCKET_EVENTS.SESSION_LEFT, (data: { sessionId: string }) => {
    socket.leave(`session:${data.sessionId}`);
    socket.to(`session:${data.sessionId}`).emit(SOCKET_EVENTS.SESSION_LEFT, { userId, sessionId: data.sessionId });
  });

  socket.on(SOCKET_EVENTS.SESSION_MESSAGE, async (data: { sessionId: string; content: string }) => {
    try {
      io.to(`session:${data.sessionId}`).emit(SOCKET_EVENTS.SESSION_MESSAGE, {
        sessionId: data.sessionId,
        senderId: userId,
        content: data.content,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.error({ err, userId }, 'session:message error');
    }
  });
}
