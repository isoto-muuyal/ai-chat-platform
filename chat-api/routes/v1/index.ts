import { Router } from 'express';
import chatRouter from './chat.js';
import recommendationsRouter from './recommendations.js';
import whatsappRouter from './whatsapp.js';
import smsRouter from './sms.js';
import messageBoardsRouter from './message-boards.js';

const router = Router();

router.use('/chat', chatRouter);
router.use('/recommendations', recommendationsRouter);
router.use('/integrations/whatsapp', whatsappRouter);
router.use('/sms', smsRouter);
router.use('/message-boards', messageBoardsRouter);

export default router;
