// Set required env vars before imports
process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-chars-long!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long!';
process.env.JWT_EMAIL_VERIFY_SECRET = 'test-email-secret';
process.env.JWT_PASSWORD_RESET_SECRET = 'test-reset-secret';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.JWT_EMAIL_VERIFY_EXPIRES_IN = '24h';
process.env.JWT_PASSWORD_RESET_EXPIRES_IN = '1h';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signEmailVerifyToken,
  verifyEmailVerifyToken,
  getTokenExpiry,
} from '../../../src/utils/jwt';
import { Role } from '@prisma/client';

describe('JWT Utils', () => {
  const userPayload = {
    userId: 'user-uuid-123',
    email: 'test@example.com',
    role: Role.USER,
    username: 'testuser',
  };

  describe('Access Token', () => {
    it('signs and verifies access token', () => {
      const token = signAccessToken(userPayload);
      const payload = verifyAccessToken(token);
      expect(payload.sub).toBe(userPayload.userId);
      expect(payload.email).toBe(userPayload.email);
      expect(payload.role).toBe(userPayload.role);
      expect(payload.type).toBe('access');
    });

    it('throws on tampered token', () => {
      const token = signAccessToken(userPayload);
      expect(() => verifyAccessToken(token + 'tampered')).toThrow();
    });
  });

  describe('Refresh Token', () => {
    it('signs and verifies refresh token', () => {
      const family = 'family-uuid-456';
      const token = signRefreshToken(userPayload.userId, family);
      const payload = verifyRefreshToken(token);
      expect(payload.sub).toBe(userPayload.userId);
      expect(payload.family).toBe(family);
      expect(payload.type).toBe('refresh');
    });
  });

  describe('Email Verify Token', () => {
    it('signs and verifies email token', () => {
      const token = signEmailVerifyToken(userPayload.userId, userPayload.email);
      const payload = verifyEmailVerifyToken(token);
      expect(payload.sub).toBe(userPayload.userId);
      expect(payload.type).toBe('email_verify');
    });
  });

  describe('getTokenExpiry', () => {
    it('returns future date for 15m', () => {
      const expiry = getTokenExpiry('15m');
      expect(expiry.getTime()).toBeGreaterThan(Date.now());
    });

    it('returns future date for 7d', () => {
      const expiry = getTokenExpiry('7d');
      const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
      expect(expiry.getTime()).toBeLessThanOrEqual(sevenDays + 1000);
      expect(expiry.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
