import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';
import { sendSuccess } from '../../utils/response';
import { parsePaginationQuery } from '../../utils/pagination';
import type { AuthenticatedRequest } from '../../types';
import type { UpdateProfileInput, UpdatePrivacyInput, AddEducationInput } from './users.validators';

export class UsersController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.params;
      const user = await usersService.getUserByUsername(username);
      sendSuccess(res, { user });
    } catch (err) { next(err); }
  }

  async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const user = await usersService.getUserById(userId);
      sendSuccess(res, { user });
    } catch (err) { next(err); }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const user = await usersService.updateProfile(userId, req.body as UpdateProfileInput);
      sendSuccess(res, { user }, 'Profile updated');
    } catch (err) { next(err); }
  }

  async updateUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { username } = req.body;
      const result = await usersService.updateUsername(userId, username);
      sendSuccess(res, { username: result.username }, 'Username updated');
    } catch (err) { next(err); }
  }

  async uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }
      const result = await usersService.uploadAvatar(userId, req.file);
      sendSuccess(res, result, 'Avatar updated');
    } catch (err) { next(err); }
  }

  async updatePrivacy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      await usersService.updatePrivacy(userId, req.body as UpdatePrivacyInput);
      sendSuccess(res, null, 'Privacy settings updated');
    } catch (err) { next(err); }
  }

  async addEducation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const education = await usersService.addEducation(userId, req.body as AddEducationInput);
      sendSuccess(res, { education }, 'Education added');
    } catch (err) { next(err); }
  }

  async deleteEducation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { educationId } = req.params;
      await usersService.deleteEducation(userId, educationId);
      sendSuccess(res, null, 'Education removed');
    } catch (err) { next(err); }
  }

  async getUserStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId ?? (req as AuthenticatedRequest).user.userId;
      const stats = await usersService.getUserStats(userId);
      sendSuccess(res, { stats });
    } catch (err) { next(err); }
  }

  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, sortBy, sortOrder } = parsePaginationQuery(req.query);
      const search = req.query.search as string | undefined;
      const skill = req.query.skill as string | undefined;
      const result = await usersService.listUsers({ page, limit, search, skill, sortBy, sortOrder });
      sendSuccess(res, result.items, 'Users fetched', 200, result.meta);
    } catch (err) { next(err); }
  }
}

export const usersController = new UsersController();
