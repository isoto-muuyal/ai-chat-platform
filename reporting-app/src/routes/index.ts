import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Protected dashboard route
router.get('/', requireAuth, (req: Request, res: Response) => {
  res.render('dashboard', {
    username: req.session?.fullName || req.session?.email || 'Admin',
  });
});

export default router;

