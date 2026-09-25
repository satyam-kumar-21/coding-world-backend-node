import { Router } from 'express';
import { searchService } from './search.service';
import { sendSuccess } from '../../utils/response';
import { parsePaginationQuery } from '../../utils/pagination';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { page, limit } = parsePaginationQuery(req.query);
    const q = (req.query.q as string) ?? '';
    const type = (req.query.type as string) ?? 'all';
    if (!q.trim()) { sendSuccess(res, {}); return; }
    const result = await searchService.search(q, type, page, limit);
    sendSuccess(res, result);
  } catch (e) { next(e); }
});

export default router;
