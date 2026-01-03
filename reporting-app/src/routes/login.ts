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
  const { username, password } = req.body;

  if (username === env.ADMIN_USER && password === env.ADMIN_PASS) {
    req.session!.authenticated = true;
    req.session!.username = username;
    logger.info({ username }, 'User logged in');
    res.redirect('/');
  } else {
    logger.warn({ username }, 'Failed login attempt');
    res.render('login', { error: 'Invalid username or password' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  const username = req.session?.username;
  req.session?.destroy((err) => {
    if (err) {
      logger.error({ err }, 'Error destroying session');
    } else {
      logger.info({ username }, 'User logged out');
    }
    res.redirect('/login');
  });
});

export default router;


