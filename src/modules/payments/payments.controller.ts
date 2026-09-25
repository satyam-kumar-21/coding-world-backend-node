import { Request, Response, NextFunction } from 'express';
import { paymentsService } from './payments.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { parsePaginationQuery } from '../../utils/pagination';
import type { AuthenticatedRequest } from '../../types';
import type { CreateOrderInput, VerifyPaymentInput } from './payments.validators';

export class PaymentsController {
  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const result = await paymentsService.createOrder(userId, req.body as CreateOrderInput);
      sendCreated(res, result, 'Order created');
    } catch (e) { next(e); }
  }

  async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const result = await paymentsService.verifyPayment(userId, req.body as VerifyPaymentInput);
      sendSuccess(res, result, 'Payment verified');
    } catch (e) { next(e); }
  }

  async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const sig = req.headers['x-razorpay-signature'] as string;
      const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body);
      const result = await paymentsService.handleWebhook(rawBody, sig);
      sendSuccess(res, result, 'Webhook received');
    } catch (e) { next(e); }
  }

  async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await paymentsService.getUserOrders(userId, page, limit);
      sendSuccess(res, result.items, 'Orders', 200, result.meta);
    } catch (e) { next(e); }
  }

  async getOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const order = await paymentsService.getOrder(userId, req.params.orderId);
      sendSuccess(res, { order });
    } catch (e) { next(e); }
  }

  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { page, limit } = parsePaginationQuery(req.query);
      const result = await paymentsService.getTransactions(userId, page, limit);
      sendSuccess(res, result.items, 'Transactions', 200, result.meta);
    } catch (e) { next(e); }
  }
}

export const paymentsController = new PaymentsController();
