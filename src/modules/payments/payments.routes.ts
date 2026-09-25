import { Router } from 'express';
import { paymentsController } from './payments.controller';
import { authenticate } from '../../middlewares/authenticate';
import { validateBody } from '../../middlewares/validate';
import { createOrderSchema, verifyPaymentSchema } from './payments.validators';
import express from 'express';

const router = Router();

// Webhook needs raw body — must be before json parser on this route
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res, next) => paymentsController.webhook(req, res, next));

// Protected
router.post('/orders', authenticate, validateBody(createOrderSchema), (req, res, next) => paymentsController.createOrder(req, res, next));
router.post('/verify', authenticate, validateBody(verifyPaymentSchema), (req, res, next) => paymentsController.verifyPayment(req, res, next));
router.get('/orders', authenticate, (req, res, next) => paymentsController.getOrders(req, res, next));
router.get('/orders/:orderId', authenticate, (req, res, next) => paymentsController.getOrder(req, res, next));
router.get('/transactions', authenticate, (req, res, next) => paymentsController.getTransactions(req, res, next));

export default router;
