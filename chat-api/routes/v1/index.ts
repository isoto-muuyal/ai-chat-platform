import { Router } from 'express';
import chatRouter from './chat.js';
import recommendationsRouter from './recommendations.js';

const router = Router();

router.use('/chat', chatRouter);
router.use('/recommendations', recommendationsRouter);

export default router;

