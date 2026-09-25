import { Server, Socket } from 'socket.io';
import { redisService } from '../../lib/redis.service';
import { prisma } from '../../config/database';
import { REDIS_KEYS, SOCKET_EVENTS, CACHE_TTL } from '../../constants';
import { logger } from '../../config/logger';

export function registerPresenceHandlers(io: Server, socket: Socket) {
  const userId = (socket.data as { userId: string }).userId;

  // Mark user online on connect
  setOnline(userId, socket.id);

  socket.on('disconnect', () => {
    setOffline(userId);
  });
}

async function setOnline(userId: string, socketId: string) {
  try {
    await redisService.hset(REDIS_KEYS.USER_SESSION(userId), 'socketId', socketId);
    await redisService.hset(REDIS_KEYS.USER_SESSION(userId), 'onlineAt', Date.now().toString());
    await redisService.expire(REDIS_KEYS.USER_SESSION(userId), CACHE_TTL.VERY_LONG);

    await prisma.userProfile.updateMany({
      where: { userId },
      data: { isOnline: true },
    });

    logger.debug({ userId }, 'User online');
  } catch (err) {
    logger.error({ err, userId }, 'setOnline error');
  }
}

async function setOffline(userId: string) {
  try {
    await redisService.del(REDIS_KEYS.USER_SESSION(userId));

    await prisma.userProfile.updateMany({
      where: { userId },
      data: { isOnline: false, lastSeenAt: new Date() },
    });

    // Turn off live status
    await prisma.liveDeveloper.updateMany({
      where: { userId, isLive: true },
      data: { isLive: false },
    });
    await redisService.hdel(REDIS_KEYS.LIVE_DEVELOPERS, userId);

    logger.debug({ userId }, 'User offline');
  } catch (err) {
    logger.error({ err, userId }, 'setOffline error');
  }
}
