import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Protected dashboard route
router.get('/', requireAuth, (req: Request, res: Response) => {
  res.render('dashboard', {
    username: req.session?.username || 'Admin',
  });
});

export default router;

