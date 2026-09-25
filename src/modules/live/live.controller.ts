import { Request, Response, NextFunction } from 'express';
import { liveService } from './live.service';
import { sendSuccess } from '../../utils/response';
import { parsePaginationQuery } from '../../utils/pagination';
import type { AuthenticatedRequest } from '../../types';

export class LiveController {
  async setStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { isLive, currentActivity, codingLanguage, liveNote } = req.body;
      const status = await liveService.setLiveStatus(userId, isLive, { currentActivity, codingLanguage, liveNote });
      sendSuccess(res, { status }, `Live status ${isLive ? 'enabled' : 'disabled'}`);
    } catch (e) { next(e); }
  }

  async getMyStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const status = await liveService.getMyLiveStatus(userId);
      sendSuccess(res, { status });
    } catch (e) { next(e); }
  }

  async listLive(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationQuery(req.query);
      const skill = req.query.skill as string | undefined;
      const result = await liveService.getLiveDevelopers(page, limit, skill);
      sendSuccess(res, result.items, 'Live developers', 200, result.meta);
    } catch (e) { next(e); }
  }
}

export const liveController = new LiveController();
