import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate } from '../../middlewares/authenticate';
import { validateBody } from '../../middlewares/validate';
import { avatarUpload, uploadRateLimiter } from '../../middlewares';
import {
  updateProfileSchema,
  updateUsernameSchema,
  updatePrivacySchema,
  addEducationSchema,
} from './users.validators';

const router = Router();

// Public
router.get('/', (req, res, next) => usersController.listUsers(req, res, next));
router.get('/:username', (req, res, next) => usersController.getProfile(req, res, next));

// Protected
router.get('/me/profile', authenticate, (req, res, next) => usersController.getMyProfile(req, res, next));
router.put('/me/profile', authenticate, validateBody(updateProfileSchema), (req, res, next) => usersController.updateProfile(req, res, next));
router.patch('/me/username', authenticate, validateBody(updateUsernameSchema), (req, res, next) => usersController.updateUsername(req, res, next));
router.post('/me/avatar', authenticate, uploadRateLimiter, avatarUpload.single('avatar'), (req, res, next) => usersController.uploadAvatar(req, res, next));
router.put('/me/privacy', authenticate, validateBody(updatePrivacySchema), (req, res, next) => usersController.updatePrivacy(req, res, next));
router.post('/me/education', authenticate, validateBody(addEducationSchema), (req, res, next) => usersController.addEducation(req, res, next));
router.delete('/me/education/:educationId', authenticate, (req, res, next) => usersController.deleteEducation(req, res, next));
router.get('/me/stats', authenticate, (req, res, next) => usersController.getUserStats(req, res, next));
router.get('/:userId/stats', (req, res, next) => usersController.getUserStats(req, res, next));

export default router;
