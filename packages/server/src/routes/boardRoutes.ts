import { Router } from 'express';
import { createBoard, getBoards, getBoard, updateBoard, deleteBoard } from '../controllers/boardController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createBoardSchema, updateBoardSchema } from '@kanban/shared';
import rateLimit from 'express-rate-limit';

const router = Router();

const boardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, error: { message: 'Too many requests', code: 'RATE_LIMIT', status: 429 } },
});

router.use(authenticate);
router.use(boardLimiter);

router.post('/', validate(createBoardSchema), createBoard);
router.get('/', getBoards);
router.get('/:id', getBoard);
router.patch('/:id', validate(updateBoardSchema), updateBoard);
router.delete('/:id', deleteBoard);

export default router;