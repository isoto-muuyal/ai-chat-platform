import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Troll page
router.get('/', (req: Request, res: Response) => {
  res.render('troll', {
    username: req.session?.fullName || req.session?.email || 'Admin',
  });
});

export default router;

