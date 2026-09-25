import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();
router.use(authenticate);

router.get('/', (req, res, next) => notificationsController.list(req, res, next));
router.get('/unread-count', (req, res, next) => notificationsController.unreadCount(req, res, next));
router.post('/mark-all-read', (req, res, next) => notificationsController.markAllRead(req, res, next));
router.post('/:id/read', (req, res, next) => notificationsController.markRead(req, res, next));
router.delete('/:id', (req, res, next) => notificationsController.remove(req, res, next));

export default router;
