import { Router, Request, Response } from 'express';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const router = Router();

router.get('/login', (req: Request, res: Response) => {
  // If already authenticated, redirect to dashboard
  if (req.session?.authenticated) {
    return res.redirect('/');
  }
  res.render('login', { error: null });
});

router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (email === env.ADMIN_USER && password === env.ADMIN_PASS) {
    req.session!.authenticated = true;
    req.session!.email = email;
    req.session!.fullName = 'Admin';
    logger.info({ email }, 'User logged in');
    return res.redirect('/');
  }
  logger.warn({ email }, 'Failed login attempt');
  return res.render('login', { error: 'Invalid email or password' });
});

router.post('/logout', (req: Request, res: Response) => {
  const email = req.session?.email;
  req.session?.destroy((err) => {
    if (err) {
      logger.error({ err }, 'Error destroying session');
    } else {
      logger.info({ email }, 'User logged out');
    }
    res.redirect('/login');
  });
});

export default router;

