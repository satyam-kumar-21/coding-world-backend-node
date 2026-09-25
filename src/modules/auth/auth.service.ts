import { v4 as uuidv4 } from 'uuid';
import { authRepository } from './auth.repository';
import { hashPassword, verifyPassword, generateSecureToken } from '../../utils/crypto';
import {
  signAccessToken,
  signRefreshToken,
  signEmailVerifyToken,
  signPasswordResetToken,
  verifyRefreshToken,
  verifyEmailVerifyToken,
  verifyPasswordResetToken,
  getTokenExpiry,
} from '../../utils/jwt';
import { generateUsername } from '../../utils/slugify';
import { enqueueEmail } from '../../lib/queue.service';
import { emailTemplates } from '../../lib/email.service';
import { redisService } from '../../lib/redis.service';
import { REDIS_KEYS } from '../../constants';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { AppError, ConflictError, UnauthorizedError, NotFoundError } from '../../middlewares/errorHandler';
import { HTTP_STATUS } from '../../constants';
import type { RegisterInput, LoginInput } from './auth.validators';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    isEmailVerified: boolean;
    profile: {
      firstName: string;
      lastName: string;
      displayName: string | null;
      avatar: string | null;
    } | null;
  };
  tokens: AuthTokens;
}

export class AuthService {
  // ─── Register ─────────────────────────────────────────────────
  async register(input: RegisterInput, ip?: string): Promise<AuthResponse> {
    // Check existing email
    const existingEmail = await authRepository.findUserByEmail(input.email);
    if (existingEmail) {
      throw new ConflictError('An account with this email already exists');
    }

    // Generate or validate username
    const username = input.username ?? generateUsername(input.email);
    const existingUsername = await authRepository.findUserByUsername(username);
    if (existingUsername) {
      throw new ConflictError('Username is already taken');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await authRepository.createUser({
      email: input.email,
      username,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    // Send verification email (async via queue)
    const verifyToken = signEmailVerifyToken(user.id, user.email);
    await authRepository.createEmailVerification(
      user.id,
      verifyToken,
      getTokenExpiry(env.JWT_EMAIL_VERIFY_EXPIRES_IN),
    );

    const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${verifyToken}`;
    await enqueueEmail({
      to: user.email,
      subject: 'Verify your Coding World account',
      html: emailTemplates.verificationEmail(
        user.profile?.firstName ?? input.firstName,
        verifyUrl,
      ),
    });

    logger.info({ userId: user.id, email: user.email }, 'User registered');

    const tokens = await this.generateTokenPair(user.id, ip);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  // ─── Login ────────────────────────────────────────────────────
  async login(input: LoginInput, ip?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await authRepository.findUserByEmail(input.email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive || user.deletedAt) {
      throw new UnauthorizedError('Account is deactivated or deleted');
    }

    const passwordValid = await verifyPassword(user.passwordHash, input.password);
    if (!passwordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last seen
    await authRepository.updateLastSeen(user.id);

    logger.info({ userId: user.id, ip }, 'User logged in');

    const tokens = await this.generateTokenPair(user.id, ip, userAgent);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  // ─── Refresh Token ────────────────────────────────────────────
  async refreshTokens(token: string, ip?: string): Promise<AuthTokens> {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const stored = await authRepository.findRefreshToken(token);

    if (!stored || stored.isRevoked) {
      // Token reuse detected — revoke entire family
      if (stored) {
        await authRepository.revokeTokenFamily(stored.family);
        logger.warn({ userId: stored.userId }, 'Refresh token reuse detected — family revoked');
      }
      throw new UnauthorizedError('Refresh token is invalid or has been revoked');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    if (!stored.user.isActive || stored.user.deletedAt) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Revoke current token (rotation)
    await authRepository.revokeRefreshToken(stored.id);

    // Issue new pair in same family
    return this.generateTokenPair(stored.userId, ip, undefined, stored.family);
  }

  // ─── Logout ───────────────────────────────────────────────────
  async logout(refreshToken: string): Promise<void> {
    const stored = await authRepository.findRefreshToken(refreshToken);
    if (stored) {
      await authRepository.revokeRefreshToken(stored.id);
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await authRepository.revokeAllUserTokens(userId);
  }

  // ─── Verify Email ─────────────────────────────────────────────
  async verifyEmail(token: string): Promise<void> {
    let payload;
    try {
      payload = verifyEmailVerifyToken(token);
    } catch {
      throw new AppError('Invalid or expired verification token', HTTP_STATUS.BAD_REQUEST);
    }

    const verification = await authRepository.findEmailVerification(token);

    if (!verification) {
      throw new AppError('Verification token not found', HTTP_STATUS.BAD_REQUEST);
    }
    if (verification.usedAt) {
      throw new AppError('Verification token already used', HTTP_STATUS.BAD_REQUEST);
    }
    if (verification.expiresAt < new Date()) {
      throw new AppError('Verification token has expired', HTTP_STATUS.BAD_REQUEST);
    }

    await authRepository.markEmailVerificationUsed(verification.id);
    await authRepository.markEmailVerified(payload.sub);

    // Send welcome email
    const user = verification.user;
    const welcomeUrl = `${env.CLIENT_URL}/dashboard`;
    await enqueueEmail({
      to: user.email,
      subject: 'Welcome to Coding World!',
      html: emailTemplates.welcomeEmail(
        user.email.split('@')[0],
        welcomeUrl,
      ),
    });

    logger.info({ userId: payload.sub }, 'Email verified');
  }

  // ─── Resend Verification ──────────────────────────────────────
  async resendVerification(email: string): Promise<void> {
    const user = await authRepository.findUserByEmail(email);
    if (!user) return; // Silent — do not reveal if email exists

    if (user.isEmailVerified) {
      throw new AppError('Email is already verified', HTTP_STATUS.BAD_REQUEST);
    }

    // Rate limit: check if a recent token exists in Redis
    const rlKey = `resend_verify:${user.id}`;
    const exists = await redisService.exists(rlKey);
    if (exists) {
      throw new AppError('Please wait before requesting another verification email', HTTP_STATUS.TOO_MANY_REQUESTS);
    }
    await redisService.set(rlKey, '1', 60); // 1 minute cooldown

    const verifyToken = signEmailVerifyToken(user.id, user.email);
    await authRepository.createEmailVerification(
      user.id,
      verifyToken,
      getTokenExpiry(env.JWT_EMAIL_VERIFY_EXPIRES_IN),
    );

    const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${verifyToken}`;
    await enqueueEmail({
      to: user.email,
      subject: 'Verify your Coding World account',
      html: emailTemplates.verificationEmail(user.email.split('@')[0], verifyUrl),
    });
  }

  // ─── Forgot Password ──────────────────────────────────────────
  async forgotPassword(email: string, ip?: string): Promise<void> {
    const user = await authRepository.findUserByEmail(email);
    if (!user) return; // Silent — never reveal if email exists

    const resetToken = signPasswordResetToken(user.id, user.email);
    await authRepository.createPasswordReset(
      user.id,
      resetToken,
      getTokenExpiry(env.JWT_PASSWORD_RESET_EXPIRES_IN),
      ip,
    );

    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
    await enqueueEmail({
      to: user.email,
      subject: 'Reset your Coding World password',
      html: emailTemplates.forgotPasswordEmail(user.email.split('@')[0], resetUrl),
    });

    logger.info({ userId: user.id, ip }, 'Password reset requested');
  }

  // ─── Reset Password ───────────────────────────────────────────
  async resetPassword(token: string, newPassword: string): Promise<void> {
    let payload;
    try {
      payload = verifyPasswordResetToken(token);
    } catch {
      throw new AppError('Invalid or expired reset token', HTTP_STATUS.BAD_REQUEST);
    }

    const reset = await authRepository.findPasswordReset(token);
    if (!reset) throw new AppError('Reset token not found', HTTP_STATUS.BAD_REQUEST);
    if (reset.usedAt) throw new AppError('Reset token already used', HTTP_STATUS.BAD_REQUEST);
    if (reset.expiresAt < new Date()) throw new AppError('Reset token has expired', HTTP_STATUS.BAD_REQUEST);

    const passwordHash = await hashPassword(newPassword);
    await authRepository.updatePassword(payload.sub, passwordHash);
    await authRepository.markPasswordResetUsed(reset.id);
    await authRepository.revokeAllUserTokens(payload.sub);

    await enqueueEmail({
      to: reset.user.email,
      subject: 'Your Coding World password was changed',
      html: emailTemplates.passwordChangedEmail(reset.user.email.split('@')[0]),
    });

    logger.info({ userId: payload.sub }, 'Password reset completed');
  }

  // ─── Change Password ──────────────────────────────────────────
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');
    if (!user.passwordHash) throw new AppError('Account uses social login', HTTP_STATUS.BAD_REQUEST);

    const valid = await verifyPassword(user.passwordHash, currentPassword);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');

    const passwordHash = await hashPassword(newPassword);
    await authRepository.updatePassword(userId, passwordHash);
    await authRepository.revokeAllUserTokens(userId);

    await enqueueEmail({
      to: user.email,
      subject: 'Your Coding World password was changed',
      html: emailTemplates.passwordChangedEmail(user.email.split('@')[0]),
    });

    logger.info({ userId }, 'Password changed');
  }

  // ─── Get current user ─────────────────────────────────────────
  async getCurrentUser(userId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');
    return this.sanitizeUser(user);
  }

  // ─── Account deactivation ─────────────────────────────────────
  async deactivateAccount(userId: string): Promise<void> {
    await authRepository.deactivateUser(userId);
    await authRepository.revokeAllUserTokens(userId);
    logger.info({ userId }, 'Account deactivated');
  }

  async deleteAccount(userId: string): Promise<void> {
    await authRepository.softDeleteUser(userId);
    await authRepository.revokeAllUserTokens(userId);
    logger.info({ userId }, 'Account deleted');
  }

  // ─── Private helpers ──────────────────────────────────────────
  private async generateTokenPair(
    userId: string,
    ip?: string,
    userAgent?: string,
    existingFamily?: string,
  ): Promise<AuthTokens> {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found');

    const family = existingFamily ?? uuidv4();
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    });
    const refreshToken = signRefreshToken(userId, family);
    const expiresAt = getTokenExpiry(env.JWT_REFRESH_EXPIRES_IN);

    await authRepository.createRefreshToken({
      userId,
      token: refreshToken,
      family,
      expiresAt,
      ipAddress: ip,
      userAgent,
    });

    // Clean up expired tokens periodically
    await authRepository.deleteExpiredTokens(userId);

    const accessExpiresIn = env.JWT_ACCESS_EXPIRES_IN;
    const match = accessExpiresIn.match(/^(\d+)([smhd])$/);
    const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    const expiresIn = match ? parseInt(match[1]) * (units[match[2]] ?? 60) : 900;

    return { accessToken, refreshToken, expiresIn };
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    username: string;
    role: string;
    isEmailVerified: boolean;
    profile?: {
      firstName: string;
      lastName: string;
      displayName: string | null;
      avatar: string | null;
    } | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      profile: user.profile
        ? {
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            displayName: user.profile.displayName,
            avatar: user.profile.avatar,
          }
        : null,
    };
  }
}

export const authService = new AuthService();
