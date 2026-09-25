import { z } from 'zod';

export const createSubmissionSchema = z.object({
  problemId: z.string().uuid(),
  language: z.string().min(1).max(50),
  sourceCode: z.string().min(1).max(100000),
  isPublic: z.boolean().default(false),
});

export const submissionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  problemId: z.string().uuid().optional(),
  status: z.string().optional(),
  language: z.string().optional(),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
