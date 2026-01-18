import { Request, Response, NextFunction } from 'express';

declare module 'express-session' {
  interface SessionData {
    authenticated?: boolean;
    userId?: string;
    email?: string;
    fullName?: string;
    company?: string | null;
    language?: 'en' | 'es';
    theme?: 'light' | 'dark';
    role?: 'sysadmin' | 'user';
    accountNumber?: number;
    csrfToken?: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.authenticated && req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
}

export function requireSysadmin(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.authenticated && req.session.role === 'sysadmin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
}
