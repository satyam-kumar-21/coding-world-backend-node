import { prisma } from '../../config/database';
import { generateOrderNumber } from '../../utils/crypto';
import { verifyRazorpaySignature } from '../../utils/crypto';
import { enqueueEmail, enqueueNotification } from '../../lib/queue.service';
import { emailTemplates } from '../../lib/email.service';
import { buildPaginatedResult } from '../../utils/pagination';
import { AppError, NotFoundError, ForbiddenError } from '../../middlewares/errorHandler';
import { HTTP_STATUS } from '../../constants';
import { env } from '../../config/env';
import { coursesRepository } from '../courses/courses.repository';
import type { CreateOrderInput, VerifyPaymentInput } from './payments.validators';
import { Decimal } from '@prisma/client/runtime/library';

// Razorpay SDK is optional — loaded only when credentials exist
function getRazorpay() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Razorpay = require('razorpay');
  return new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
}

export class PaymentsService {
  // ─── Create order ─────────────────────────────────────────────
  async createOrder(userId: string, input: CreateOrderInput) {
    // Fetch real prices from DB — never trust client prices
    let subtotal = new Decimal(0);
    const enrichedItems: { courseId?: string; bootcampId?: string; title: string; price: Decimal }[] = [];

    for (const item of input.items) {
      if (item.courseId) {
        const course = await prisma.course.findFirst({
          where: { id: item.courseId, deletedAt: null },
          select: { id: true, title: true, price: true, discountPrice: true, isFree: true },
        });
        if (!course) throw new NotFoundError(`Course ${item.courseId} not found`);
        if (course.isFree) throw new AppError('Free courses do not require payment', HTTP_STATUS.BAD_REQUEST);
        const effectivePrice = course.discountPrice ?? course.price;
        subtotal = subtotal.add(effectivePrice);
        enrichedItems.push({ courseId: course.id, title: course.title, price: effectivePrice });
      } else if (item.bootcampId) {
        const bootcamp = await prisma.bootcamp.findFirst({
          where: { id: item.bootcampId, deletedAt: null },
          select: { id: true, title: true, price: true, isFree: true },
        });
        if (!bootcamp) throw new NotFoundError(`Bootcamp ${item.bootcampId} not found`);
        if (bootcamp.isFree) throw new AppError('Free bootcamps do not require payment', HTTP_STATUS.BAD_REQUEST);
        subtotal = subtotal.add(bootcamp.price);
        enrichedItems.push({ bootcampId: bootcamp.id, title: bootcamp.title, price: bootcamp.price });
      }
    }

    const tax = subtotal.mul(new Decimal('0.00')); // GST can be added here
    const total = subtotal.add(tax);

    // Create internal order
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        subtotal,
        tax,
        total,
        items: {
          create: enrichedItems.map(i => ({
            courseId: i.courseId,
            bootcampId: i.bootcampId,
            title: i.title,
            price: i.price,
          })),
        },
      },
      include: { items: true },
    });

    // Create Razorpay order if configured
    const razorpay = getRazorpay();
    let razorpayOrder = null;
    if (razorpay) {
      razorpayOrder = await razorpay.orders.create({
        amount: Math.round(total.toNumber() * 100), // paise
        currency: 'INR',
        receipt: order.orderNumber,
        notes: { orderId: order.id, userId },
      });
      // Create pending transaction
      await prisma.transaction.create({
        data: {
          orderId: order.id,
          userId,
          provider: 'RAZORPAY',
          providerOrderId: razorpayOrder.id,
          status: 'PENDING',
          amount: total,
          currency: 'INR',
        },
      });
    }

    return { order, razorpayOrder, keyId: env.RAZORPAY_KEY_ID };
  }

  // ─── Verify payment ───────────────────────────────────────────
  async verifyPayment(userId: string, input: VerifyPaymentInput) {
    if (!env.RAZORPAY_KEY_SECRET) throw new AppError('Payment not configured', HTTP_STATUS.SERVICE_UNAVAILABLE);

    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = input;

    // Verify signature server-side
    const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, env.RAZORPAY_KEY_SECRET);
    if (!isValid) throw new AppError('Invalid payment signature', HTTP_STATUS.BAD_REQUEST);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: { include: { profile: true } } },
    });
    if (!order) throw new NotFoundError('Order not found');
    if (order.userId !== userId) throw new ForbiddenError('Not your order');
    if (order.status === 'PAID') throw new AppError('Order already processed', HTTP_STATUS.CONFLICT);

    // Update transaction
    await prisma.transaction.updateMany({
      where: { orderId, providerOrderId: razorpayOrderId },
      data: {
        providerPaymentId: razorpayPaymentId,
        providerSignature: razorpaySignature,
        status: 'COMPLETED',
      },
    });

    // Update order
    await prisma.order.update({ where: { id: orderId }, data: { status: 'PAID' } });

    // Grant enrollments
    for (const item of order.items) {
      if (item.courseId) {
        const existing = await prisma.courseEnrollment.findUnique({
          where: { userId_courseId: { userId, courseId: item.courseId } },
        });
        if (!existing) {
          await coursesRepository.createEnrollment(userId, item.courseId, orderId);
        }
      }
      if (item.bootcampId) {
        const existing = await prisma.bootcampEnrollment.findUnique({
          where: { userId_bootcampId: { userId, bootcampId: item.bootcampId } },
        });
        if (!existing) {
          await prisma.bootcampEnrollment.create({ data: { userId, bootcampId: item.bootcampId, orderId } });
        }
      }
    }

    // Send receipt email
    const user = order.user;
    if (user) {
      await enqueueEmail({
        to: user.email,
        subject: `Payment confirmed – Order #${order.orderNumber}`,
        html: emailTemplates.paymentReceiptEmail(
          user.profile?.firstName ?? user.username,
          order.orderNumber,
          order.total.toString(),
          order.items.map(i => i.title),
        ),
      });
      await enqueueNotification({
        userId,
        type: 'PAYMENT_SUCCESS',
        title: 'Payment Successful',
        message: `Your order #${order.orderNumber} is confirmed.`,
        entityId: order.id,
        entityType: 'ORDER',
      });
    }

    return { order, message: 'Payment verified and access granted' };
  }

  // ─── Webhook ──────────────────────────────────────────────────
  async handleWebhook(rawBody: string, signature: string) {
    if (!env.RAZORPAY_WEBHOOK_SECRET) return;
    const { verifyHmacSignature } = await import('../../utils/crypto');
    const isValid = verifyHmacSignature(rawBody, env.RAZORPAY_WEBHOOK_SECRET, signature);
    if (!isValid) throw new AppError('Invalid webhook signature', HTTP_STATUS.BAD_REQUEST);
    // Parse and handle events — log for now
    const event = JSON.parse(rawBody) as { event: string };
    // Future: handle payment.failed, refund.created, etc.
    return { received: true, event: event.event };
  }

  // ─── Transaction history ──────────────────────────────────────
  async getTransactions(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { order: { include: { items: true } } },
      }),
      prisma.transaction.count({ where: { userId } }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async getOrder(userId: string, orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, transactions: true },
    });
    if (!order) throw new NotFoundError('Order not found');
    if (order.userId !== userId) throw new ForbiddenError('Not your order');
    return order;
  }

  async getUserOrders(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      prisma.order.count({ where: { userId } }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }
}

export const paymentsService = new PaymentsService();
