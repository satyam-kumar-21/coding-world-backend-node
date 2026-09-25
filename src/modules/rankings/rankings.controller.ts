import { Request, Response, NextFunction } from 'express';
import { rankingsService } from './rankings.service';
import { sendSuccess } from '../../utils/response';
import { parsePaginationQuery } from '../../utils/pagination';
import type { AuthenticatedRequest } from '../../types';

export class RankingsController {
  async globalLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await rankingsService.getGlobalLeaderboard(page, limit);
      sendSuccess(res, result.items, 'Global leaderboard', 200, result.meta);
    } catch (e) { next(e); }
  }

  async weeklyLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await rankingsService.getWeeklyLeaderboard(page, limit);
      sendSuccess(res, result.items, 'Weekly leaderboard', 200, result.meta);
    } catch (e) { next(e); }
  }

  async myRank(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const data = await rankingsService.getUserRank(userId);
      sendSuccess(res, data);
    } catch (e) { next(e); }
  }

  async userRank(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await rankingsService.getUserRank(req.params.userId);
      sendSuccess(res, data);
    } catch (e) { next(e); }
  }

  async myAchievements(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const achievements = await rankingsService.getUserAchievements(userId);
      sendSuccess(res, { achievements });
    } catch (e) { next(e); }
  }
}

export const rankingsController = new RankingsController();
