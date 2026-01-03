import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Conversations list page
router.get('/', (req: Request, res: Response) => {
  res.render('conversations', {
    username: req.session?.username || 'Admin',
  });
});

// Conversation detail page
router.get('/:id', (req: Request, res: Response) => {
  res.render('conversation-detail', {
    username: req.session?.username || 'Admin',
    conversationId: req.params.id,
  });
});

export default router;


