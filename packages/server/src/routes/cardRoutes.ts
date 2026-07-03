import { Router } from 'express';
import { createCard, updateCard, deleteCard, moveCard } from '../controllers/cardController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createCardSchema, updateCardSchema } from '@kanban/shared';
import rateLimit from 'express-rate-limit';

const router = Router();

const cardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, error: { message: 'Too many requests', code: 'RATE_LIMIT', status: 429 } },
});

router.use(authenticate);
router.use(cardLimiter);

router.post('/', validate(createCardSchema), createCard);
router.patch('/:id', validate(updateCardSchema), updateCard);
router.post('/:id/move', moveCard);
router.delete('/:id', deleteCard);

export default router;