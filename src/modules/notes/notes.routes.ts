import { Router } from 'express';
import { notesController } from './notes.controller';
import { authenticate } from '../../middlewares/authenticate';
import { validateBody } from '../../middlewares/validate';
import { generalUpload, uploadRateLimiter } from '../../middlewares';
import { createNoteSchema, updateNoteSchema } from './notes.validators';

const router = Router();

router.use(authenticate);

router.post('/', validateBody(createNoteSchema), (req, res, next) => notesController.create(req, res, next));
router.get('/', (req, res, next) => notesController.list(req, res, next));
router.get('/:noteId', (req, res, next) => notesController.getOne(req, res, next));
router.put('/:noteId', validateBody(updateNoteSchema), (req, res, next) => notesController.update(req, res, next));
router.delete('/:noteId', (req, res, next) => notesController.remove(req, res, next));

// Files
router.post('/files/upload', uploadRateLimiter, generalUpload.single('file'), (req, res, next) => notesController.uploadFile(req, res, next));
router.get('/files', (req, res, next) => notesController.listFiles(req, res, next));
router.get('/files/:fileId/signed-url', (req, res, next) => notesController.getSignedUrl(req, res, next));
router.delete('/files/:fileId', (req, res, next) => notesController.deleteFile(req, res, next));

export default router;
