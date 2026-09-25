import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  APP_NAME: z.string().default('CodingWorld'),
  APP_URL: z.string().default('http://localhost:5000'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_EMAIL_VERIFY_SECRET: z.string().min(1).default('email-verify-secret-change-me'),
  JWT_EMAIL_VERIFY_EXPIRES_IN: z.string().default('24h'),
  JWT_PASSWORD_RESET_SECRET: z.string().min(1).default('password-reset-secret-change-me'),
  JWT_PASSWORD_RESET_EXPIRES_IN: z.string().default('1h'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().optional(),

  // AWS S3
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().default('codingworld-storage'),
  AWS_S3_ENDPOINT: z.string().optional(),

  // SMTP
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_SECURE: z.string().default('false').transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('Coding World <noreply@codingworld.in>'),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // CORS
  CLIENT_URL: z.string().default('https://www.codingworld.in'),
  CONNECT_CLIENT_URL: z.string().default('https://connect.codingworld.in'),
  CORS_ORIGINS: z.string().default('https://www.codingworld.in,https://connect.codingworld.in,http://localhost:3000,http://localhost:3001'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  AUTH_RATE_LIMIT_MAX: z.string().default('10').transform(Number),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Seed
  SEED_ADMIN_EMAIL: z.string().email().default('admin@codingworld.in'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('Admin@CodingWorld2024!'),

  // Code execution
  CODE_EXECUTION_SERVICE_URL: z.string().optional(),
  CODE_EXECUTION_API_KEY: z.string().optional(),
  CODE_EXECUTION_TIMEOUT: z.string().default('10000').transform(Number),

  // BullMQ
  BULL_CONCURRENCY: z.string().default('5').transform(Number),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

export const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
