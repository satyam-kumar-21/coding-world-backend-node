import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response';
import type { AuthenticatedRequest } from '../../types';
import type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  VerifyEmailInput,
} from './auth.validators';
import { JWT } from '../../constants';
import { env } from '../../config/env';

export class AuthController {
  /**
   * @swagger
   * /auth/register:
   *   post:
   *     tags: [Auth]
   *     summary: Register a new user account
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [firstName, lastName, email, password]
   *             properties:
   *               firstName: { type: string }
   *               lastName: { type: string }
   *               email: { type: string, format: email }
   *               password: { type: string, minLength: 8 }
   *               username: { type: string }
   *     responses:
   *       201: { description: User registered successfully }
   *       409: { description: Email or username already exists }
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as RegisterInput;
      const result = await authService.register(body, req.ip ?? undefined);
      this.setRefreshCookie(res, result.tokens.refreshToken);
      sendCreated(res, result, 'Account created successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Login with email and password
   *     security: []
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as LoginInput;
      const result = await authService.login(
        body,
        req.ip ?? undefined,
        req.headers['user-agent'] ?? undefined,
      );
      this.setRefreshCookie(res, result.tokens.refreshToken);
      sendSuccess(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Logout current session
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as RefreshTokenInput;
      const cookieToken = req.cookies?.[JWT.COOKIE_NAME];
      const refreshToken = cookieToken ?? body.refreshToken;

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      this.clearRefreshCookie(res);
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/logout-all:
   *   post:
   *     tags: [Auth]
   *     summary: Logout all sessions
   */
  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      await authService.logoutAll(userId);
      this.clearRefreshCookie(res);
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/refresh:
   *   post:
   *     tags: [Auth]
   *     summary: Refresh access token
   *     security: []
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as RefreshTokenInput;
      const cookieToken = req.cookies?.[JWT.COOKIE_NAME];
      const refreshToken = cookieToken ?? body.refreshToken;

      if (!refreshToken) {
        res.status(401).json({ success: false, message: 'No refresh token provided' });
        return;
      }

      const tokens = await authService.refreshTokens(refreshToken, req.ip ?? undefined);
      this.setRefreshCookie(res, tokens.refreshToken);
      sendSuccess(res, { tokens }, 'Token refreshed');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/verify-email:
   *   post:
   *     tags: [Auth]
   *     summary: Verify email address
   *     security: []
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body as VerifyEmailInput;
      await authService.verifyEmail(token);
      sendSuccess(res, null, 'Email verified successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/resend-verification:
   *   post:
   *     tags: [Auth]
   *     summary: Resend email verification
   *     security: []
   */
  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body as ForgotPasswordInput;
      await authService.resendVerification(email);
      sendSuccess(res, null, 'If that email exists, a verification link has been sent');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/forgot-password:
   *   post:
   *     tags: [Auth]
   *     summary: Request password reset email
   *     security: []
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body as ForgotPasswordInput;
      await authService.forgotPassword(email, req.ip ?? undefined);
      sendSuccess(res, null, 'If that email is registered, a reset link has been sent');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/reset-password:
   *   post:
   *     tags: [Auth]
   *     summary: Reset password with token
   *     security: []
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body as ResetPasswordInput;
      await authService.resetPassword(token, password);
      sendSuccess(res, null, 'Password reset successful');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/change-password:
   *   post:
   *     tags: [Auth]
   *     summary: Change password (authenticated)
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { currentPassword, newPassword } = req.body as ChangePasswordInput;
      await authService.changePassword(userId, currentPassword, newPassword);
      this.clearRefreshCookie(res);
      sendSuccess(res, null, 'Password changed successfully. Please log in again.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/me:
   *   get:
   *     tags: [Auth]
   *     summary: Get current authenticated user
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const user = await authService.getCurrentUser(userId);
      sendSuccess(res, { user });
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/deactivate:
   *   post:
   *     tags: [Auth]
   *     summary: Deactivate account
   */
  async deactivateAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      await authService.deactivateAccount(userId);
      this.clearRefreshCookie(res);
      sendSuccess(res, null, 'Account deactivated');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/delete-account:
   *   delete:
   *     tags: [Auth]
   *     summary: Permanently delete account
   */
  async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      await authService.deleteAccount(userId);
      this.clearRefreshCookie(res);
      sendSuccess(res, null, 'Account deleted');
    } catch (err) {
      next(err);
    }
  }

  // ─── Cookie helpers ───────────────────────────────────────────
  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(JWT.COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth',
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(JWT.COOKIE_NAME, { path: '/api/v1/auth' });
  }
}

export const authController = new AuthController();
