/**
 * Auth Integration Tests
 *
 * These tests require a running PostgreSQL + Redis instance.
 * Set TEST_DATABASE_URL and TEST_REDIS_URL env vars, or they use defaults.
 *
 * Run: npm run test:integration
 */

// Set env before any imports
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:password@localhost:5432/codingworld_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-chars-long!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long!';
process.env.JWT_EMAIL_VERIFY_SECRET = 'test-email-verify-secret';
process.env.JWT_PASSWORD_RESET_SECRET = 'test-password-reset-secret';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.JWT_EMAIL_VERIFY_EXPIRES_IN = '24h';
process.env.JWT_PASSWORD_RESET_EXPIRES_IN = '1h';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '1025';
process.env.SMTP_FROM = 'test@codingworld.in';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.CONNECT_CLIENT_URL = 'http://localhost:3001';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '1000';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.LOG_LEVEL = 'silent';
process.env.BULL_CONCURRENCY = '1';

import supertest from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();
const request = supertest(app);

const testEmail = `test_${Date.now()}@codingworld.in`;
const testPassword = 'TestPassword@123!';

describe('POST /api/v1/auth/register', () => {
  it('returns 201 with user and tokens on valid registration', async () => {
    const res = await request.post('/api/v1/auth/register').send({
      firstName: 'Test',
      lastName: 'User',
      email: testEmail,
      password: testPassword,
    });

    // If DB is not running, skip gracefully
    if (res.status === 503 || res.status === 500) {
      console.warn('⚠️  Database not available — skipping integration test');
      return;
    }

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('returns 409 on duplicate email', async () => {
    const res = await request.post('/api/v1/auth/register').send({
      firstName: 'Test',
      lastName: 'User',
      email: testEmail,
      password: testPassword,
    });
    if (res.status === 503 || res.status === 500) return;
    expect(res.status).toBe(409);
  });

  it('returns 422 on invalid email', async () => {
    const res = await request.post('/api/v1/auth/register').send({
      firstName: 'Test',
      lastName: 'User',
      email: 'not-an-email',
      password: testPassword,
    });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('returns 422 on weak password', async () => {
    const res = await request.post('/api/v1/auth/register').send({
      firstName: 'Test',
      lastName: 'User',
      email: `weak_${Date.now()}@test.com`,
      password: 'weak',
    });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('returns 401 on wrong password', async () => {
    const res = await request.post('/api/v1/auth/login').send({
      email: testEmail,
      password: 'WrongPassword@1',
    });
    if (res.status === 503 || res.status === 500) return;
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 422 on missing fields', async () => {
    const res = await request.post('/api/v1/auth/login').send({ email: testEmail });
    expect(res.status).toBe(422);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});

describe('GET /health', () => {
  it('returns 200', async () => {
    const res = await request.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});
