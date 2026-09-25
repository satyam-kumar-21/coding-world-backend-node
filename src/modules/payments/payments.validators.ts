import { z } from 'zod';

export const createOrderSchema = z.object({
  items: z.array(z.object({
    courseId: z.string().uuid().optional(),
    bootcampId: z.string().uuid().optional(),
  })).min(1).max(10),
  couponCode: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const webhookSchema = z.object({
  event: z.string(),
  payload: z.record(z.unknown()),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
