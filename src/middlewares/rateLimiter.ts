import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedisClient } from '../config/redis';
import { env } from '../config/env';
import { HTTP_STATUS } from '../constants';

function createRedisStore(prefix: string) {
  return new RedisStore({
    sendCommand: (...args: string[]) => getRedisClient().call(...args) as Promise<unknown>,
    prefix: `rl:${prefix}:`,
  });
}

// ─── General API rate limiter ─────────────────────────────────────────────────
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('api'),
  handler: (_req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Too many requests. Please try again later.',
    });
  },
  skip: (req) => req.path === '/health',
});

// ─── Auth endpoints (strict) ──────────────────────────────────────────────────
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('auth'),
  handler: (_req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    });
  },
});

// ─── Password reset (very strict) ────────────────────────────────────────────
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('pwd-reset'),
  handler: (_req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Too many password reset attempts. Try again in 1 hour.',
    });
  },
});

// ─── File upload limiter ──────────────────────────────────────────────────────
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('upload'),
  handler: (_req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Upload limit reached. Please try again later.',
    });
  },
});

// ─── Code submission limiter ──────────────────────────────────────────────────
export const submissionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('submission'),
  handler: (_req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Submission limit reached. Max 10 per minute.',
    });
  },
});
