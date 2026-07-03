import { Router } from 'express';
import { createList, updateList, deleteList } from '../controllers/listController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createListSchema, updateListSchema } from '@kanban/shared';
import rateLimit from 'express-rate-limit';

const router = Router();

const listLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, error: { message: 'Too many requests', code: 'RATE_LIMIT', status: 429 } },
});

router.use(authenticate);
router.use(listLimiter);

router.post('/', validate(createListSchema), createList);
router.patch('/:id', validate(updateListSchema), updateList);
router.delete('/:id', deleteList);

export default router;