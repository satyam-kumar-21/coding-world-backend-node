import { Router } from 'express';
import { chatController } from './chat.controller';
import { authenticate } from '../../middlewares/authenticate';
import { chatFileUpload, uploadRateLimiter } from '../../middlewares';

const router = Router();
router.use(authenticate);

router.get('/', (req, res, next) => chatController.listConversations(req, res, next));
router.get('/direct/:targetUserId', (req, res, next) => chatController.getDirect(req, res, next));
router.post('/group', (req, res, next) => chatController.createGroup(req, res, next));
router.get('/:id', (req, res, next) => chatController.getConversation(req, res, next));
router.get('/:id/messages', (req, res, next) => chatController.getMessages(req, res, next));
router.post('/:id/messages', (req, res, next) => chatController.sendMessage(req, res, next));
router.post('/:id/messages/file', uploadRateLimiter, chatFileUpload.single('file'), (req, res, next) => chatController.sendFile(req, res, next));
router.post('/:id/read', (req, res, next) => chatController.markRead(req, res, next));
router.put('/:id/messages/:messageId', (req, res, next) => chatController.editMessage(req, res, next));
router.delete('/:id/messages/:messageId', (req, res, next) => chatController.deleteMessage(req, res, next));

export default router;
