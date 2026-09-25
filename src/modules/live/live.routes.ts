import { Router } from 'express';
import { liveController } from './live.controller';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();

router.get('/', (req, res, next) => liveController.listLive(req, res, next));
router.get('/my-status', authenticate, (req, res, next) => liveController.getMyStatus(req, res, next));
router.post('/status', authenticate, (req, res, next) => liveController.setStatus(req, res, next));

export default router;
