import { prisma } from '../../config/database';
import { redisService } from '../../lib/redis.service';
import { REDIS_KEYS, CACHE_TTL, LEVEL_THRESHOLDS, XP_CONFIG } from '../../constants';
import { buildPaginatedResult } from '../../utils/pagination';
import { NotFoundError } from '../../middlewares/errorHandler';

export class RankingsService {
  // ─── XP / Gamification ────────────────────────────────────────
  async addXp(userId: string, amount: number, type: string, entityId?: string, entityType?: string, description?: string) {
    // Log XP transaction
    await prisma.xpTransaction.create({ data: { userId, amount, type, entityId, entityType, description } });

    // Update gamification
    const current = await prisma.userGamification.upsert({
      where: { userId },
      create: { userId, totalXp: amount, weeklyXp: amount, monthlyXp: amount },
      update: {
        totalXp: { increment: amount },
        weeklyXp: { increment: amount },
        monthlyXp: { increment: amount },
      },
    });

    // Check level up
    const newLevel = this.calculateLevel(current.totalXp + amount);
    if (newLevel.level !== current.level) {
      await prisma.userGamification.update({
        where: { userId },
        data: { level: newLevel.level, levelTitle: newLevel.title },
      });
    }

    // Update streak
    await this.updateStreak(userId);

    // Update Redis sorted sets for leaderboard
    await redisService.zincrby(REDIS_KEYS.LEADERBOARD_GLOBAL, amount, userId);
    await redisService.zincrby(REDIS_KEYS.LEADERBOARD_WEEKLY, amount, userId);
    await redisService.zincrby(REDIS_KEYS.LEADERBOARD_MONTHLY, amount, userId);

    return current;
  }

  calculateLevel(xp: number): { level: number; title: string } {
    let result = { level: 1, title: 'Beginner' };
    for (const threshold of LEVEL_THRESHOLDS) {
      if (xp >= threshold.minXp) {
        result = { level: threshold.level, title: threshold.title };
      }
    }
    return result;
  }

  async updateStreak(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const streak = await prisma.userStreak.findUnique({ where: { userId } });
    if (!streak) {
      await prisma.userStreak.create({ data: { userId, currentStreak: 1, longestStreak: 1, lastActivityAt: new Date() } });
      return;
    }
    if (!streak.lastActivityAt) {
      await prisma.userStreak.update({ where: { userId }, data: { currentStreak: 1, longestStreak: 1, lastActivityAt: new Date() } });
      return;
    }
    const last = new Date(streak.lastActivityAt);
    last.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - last.getTime()) / 86400000);
    if (diff === 0) return; // Already active today
    const newStreak = diff === 1 ? streak.currentStreak + 1 : 1;
    const newLongest = Math.max(newStreak, streak.longestStreak);
    await prisma.userStreak.update({
      where: { userId },
      data: { currentStreak: newStreak, longestStreak: newLongest, lastActivityAt: new Date() },
    });
  }

  async updateProblemStats(userId: string, difficulty: string) {
    const difficultyField: Record<string, string> = {
      EASY: 'easySolved', MEDIUM: 'mediumSolved', HARD: 'hardSolved', EXPERT: 'expertSolved',
    };
    const field = difficultyField[difficulty];
    if (!field) return;
    await prisma.userGamification.upsert({
      where: { userId },
      create: { userId, problemsSolved: 1, [field]: 1, acceptedSubmissions: 1, totalSubmissions: 1 },
      update: { problemsSolved: { increment: 1 }, [field]: { increment: 1 }, acceptedSubmissions: { increment: 1 }, totalSubmissions: { increment: 1 } },
    });
  }

  // ─── Leaderboards ─────────────────────────────────────────────
  async getGlobalLeaderboard(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.userGamification.findMany({
        orderBy: { totalXp: 'desc' },
        skip, take: limit,
        include: { user: { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatar: true, developerLevel: true } } } } },
      }),
      prisma.userGamification.count(),
    ]);
    return buildPaginatedResult(
      items.map((item, i) => ({ rank: skip + i + 1, ...item })),
      total, page, limit,
    );
  }

  async getWeeklyLeaderboard(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.userGamification.findMany({
        orderBy: { weeklyXp: 'desc' },
        skip, take: limit,
        include: { user: { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatar: true } } } } },
      }),
      prisma.userGamification.count(),
    ]);
    return buildPaginatedResult(items.map((item, i) => ({ rank: skip + i + 1, ...item })), total, page, limit);
  }

  async getUserRank(userId: string) {
    const gamification = await prisma.userGamification.findUnique({ where: { userId } });
    if (!gamification) throw new NotFoundError('User stats not found');
    const globalRank = await prisma.userGamification.count({ where: { totalXp: { gt: gamification.totalXp } } });
    const weeklyRank = await prisma.userGamification.count({ where: { weeklyXp: { gt: gamification.weeklyXp } } });
    return { globalRank: globalRank + 1, weeklyRank: weeklyRank + 1, gamification };
  }

  async resetWeeklyXp() {
    await prisma.userGamification.updateMany({ data: { weeklyXp: 0 } });
    await redisService.del(REDIS_KEYS.LEADERBOARD_WEEKLY);
  }

  async resetMonthlyXp() {
    await prisma.userGamification.updateMany({ data: { monthlyXp: 0 } });
    await redisService.del(REDIS_KEYS.LEADERBOARD_MONTHLY);
  }

  // ─── Achievements ─────────────────────────────────────────────
  async getUserAchievements(userId: string) {
    return prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { earnedAt: 'desc' },
    });
  }

  async checkAndAwardAchievements(userId: string) {
    const gamification = await prisma.userGamification.findUnique({ where: { userId } });
    if (!gamification) return;
    const achievements = await prisma.achievement.findMany({ where: { isActive: true } });
    for (const achievement of achievements) {
      const alreadyEarned = await prisma.userAchievement.findUnique({ where: { userId_achievementId: { userId, achievementId: achievement.id } } });
      if (alreadyEarned) continue;
      // criteria is JSON — evaluate basic criteria
      const criteria = achievement.criteria as Record<string, number>;
      let earned = false;
      if (criteria.minXp && gamification.totalXp >= criteria.minXp) earned = true;
      if (criteria.minProblems && gamification.problemsSolved >= criteria.minProblems) earned = true;
      if (criteria.minStreak) {
        const streak = await prisma.userStreak.findUnique({ where: { userId } });
        if (streak && streak.currentStreak >= criteria.minStreak) earned = true;
      }
      if (earned) {
        await prisma.userAchievement.create({ data: { userId, achievementId: achievement.id } });
        if (achievement.xpReward > 0) {
          await this.addXp(userId, achievement.xpReward, 'ACHIEVEMENT', achievement.id, 'ACHIEVEMENT');
        }
      }
    }
  }
}

export const rankingsService = new RankingsService();
