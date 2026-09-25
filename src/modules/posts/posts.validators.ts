import { z } from 'zod';
import { PostType, PostVisibility } from '@prisma/client';

export const createPostSchema = z.object({
  type: z.nativeEnum(PostType).default(PostType.TEXT),
  content: z.string().min(1).max(5000).optional(),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  linkUrl: z.string().url().optional(),
  visibility: z.nativeEnum(PostVisibility).default(PostVisibility.PUBLIC),
  tags: z.array(z.string().max(50)).max(10).optional(),
  pollOptions: z.array(z.object({ text: z.string().min(1).max(150) })).min(2).max(6).optional(),
});

export const updatePostSchema = createPostSchema.partial();

export const postQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
  type: z.nativeEnum(PostType).optional(),
  tag: z.string().optional(),
  authorId: z.string().uuid().optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type PostQueryInput = z.infer<typeof postQuerySchema>;
