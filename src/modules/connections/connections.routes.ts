import { Router } from 'express';
import { connectionsController } from './connections.controller';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();

router.use(authenticate);

router.post('/send', (req, res, next) => connectionsController.send(req, res, next));
router.post('/:id/accept', (req, res, next) => connectionsController.accept(req, res, next));
router.post('/:id/reject', (req, res, next) => connectionsController.reject(req, res, next));
router.post('/:id/cancel', (req, res, next) => connectionsController.cancel(req, res, next));
router.delete('/user/:userId', (req, res, next) => connectionsController.remove(req, res, next));
router.post('/block', (req, res, next) => connectionsController.block(req, res, next));
router.post('/unblock/:userId', (req, res, next) => connectionsController.unblock(req, res, next));
router.get('/pending', (req, res, next) => connectionsController.pending(req, res, next));
router.get('/', (req, res, next) => connectionsController.list(req, res, next));
router.get('/status/:userId', (req, res, next) => connectionsController.status(req, res, next));

export default router;
