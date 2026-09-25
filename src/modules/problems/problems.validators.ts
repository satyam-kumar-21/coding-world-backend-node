import { z } from 'zod';
import { ProblemDifficulty, ProblemType, ProblemCategory } from '@prisma/client';

export const createProblemSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().min(10).max(50000),
  difficulty: z.nativeEnum(ProblemDifficulty).default(ProblemDifficulty.EASY),
  type: z.nativeEnum(ProblemType).default(ProblemType.CODING),
  category: z.nativeEnum(ProblemCategory).default(ProblemCategory.DSA),
  constraints: z.string().max(2000).optional(),
  examples: z.array(z.object({
    input: z.string(),
    output: z.string(),
    explanation: z.string().optional(),
  })).optional(),
  starterCode: z.record(z.string()).optional(), // { javascript: '...', python: '...' }
  supportedLanguages: z.array(z.string()).max(20).default([]),
  timeLimitMs: z.number().int().min(100).max(30000).default(2000),
  memoryLimitMb: z.number().int().min(16).max(1024).default(256),
  testCases: z.array(z.object({ input: z.string(), expectedOutput: z.string() })).optional(),
  hiddenTestCases: z.array(z.object({ input: z.string(), expectedOutput: z.string() })).optional(),
  explanation: z.string().max(10000).optional(),
  editorial: z.string().max(10000).optional(),
  xpReward: z.number().int().min(0).default(10),
  tagIds: z.array(z.string().uuid()).max(10).optional(),
});

export const updateProblemSchema = createProblemSchema.partial();

export const problemQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  difficulty: z.nativeEnum(ProblemDifficulty).optional(),
  category: z.nativeEnum(ProblemCategory).optional(),
  type: z.nativeEnum(ProblemType).optional(),
  tagId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'difficulty', 'totalSubmissions']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateProblemInput = z.infer<typeof createProblemSchema>;
export type ProblemQueryInput = z.infer<typeof problemQuerySchema>;
