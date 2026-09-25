import { prisma } from '../src/config/database';

// Global test setup
beforeAll(async () => {
  // Ensure test database connection
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Silence logger in tests
jest.mock('../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
  },
}));
