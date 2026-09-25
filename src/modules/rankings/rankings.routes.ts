import { Router } from 'express';
import { rankingsController } from './rankings.controller';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();

router.get('/global', (req, res, next) => rankingsController.globalLeaderboard(req, res, next));
router.get('/weekly', (req, res, next) => rankingsController.weeklyLeaderboard(req, res, next));
router.get('/me', authenticate, (req, res, next) => rankingsController.myRank(req, res, next));
router.get('/user/:userId', (req, res, next) => rankingsController.userRank(req, res, next));
router.get('/achievements/my', authenticate, (req, res, next) => rankingsController.myAchievements(req, res, next));

export default router;
