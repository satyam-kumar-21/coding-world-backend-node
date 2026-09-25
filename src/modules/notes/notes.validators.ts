import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z.string().max(200).trim().optional(),
  content: z.string().min(1).max(10000),
  courseId: z.string().uuid().optional(),
  lectureId: z.string().uuid().optional(),
  isPrivate: z.boolean().default(true),
});

export const updateNoteSchema = createNoteSchema.partial();

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
