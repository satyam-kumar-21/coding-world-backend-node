import { prisma } from '../../config/database';
import { redisService } from '../../lib/redis.service';
import { REDIS_KEYS, CACHE_TTL } from '../../constants';
import { buildPaginatedResult } from '../../utils/pagination';

export class LiveService {
  async setLiveStatus(userId: string, isLive: boolean, data?: {
    currentActivity?: string;
    codingLanguage?: string;
    liveNote?: string;
  }) {
    const live = await prisma.liveDeveloper.upsert({
      where: { userId },
      create: { userId, isLive, ...data, enabledAt: isLive ? new Date() : undefined },
      update: { isLive, ...data, enabledAt: isLive ? new Date() : undefined },
    });

    await prisma.userProfile.updateMany({
      where: { userId },
      data: { isLiveEnabled: isLive, isOnline: isLive },
    });

    // Update Redis set
    if (isLive) {
      await redisService.hset(REDIS_KEYS.LIVE_DEVELOPERS, userId, JSON.stringify({
        userId, ...data, isLive: true, enabledAt: new Date().toISOString(),
      }));
    } else {
      await redisService.hdel(REDIS_KEYS.LIVE_DEVELOPERS, userId);
    }

    return live;
  }

  async getLiveDevelopers(page: number, limit: number, skill?: string) {
    const skip = (page - 1) * limit;
    const where = {
      isLive: true,
      user: {
        isActive: true,
        deletedAt: null,
        profile: {
          privacySettings: { showInLiveDevelopers: true },
          ...(skill ? { skills: { has: skill } } : {}),
        },
      },
    };
    const [items, total] = await Promise.all([
      prisma.liveDeveloper.findMany({
        where, skip, take: limit,
        orderBy: { enabledAt: 'desc' },
        include: {
          user: {
            select: {
              id: true, username: true,
              profile: { select: { firstName: true, lastName: true, avatar: true, skills: true, currentRole: true, developerLevel: true } },
              gamification: { select: { level: true, levelTitle: true } },
            },
          },
        },
      }),
      prisma.liveDeveloper.count({ where }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async getMyLiveStatus(userId: string) {
    return prisma.liveDeveloper.findUnique({ where: { userId } });
  }
}

export const liveService = new LiveService();
