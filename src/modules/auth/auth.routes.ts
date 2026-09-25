import { Router } from 'express';
import { authController } from './auth.controller';
import { validateBody } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { authRateLimiter, passwordResetRateLimiter } from '../../middlewares/rateLimiter';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
} from './auth.validators';

const router = Router();

// Public routes
router.post('/register', authRateLimiter, validateBody(registerSchema), (req, res, next) => authController.register(req, res, next));
router.post('/login', authRateLimiter, validateBody(loginSchema), (req, res, next) => authController.login(req, res, next));
router.post('/refresh', validateBody(refreshTokenSchema.partial()), (req, res, next) => authController.refresh(req, res, next));
router.post('/verify-email', validateBody(verifyEmailSchema), (req, res, next) => authController.verifyEmail(req, res, next));
router.post('/resend-verification', authRateLimiter, validateBody(forgotPasswordSchema), (req, res, next) => authController.resendVerification(req, res, next));
router.post('/forgot-password', passwordResetRateLimiter, validateBody(forgotPasswordSchema), (req, res, next) => authController.forgotPassword(req, res, next));
router.post('/reset-password', validateBody(resetPasswordSchema), (req, res, next) => authController.resetPassword(req, res, next));

// Protected routes
router.post('/logout', authenticate, (req, res, next) => authController.logout(req, res, next));
router.post('/logout-all', authenticate, (req, res, next) => authController.logoutAll(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));
router.post('/change-password', authenticate, validateBody(changePasswordSchema), (req, res, next) => authController.changePassword(req, res, next));
router.post('/deactivate', authenticate, (req, res, next) => authController.deactivateAccount(req, res, next));
router.delete('/delete-account', authenticate, (req, res, next) => authController.deleteAccount(req, res, next));

export default router;
