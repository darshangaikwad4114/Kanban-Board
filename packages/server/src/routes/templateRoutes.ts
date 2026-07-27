import { Router } from 'express';
import { getTemplates } from '../controllers/boardController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getTemplates);

export default router;