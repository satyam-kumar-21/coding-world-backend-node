import { Request, Response, NextFunction } from 'express';
import { bootcampsService } from './bootcamps.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { parsePaginationQuery } from '../../utils/pagination';
import type { AuthenticatedRequest } from '../../types';

export class BootcampsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await bootcampsService.list(page, limit, req.query.status as string);
      sendSuccess(res, result.items, 'Bootcamps', 200, result.meta);
    } catch (e) { next(e); }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const bootcamp = await bootcampsService.getOne(req.params.idOrSlug);
      sendSuccess(res, { bootcamp });
    } catch (e) { next(e); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const bootcamp = await bootcampsService.create(userId, req.body);
      sendCreated(res, { bootcamp }, 'Bootcamp created');
    } catch (e) { next(e); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const bootcamp = await bootcampsService.update(req.params.id, userId, role, req.body);
      sendSuccess(res, { bootcamp }, 'Updated');
    } catch (e) { next(e); }
  }

  async publish(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      await bootcampsService.publish(req.params.id, userId, role);
      sendSuccess(res, null, 'Published');
    } catch (e) { next(e); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      await bootcampsService.delete(req.params.id, userId, role);
      sendSuccess(res, null, 'Deleted');
    } catch (e) { next(e); }
  }

  async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const session = await bootcampsService.createSession(req.params.id, userId, role, req.body);
      sendCreated(res, { session }, 'Session created');
    } catch (e) { next(e); }
  }

  async enrollFree(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const enrollment = await bootcampsService.enrollFree(userId, req.params.id);
      sendCreated(res, { enrollment }, 'Enrolled');
    } catch (e) { next(e); }
  }

  async myEnrollments(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await bootcampsService.getMyEnrollments(userId, page, limit);
      sendSuccess(res, result.items, 'Enrollments', 200, result.meta);
    } catch (e) { next(e); }
  }

  async markAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { enrollmentId, sessionId } = req.params;
      const attendance = await bootcampsService.markAttendance(userId, enrollmentId, sessionId, req.body.durationMins ?? 0);
      sendSuccess(res, { attendance }, 'Attendance marked');
    } catch (e) { next(e); }
  }
}

export const bootcampsController = new BootcampsController();
