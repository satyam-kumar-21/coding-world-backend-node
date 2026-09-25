import pino from 'pino';
import { env, isProduction } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(isProduction
    ? {
        // Production: structured JSON
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        redact: {
          paths: [
            'password',
            'passwordHash',
            'token',
            'accessToken',
            'refreshToken',
            'authorization',
            'cookie',
            'req.headers.authorization',
            'req.headers.cookie',
            'body.password',
            'body.passwordHash',
          ],
          remove: true,
        },
      }
    : {
        // Development: pretty-print
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }),
});

export type Logger = typeof logger;
