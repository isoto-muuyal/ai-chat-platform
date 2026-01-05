import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    if (username === env.ADMIN_USER && password === env.ADMIN_PASS) {
      req.session!.authenticated = true;
      req.session!.username = username;
      logger.info({ username }, 'User logged in');
      res.json({ username, authenticated: true });
    } else {
      logger.warn({ username }, 'Failed login attempt');
      res.status(401).json({ error: 'Invalid username or password' });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request' });
    } else {
      logger.error({ err: error }, 'Login error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.post('/logout', (req: Request, res: Response) => {
  const username = req.session?.username;
  req.session?.destroy((err) => {
    if (err) {
      logger.error({ err }, 'Error destroying session');
      res.status(500).json({ error: 'Logout failed' });
    } else {
      logger.info({ username }, 'User logged out');
      res.json({ success: true });
    }
  });
});

router.get('/me', (req: Request, res: Response) => {
  if (req.session?.authenticated) {
    res.json({ username: req.session.username, authenticated: true });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

export default router;

