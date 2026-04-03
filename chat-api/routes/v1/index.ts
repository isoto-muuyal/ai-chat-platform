import { Router } from 'express';
import chatRouter from './chat.js';
import recommendationsRouter from './recommendations.js';
import whatsappRouter from './whatsapp.js';

const router = Router();

router.use('/chat', chatRouter);
router.use('/recommendations', recommendationsRouter);
router.use('/integrations/whatsapp', whatsappRouter);

export default router;
