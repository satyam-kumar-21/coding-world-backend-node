import { Server, Socket } from 'socket.io';
import { chatService } from '../../modules/chat/chat.service';
import { SOCKET_EVENTS } from '../../constants';
import { logger } from '../../config/logger';
import { redisService } from '../../lib/redis.service';
import { REDIS_KEYS } from '../../constants';

export function registerChatHandlers(io: Server, socket: Socket) {
  const userId = (socket.data as { userId: string }).userId;

  // Join all user conversation rooms
  socket.on('joinRoom', (conversationId: string) => {
    socket.join(`conv:${conversationId}`);
  });

  socket.on('leaveRoom', (conversationId: string) => {
    socket.leave(`conv:${conversationId}`);
  });

  // Real-time message send
  socket.on(SOCKET_EVENTS.MESSAGE_SEND, async (data: {
    conversationId: string;
    content: string;
    replyToId?: string;
  }) => {
    try {
      const message = await chatService.sendMessage(data.conversationId, userId, {
        content: data.content,
        replyToId: data.replyToId,
      });

      // Broadcast to all members in room
      io.to(`conv:${data.conversationId}`).emit(SOCKET_EVENTS.MESSAGE_NEW, { message });
    } catch (err) {
      logger.error({ err, userId }, 'Socket message send error');
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on(SOCKET_EVENTS.USER_TYPING, async (data: { conversationId: string }) => {
    const key = REDIS_KEYS.TYPING(data.conversationId, userId);
    await redisService.set(key, '1', 5); // 5s TTL
    socket.to(`conv:${data.conversationId}`).emit(SOCKET_EVENTS.USER_TYPING, { userId, conversationId: data.conversationId });
  });

  socket.on(SOCKET_EVENTS.USER_STOP_TYPING, (data: { conversationId: string }) => {
    const key = REDIS_KEYS.TYPING(data.conversationId, userId);
    redisService.del(key);
    socket.to(`conv:${data.conversationId}`).emit(SOCKET_EVENTS.USER_STOP_TYPING, { userId, conversationId: data.conversationId });
  });

  // Mark read
  socket.on(SOCKET_EVENTS.MESSAGE_READ, async (data: { conversationId: string; messageId: string }) => {
    try {
      await chatService.markRead(data.conversationId, userId, data.messageId);
      socket.to(`conv:${data.conversationId}`).emit(SOCKET_EVENTS.MESSAGE_READ, { userId, messageId: data.messageId });
    } catch (err) {
      logger.error({ err, userId }, 'Socket markRead error');
    }
  });
}
