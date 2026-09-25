import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createRedisConnection } from '../config/redis';
import { logger } from '../config/logger';
import { corsOrigins } from '../config/env';
import { socketAuth } from './socket.auth';
import { registerPresenceHandlers } from './handlers/presence.handler';
import { registerChatHandlers } from './handlers/chat.handler';
import { registerLiveHandlers } from './handlers/live.handler';
import { registerRoomHandlers } from './handlers/room.handler';

let io: SocketServer;

export function initSocketIO(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Redis adapter for horizontal scaling
  try {
    const pubClient = createRedisConnection();
    const subClient = createRedisConnection();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.IO Redis adapter connected');
  } catch (err) {
    logger.warn({ err }, 'Socket.IO Redis adapter failed — using in-memory adapter');
  }

  // Auth middleware
  io.use(socketAuth);

  io.on('connection', (socket: Socket) => {
    const userId = (socket.data as { userId: string }).userId;
    logger.info({ userId, socketId: socket.id }, 'Socket connected');

    // Join personal room
    socket.join(`user:${userId}`);

    // Register feature handlers
    registerPresenceHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerLiveHandlers(io, socket);
    registerRoomHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info({ userId, reason }, 'Socket disconnected');
    });

    socket.on('error', (err) => {
      logger.error({ err, userId }, 'Socket error');
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

/** Emit to a specific user across all sockets/nodes */
export function emitToUser(userId: string, event: string, data: unknown) {
  getIO().to(`user:${userId}`).emit(event, data);
}
