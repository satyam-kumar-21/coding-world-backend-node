import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { sendSuccess } from '../../utils/response';
import { parsePaginationQuery } from '../../utils/pagination';
import { Role } from '@prisma/client';

export class AdminController {
  async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.getDashboard();
      sendSuccess(res, data);
    } catch (e) { next(e); }
  }

  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await adminService.listUsers(page, limit, req.query.search as string, req.query.role as Role);
      sendSuccess(res, result.items, 'Users', 200, result.meta);
    } catch (e) { next(e); }
  }

  async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await adminService.updateUserRole(req.params.userId, req.body.role as Role);
      sendSuccess(res, { user }, 'Role updated');
    } catch (e) { next(e); }
  }

  async suspend(req: Request, res: Response, next: NextFunction) {
    try {
      await adminService.suspendUser(req.params.userId);
      sendSuccess(res, null, 'User suspended');
    } catch (e) { next(e); }
  }

  async restore(req: Request, res: Response, next: NextFunction) {
    try {
      await adminService.restoreUser(req.params.userId);
      sendSuccess(res, null, 'User restored');
    } catch (e) { next(e); }
  }

  async listReports(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await adminService.listReports(page, limit, req.query.status as string);
      sendSuccess(res, result.items, 'Reports', 200, result.meta);
    } catch (e) { next(e); }
  }

  async moderateReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as never as { user: { userId: string } }).user;
      const result = await adminService.moderateReport(req.params.reportId, userId, req.body.action, req.body.reason);
      sendSuccess(res, result);
    } catch (e) { next(e); }
  }

  async listTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await adminService.listTransactions(page, limit);
      sendSuccess(res, result.items, 'Transactions', 200, result.meta);
    } catch (e) { next(e); }
  }
}

export const adminController = new AdminController();
