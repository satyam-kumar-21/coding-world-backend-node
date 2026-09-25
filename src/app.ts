import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import { corsOrigins, env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { requestLogger } from './middlewares/requestLogger';
import { apiRateLimiter } from './middlewares/rateLimiter';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { APP } from './constants';

// ─── Route imports ────────────────────────────────────────────
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import coursesRoutes from './modules/courses/courses.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import notesRoutes from './modules/notes/notes.routes';
import bootcampsRoutes from './modules/bootcamps/bootcamps.routes';
import problemsRoutes from './modules/problems/problems.routes';
import submissionsRoutes from './modules/submissions/submissions.routes';
import rankingsRoutes from './modules/rankings/rankings.routes';
import postsRoutes from './modules/posts/posts.routes';
import commentsRoutes, { reactionsRouter } from './modules/comments/comments.routes';
import connectionsRoutes from './modules/connections/connections.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import chatRoutes from './modules/chat/chat.routes';
import liveRoutes from './modules/live/live.routes';
import roomsRoutes from './modules/rooms/rooms.routes';
import searchRoutes from './modules/search/search.routes';
import adminRoutes from './modules/admin/admin.routes';

export function createApp(): Application {
  const app = express();

  // ─── Security headers ────────────────────────────────────────
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: env.NODE_ENV === 'production',
  }));

  // ─── CORS ────────────────────────────────────────────────────
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl)
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS policy: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  // ─── Body parsing ────────────────────────────────────────────
  // Webhook route needs raw body — registered before json parser
  app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use(compression() as express.RequestHandler);

  // ─── Request logging ─────────────────────────────────────────
  app.use(requestLogger);

  // ─── Rate limiting ────────────────────────────────────────────
  app.use(APP.API_PREFIX, apiRateLimiter);

  // ─── Health check ─────────────────────────────────────────────
  app.get(APP.HEALTH_PATH, (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      app: APP.NAME,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  // ─── API Docs ─────────────────────────────────────────────────
  app.use(APP.DOCS_PATH, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Coding World API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  }));

  // ─── Routes ───────────────────────────────────────────────────
  const api = APP.API_PREFIX;

  app.use(`${api}/auth`, authRoutes);
  app.use(`${api}/users`, usersRoutes);
  app.use(`${api}/courses`, coursesRoutes);
  app.use(`${api}/payments`, paymentsRoutes);
  app.use(`${api}/notes`, notesRoutes);
  app.use(`${api}/bootcamps`, bootcampsRoutes);
  app.use(`${api}/problems`, problemsRoutes);
  app.use(`${api}/submissions`, submissionsRoutes);
  app.use(`${api}/rankings`, rankingsRoutes);
  app.use(`${api}/posts`, postsRoutes);
  // Comments nested under posts: /api/v1/posts/:postId/comments
  app.use(`${api}/posts/:postId/comments`, commentsRoutes);
  // Reactions on a post: /api/v1/posts/:postId/reactions
  app.use(`${api}/posts/:postId/reactions`, reactionsRouter);
  app.use(`${api}/connections`, connectionsRoutes);
  app.use(`${api}/notifications`, notificationsRoutes);
  app.use(`${api}/chat`, chatRoutes);
  app.use(`${api}/live`, liveRoutes);
  app.use(`${api}/rooms`, roomsRoutes);
  app.use(`${api}/search`, searchRoutes);
  app.use(`${api}/admin`, adminRoutes);

  // ─── 404 & Error handlers ─────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
