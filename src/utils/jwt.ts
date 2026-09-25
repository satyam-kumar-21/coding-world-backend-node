import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type {
  JwtAccessPayload,
  JwtRefreshPayload,
  JwtEmailPayload,
  JwtPasswordResetPayload,
} from '../types';
import { Role } from '@prisma/client';

// ─── Access Token ─────────────────────────────────────────────────────────────

export function signAccessToken(payload: {
  userId: string;
  email: string;
  role: Role;
  username: string;
}): string {
  return jwt.sign(
    {
      sub: payload.userId,
      email: payload.email,
      role: payload.role,
      username: payload.username,
      type: 'access',
    } satisfies JwtAccessPayload,
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );
}

export function verifyAccessToken(token: string): JwtAccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

export function signRefreshToken(userId: string, family: string): string {
  return jwt.sign(
    { sub: userId, family, type: 'refresh' } satisfies JwtRefreshPayload,
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtRefreshPayload;
}

// ─── Email Verify Token ───────────────────────────────────────────────────────

export function signEmailVerifyToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email, type: 'email_verify' } satisfies JwtEmailPayload,
    env.JWT_EMAIL_VERIFY_SECRET,
    { expiresIn: env.JWT_EMAIL_VERIFY_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );
}

export function verifyEmailVerifyToken(token: string): JwtEmailPayload {
  return jwt.verify(token, env.JWT_EMAIL_VERIFY_SECRET) as JwtEmailPayload;
}

// ─── Password Reset Token ─────────────────────────────────────────────────────

export function signPasswordResetToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email, type: 'password_reset' } satisfies JwtPasswordResetPayload,
    env.JWT_PASSWORD_RESET_SECRET,
    { expiresIn: env.JWT_PASSWORD_RESET_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );
}

export function verifyPasswordResetToken(token: string): JwtPasswordResetPayload {
  return jwt.verify(token, env.JWT_PASSWORD_RESET_SECRET) as JwtPasswordResetPayload;
}

// ─── Decode without verify ────────────────────────────────────────────────────

export function decodeToken(token: string): jwt.JwtPayload | null {
  const decoded = jwt.decode(token);
  return typeof decoded === 'object' ? decoded : null;
}

export function getTokenExpiry(expiresIn: string): Date {
  const units: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 15 * 60 * 1000);
  const [, num, unit] = match;
  return new Date(Date.now() + parseInt(num) * (units[unit] ?? 1000));
}
