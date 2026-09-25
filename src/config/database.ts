import { PrismaClient } from '@prisma/client';
import { env, isProduction } from './env';
import { logger } from './logger';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: isProduction
      ? ['error']
      : [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ],
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;

  // Log slow queries in dev
  (prisma as PrismaClient & { $on: Function }).$on('query', (e: { query: string; duration: number }) => {
    if (e.duration > 500) {
      logger.warn({ query: e.query, duration: e.duration }, 'Slow Prisma query');
    }
  });
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected via Prisma');
  } catch (error) {
    logger.error({ error }, '❌ Failed to connect to PostgreSQL');
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('PostgreSQL disconnected');
}
