import { z } from 'zod';
import { CourseLevel, CourseStatus, LectureType } from '@prisma/client';

export const createCourseSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().min(20).max(5000).trim(),
  shortDescription: z.string().max(300).trim().optional(),
  price: z.number().min(0).default(0),
  discountPrice: z.number().min(0).optional().nullable(),
  isFree: z.boolean().optional(),
  level: z.nativeEnum(CourseLevel).default(CourseLevel.BEGINNER),
  language: z.string().max(50).default('English'),
  categoryId: z.string().uuid().optional().nullable(),
  requirements: z.array(z.string().max(200)).max(20).optional(),
  learningOutcomes: z.array(z.string().max(200)).max(20).optional(),
  tagIds: z.array(z.string().uuid()).max(10).optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

export const createSectionSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateSectionSchema = createSectionSchema.partial();

export const reorderSectionsSchema = z.object({
  sections: z.array(
    z.object({ id: z.string().uuid(), sortOrder: z.number().int().min(0) }),
  ),
});

export const createLectureSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  type: z.nativeEnum(LectureType).default(LectureType.VIDEO),
  videoUrl: z.string().url().optional().nullable(),
  videoDuration: z.number().int().min(0).optional().nullable(),
  content: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isPreview: z.boolean().optional(),
});

export const updateLectureSchema = createLectureSchema.partial();

export const reorderLecturesSchema = z.object({
  lectures: z.array(
    z.object({ id: z.string().uuid(), sortOrder: z.number().int().min(0) }),
  ),
});

export const courseReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(150).optional(),
  body: z.string().max(2000).optional(),
});

export const courseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  level: z.nativeEnum(CourseLevel).optional(),
  isFree: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'price', 'averageRating', 'totalEnrollments']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const lectureProgressSchema = z.object({
  watchedSeconds: z.number().int().min(0).optional(),
  isCompleted: z.boolean().optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type CreateLectureInput = z.infer<typeof createLectureSchema>;
export type CourseReviewInput = z.infer<typeof courseReviewSchema>;
export type CourseQueryInput = z.infer<typeof courseQuerySchema>;
export type LectureProgressInput = z.infer<typeof lectureProgressSchema>;
