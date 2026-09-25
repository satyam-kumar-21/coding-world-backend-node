import pinoHttp from 'pino-http';
import { logger } from '../config/logger';
import { isProduction } from '../config/env';

export const requestLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        ip: req.headers['x-forwarded-for'] ?? req.remoteAddress,
      };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
  redact: isProduction
    ? ['req.headers.authorization', 'req.headers.cookie', 'req.body.password']
    : [],
});
