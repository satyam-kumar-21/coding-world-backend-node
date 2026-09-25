import { z } from 'zod';
import { DeveloperLevel, AvailabilityStatus } from '@prisma/client';

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).trim().optional(),
  lastName: z.string().min(1).max(50).trim().optional(),
  displayName: z.string().max(100).trim().optional().nullable(),
  bio: z.string().max(500).trim().optional().nullable(),
  location: z.string().max(100).trim().optional().nullable(),
  website: z.string().url('Invalid website URL').optional().nullable(),
  githubUrl: z.string().url('Invalid GitHub URL').optional().nullable(),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').optional().nullable(),
  twitterUrl: z.string().url('Invalid Twitter URL').optional().nullable(),
  currentRole: z.string().max(100).trim().optional().nullable(),
  company: z.string().max(100).trim().optional().nullable(),
  developerLevel: z.nativeEnum(DeveloperLevel).optional(),
  yearsOfExperience: z.number().int().min(0).max(50).optional().nullable(),
  availabilityStatus: z.nativeEnum(AvailabilityStatus).optional(),
  timezone: z.string().max(50).optional().nullable(),
  languages: z.array(z.string().max(50)).max(20).optional(),
  skills: z.array(z.string().max(50)).max(50).optional(),
  interests: z.array(z.string().max(50)).max(20).optional(),
});

export const updateUsernameSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .toLowerCase()
    .trim(),
});

export const updatePrivacySchema = z.object({
  showOnlineStatus: z.boolean().optional(),
  showInLiveDevelopers: z.boolean().optional(),
  showStatistics: z.boolean().optional(),
  showConnections: z.boolean().optional(),
  allowConnectionRequests: z.boolean().optional(),
  allowMessagesFrom: z.enum(['ALL', 'CONNECTIONS', 'NOBODY']).optional(),
  profileVisibility: z.enum(['PUBLIC', 'CONNECTIONS', 'PRIVATE']).optional(),
});

export const addEducationSchema = z.object({
  institution: z.string().min(1).max(200).trim(),
  degree: z.string().max(100).trim().optional().nullable(),
  field: z.string().max(100).trim().optional().nullable(),
  startYear: z.number().int().min(1950).max(new Date().getFullYear()),
  endYear: z.number().int().min(1950).max(new Date().getFullYear() + 10).optional().nullable(),
  isCurrent: z.boolean().optional(),
  description: z.string().max(500).trim().optional().nullable(),
});

export const userListQuerySchema = z.object({
  page: z.string().optional().transform(Number).default('1'),
  limit: z.string().optional().transform(Number).default('20'),
  search: z.string().optional(),
  skill: z.string().optional(),
  developerLevel: z.nativeEnum(DeveloperLevel).optional(),
  sortBy: z.enum(['createdAt', 'username']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateUsernameInput = z.infer<typeof updateUsernameSchema>;
export type UpdatePrivacyInput = z.infer<typeof updatePrivacySchema>;
export type AddEducationInput = z.infer<typeof addEducationSchema>;
