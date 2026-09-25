import { z } from 'zod';
import { BootcampStatus } from '@prisma/client';

export const createBootcampSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().min(20).max(5000).trim(),
  shortDescription: z.string().max(300).optional(),
  price: z.number().min(0).default(0),
  isFree: z.boolean().optional(),
  capacity: z.number().int().min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  requirements: z.array(z.string().max(200)).max(20).optional(),
});

export const updateBootcampSchema = createBootcampSchema.partial();

export const createSessionSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  meetingUrl: z.string().url().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type CreateBootcampInput = z.infer<typeof createBootcampSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
