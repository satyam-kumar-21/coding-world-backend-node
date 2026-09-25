import { prisma } from '../../config/database';
import type { UpdateProfileInput, UpdatePrivacyInput, AddEducationInput } from './users.validators';

const publicProfileSelect = {
  id: true,
  username: true,
  role: true,
  isEmailVerified: true,
  createdAt: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
      displayName: true,
      avatar: true,
      bio: true,
      location: true,
      website: true,
      githubUrl: true,
      linkedinUrl: true,
      twitterUrl: true,
      currentRole: true,
      company: true,
      developerLevel: true,
      yearsOfExperience: true,
      availabilityStatus: true,
      isOnline: true,
      skills: true,
      languages: true,
      interests: true,
      isLiveEnabled: true,
    },
  },
  gamification: {
    select: {
      totalXp: true,
      level: true,
      levelTitle: true,
      problemsSolved: true,
      coursesCompleted: true,
      globalRank: true,
    },
  },
  _count: {
    select: {
      sentConnections: true,
      receivedConnections: true,
      posts: true,
    },
  },
};

export class UsersRepository {
  async findById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null, isActive: true },
      select: {
        ...publicProfileSelect,
        email: true,
        profile: {
          include: {
            privacySettings: true,
            educations: true,
          },
        },
      },
    });
  }

  async findByUsername(username: string) {
    return prisma.user.findFirst({
      where: { username, deletedAt: null, isActive: true },
      select: publicProfileSelect,
    });
  }

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const { firstName, lastName, displayName, ...rest } = data;
    return prisma.userProfile.update({
      where: { userId },
      data: {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(displayName !== undefined ? { displayName } : {}),
        ...rest,
      },
    });
  }

  async updateUsername(userId: string, username: string) {
    const existing = await prisma.user.findFirst({
      where: { username, id: { not: userId } },
    });
    if (existing) return null;
    return prisma.user.update({
      where: { id: userId },
      data: { username },
    });
  }

  async updateAvatar(userId: string, avatarUrl: string, fileId?: string) {
    return prisma.userProfile.update({
      where: { userId },
      data: { avatar: avatarUrl, avatarFileId: fileId },
    });
  }

  async updatePrivacy(userId: string, data: UpdatePrivacyInput) {
    return prisma.profilePrivacySettings.upsert({
      where: { profileId: (await prisma.userProfile.findUnique({ where: { userId }, select: { id: true } }))?.id ?? '' },
      update: data,
      create: {
        profile: { connect: { userId } },
        ...data,
      },
    });
  }

  async addEducation(userId: string, data: AddEducationInput) {
    const profile = await prisma.userProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) return null;
    return prisma.education.create({
      data: { profileId: profile.id, ...data },
    });
  }

  async deleteEducation(userId: string, educationId: string) {
    const profile = await prisma.userProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) return null;
    return prisma.education.deleteMany({
      where: { id: educationId, profileId: profile.id },
    });
  }

  async updateOnlineStatus(userId: string, isOnline: boolean) {
    return prisma.userProfile.updateMany({
      where: { userId },
      data: { isOnline, lastSeenAt: isOnline ? undefined : new Date() },
    });
  }

  async listUsers(params: {
    page: number;
    limit: number;
    search?: string;
    skill?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page, limit, search, skill, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      isActive: true,
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' as const } },
              { profile: { firstName: { contains: search, mode: 'insensitive' as const } } },
              { profile: { lastName: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
      ...(skill ? { profile: { skills: { has: skill } } } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy === 'username' ? { username: sortOrder } : { createdAt: sortOrder },
        select: publicProfileSelect,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async getUserStats(userId: string) {
    const [gamification, streak, submissions, enrollments] = await Promise.all([
      prisma.userGamification.findUnique({ where: { userId } }),
      prisma.userStreak.findUnique({ where: { userId } }),
      prisma.submission.count({ where: { userId, status: 'ACCEPTED' } }),
      prisma.courseEnrollment.count({ where: { userId, isActive: true } }),
    ]);
    return { gamification, streak, submissions, enrollments };
  }
}

export const usersRepository = new UsersRepository();
