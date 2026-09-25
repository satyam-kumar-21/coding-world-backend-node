import { Router } from 'express';
import { roomsController } from './rooms.controller';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();
router.use(authenticate);

router.get('/', (req, res, next) => roomsController.mySessions(req, res, next));
router.post('/request', (req, res, next) => roomsController.request(req, res, next));
router.get('/:id', (req, res, next) => roomsController.getOne(req, res, next));
router.post('/:id/accept', (req, res, next) => roomsController.accept(req, res, next));
router.post('/:id/reject', (req, res, next) => roomsController.reject(req, res, next));
router.post('/:id/end', (req, res, next) => roomsController.end(req, res, next));
router.get('/:id/messages', (req, res, next) => roomsController.getMessages(req, res, next));
router.post('/:id/messages', (req, res, next) => roomsController.sendMessage(req, res, next));

export default router;
