import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt';
import { sendUnauthorized, sendForbidden } from '../utils/response';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import type { AuthenticatedRequest } from '../types';

// ─── authenticate ─────────────────────────────────────────────────────────────
// Validates JWT, attaches user payload to req.user

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      sendUnauthorized(res, 'No token provided');
      return;
    }

    const token = authHeader.slice(7);
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      sendUnauthorized(res, 'Invalid or expired token');
      return;
    }

    if (payload.type !== 'access') {
      sendUnauthorized(res, 'Invalid token type');
      return;
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, username: true, role: true, isActive: true, deletedAt: true },
    });

    if (!user || !user.isActive || user.deletedAt) {
      sendUnauthorized(res, 'Account not found or deactivated');
      return;
    }

    (req as AuthenticatedRequest).user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    };

    next();
  } catch (error) {
    logger.error({ error }, 'authenticate middleware error');
    sendUnauthorized(res, 'Authentication failed');
  }
}

// ─── optionalAuthenticate ─────────────────────────────────────────────────────
// Attaches user if token present, but does not block unauthenticated requests

export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = verifyAccessToken(token);
        if (payload.type === 'access') {
          const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, email: true, username: true, role: true, isActive: true, deletedAt: true },
          });
          if (user?.isActive && !user.deletedAt) {
            (req as AuthenticatedRequest).user = {
              userId: user.id,
              email: user.email,
              role: user.role,
              username: user.username,
            };
          }
        }
      } catch {
        // Silently ignore invalid tokens for optional auth
      }
    }
    next();
  } catch {
    next();
  }
}

// ─── authorize ────────────────────────────────────────────────────────────────
// Role-based access control middleware factory

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      sendUnauthorized(res);
      return;
    }
    if (!roles.includes(user.role)) {
      sendForbidden(res, 'Insufficient permissions');
      return;
    }
    next();
  };
}

// ─── requireRole aliases ──────────────────────────────────────────────────────

export const requireAdmin = authorize(Role.ADMIN, Role.SUPER_ADMIN);
export const requireSuperAdmin = authorize(Role.SUPER_ADMIN);
export const requireInstructor = authorize(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN);
export const requireModerator = authorize(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN);
