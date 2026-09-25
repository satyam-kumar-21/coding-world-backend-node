import { prisma } from '../../config/database';
import type { User, RefreshToken, EmailVerification, PasswordReset } from '@prisma/client';

export class AuthRepository {
  // ─── User lookups ─────────────────────────────────────────────
  async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { profile: true },
    });
  }

  async findUserByUsername(username: string) {
    return prisma.user.findFirst({
      where: { username, deletedAt: null },
    });
  }

  async findUserById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { profile: true },
    });
  }

  // ─── User creation ────────────────────────────────────────────
  async createUser(data: {
    email: string;
    username: string;
    passwordHash?: string;
    firstName: string;
    lastName: string;
  }) {
    return prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
        profile: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            displayName: `${data.firstName} ${data.lastName}`,
            privacySettings: { create: {} },
          },
        },
        gamification: { create: {} },
        streaks: { create: {} },
      },
      include: { profile: true },
    });
  }

  // ─── Password ─────────────────────────────────────────────────
  async updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash, updatedAt: new Date() },
    });
  }

  // ─── Email verification ───────────────────────────────────────
  async createEmailVerification(userId: string, token: string, expiresAt: Date) {
    return prisma.emailVerification.create({
      data: { userId, token, expiresAt },
    });
  }

  async findEmailVerification(token: string) {
    return prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async markEmailVerificationUsed(id: string) {
    return prisma.emailVerification.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async markEmailVerified(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });
  }

  // ─── Password reset ───────────────────────────────────────────
  async createPasswordReset(userId: string, token: string, expiresAt: Date, ipAddress?: string) {
    // Invalidate previous tokens
    await prisma.passwordReset.deleteMany({ where: { userId, usedAt: null } });
    return prisma.passwordReset.create({
      data: { userId, token, expiresAt, ipAddress },
    });
  }

  async findPasswordReset(token: string) {
    return prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async markPasswordResetUsed(id: string) {
    return prisma.passwordReset.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  // ─── Refresh tokens ───────────────────────────────────────────
  async createRefreshToken(data: {
    userId: string;
    token: string;
    family: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.refreshToken.create({ data });
  }

  async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { profile: true } } },
    });
  }

  async revokeRefreshToken(id: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { isRevoked: true },
    });
  }

  async revokeTokenFamily(family: string) {
    return prisma.refreshToken.updateMany({
      where: { family },
      data: { isRevoked: true },
    });
  }

  async revokeAllUserTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  async deleteExpiredTokens(userId: string) {
    return prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });
  }

  // ─── Account management ───────────────────────────────────────
  async deactivateUser(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { isDeactivated: true, deactivatedAt: new Date(), isActive: false },
    });
  }

  async softDeleteUser(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async updateLastSeen(userId: string) {
    return prisma.userProfile.updateMany({
      where: { userId },
      data: { lastSeenAt: new Date() },
    });
  }
}

export const authRepository = new AuthRepository();
