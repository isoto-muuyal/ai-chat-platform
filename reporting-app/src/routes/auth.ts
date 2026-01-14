import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { pool } from '../config/db.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { sendEmail } from '../services/mailer.js';
import crypto from 'crypto';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', (req: Request, res: Response) => {
  void (async () => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const userResult = await pool.query(
        `SELECT 
          id,
          email,
          full_name,
          company,
          role,
          account_number,
          language,
          theme,
          password_hash
        FROM app_users
        WHERE email = $1`,
        [email.toLowerCase()]
      );

      if (userResult.rows.length === 0) {
        const countResult = await pool.query('SELECT COUNT(*)::int as count FROM app_users');
        const hasUsers = (countResult.rows[0]?.count || 0) > 0;

        if (!hasUsers && email === env.ADMIN_USER && password === env.ADMIN_PASS) {
          const hashed = await hashPassword(password);
          const created = await pool.query(
            `INSERT INTO app_users (
              id, email, full_name, role, account_number, password_hash, language, theme, created_at, updated_at
            ) VALUES (gen_random_uuid(), $1, $2, 'sysadmin', DEFAULT, $3, 'en', 'light', NOW(), NOW())
            RETURNING id, email, full_name, company, role, account_number, language, theme`,
            [email.toLowerCase(), 'Admin', hashed]
          );

          const user = created.rows[0];
          req.session!.authenticated = true;
          req.session!.userId = user.id;
          req.session!.email = user.email;
          req.session!.fullName = user.full_name;
          req.session!.company = user.company;
          req.session!.language = user.language;
          req.session!.theme = user.theme;
          req.session!.role = user.role;
          req.session!.accountNumber = user.account_number;
          logger.info({ email }, 'Bootstrap sysadmin created and logged in');
          return res.json({
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            company: user.company,
            role: user.role,
            accountNumber: user.account_number,
            language: user.language,
            theme: user.theme,
            authenticated: true,
          });
        }

        logger.warn({ email }, 'Failed login attempt (email not found)');
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = userResult.rows[0];
      const isValid = await verifyPassword(password, user.password_hash);
      if (!isValid) {
        logger.warn({ email }, 'Failed login attempt (bad password)');
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      req.session!.authenticated = true;
      req.session!.userId = user.id;
      req.session!.email = user.email;
      req.session!.fullName = user.full_name;
      req.session!.company = user.company;
      req.session!.language = user.language;
      req.session!.theme = user.theme;
      req.session!.role = user.role;
      req.session!.accountNumber = user.account_number;

      logger.info({ email }, 'User logged in');
      return res.json({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        company: user.company,
        role: user.role,
        accountNumber: user.account_number,
        language: user.language,
        theme: user.theme,
        authenticated: true,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request' });
      } else {
        logger.error({ err: error }, 'Login error');
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  })();
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
  if (req.session?.authenticated && req.session.userId) {
    res.json({
      id: req.session.userId,
      email: req.session.email,
      fullName: req.session.fullName,
      company: req.session.company,
      role: req.session.role,
      accountNumber: req.session.accountNumber,
      language: req.session.language,
      theme: req.session.theme,
      authenticated: true,
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

const updateMeSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  company: z.string().max(120).optional().nullable(),
  language: z.enum(['en', 'es']).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8).max(128).optional(),
});

router.put('/me', (req: Request, res: Response) => {
  void (async () => {
    if (!req.session?.authenticated || !req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const updates = updateMeSchema.parse(req.body);

      if ((updates.currentPassword && !updates.newPassword) || (!updates.currentPassword && updates.newPassword)) {
        return res.status(400).json({ error: 'Both currentPassword and newPassword are required' });
      }

      let newPasswordHash: string | undefined;
      if (updates.currentPassword && updates.newPassword) {
        const currentResult = await pool.query(
          'SELECT password_hash FROM app_users WHERE id = $1',
          [req.session.userId]
        );
        const currentHash = currentResult.rows[0]?.password_hash;
        if (!currentHash || !(await verifyPassword(updates.currentPassword, currentHash))) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }
        newPasswordHash = await hashPassword(updates.newPassword);
      }

      const fields: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (updates.fullName !== undefined) {
        fields.push(`full_name = $${paramIndex++}`);
        params.push(updates.fullName);
      }
      if (updates.email !== undefined) {
        fields.push(`email = $${paramIndex++}`);
        params.push(updates.email.toLowerCase());
      }
      if (updates.company !== undefined) {
        fields.push(`company = $${paramIndex++}`);
        params.push(updates.company);
      }
      if (updates.language !== undefined) {
        fields.push(`language = $${paramIndex++}`);
        params.push(updates.language);
      }
      if (updates.theme !== undefined) {
        fields.push(`theme = $${paramIndex++}`);
        params.push(updates.theme);
      }
      if (newPasswordHash) {
        fields.push(`password_hash = $${paramIndex++}`);
        params.push(newPasswordHash);
      }

      if (fields.length === 0) {
        return res.json({ ok: true });
      }

      fields.push(`updated_at = NOW()`);
      params.push(req.session.userId);

      const result = await pool.query(
        `UPDATE app_users SET ${fields.join(', ')} WHERE id = $${paramIndex} 
         RETURNING id, email, full_name, company, role, account_number, language, theme`,
        params
      );

      const user = result.rows[0];
      req.session.email = user.email;
      req.session.fullName = user.full_name;
      req.session.company = user.company;
      req.session.role = user.role;
      req.session.accountNumber = user.account_number;
      req.session.language = user.language;
      req.session.theme = user.theme;

      return res.json({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        company: user.company,
        role: user.role,
        accountNumber: user.account_number,
        language: user.language,
        theme: user.theme,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request' });
      }
      logger.error({ err: error }, 'Update profile error');
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  })();
});

const forgotSchema = z.object({
  email: z.string().email(),
});

router.post('/forgot-password', (req: Request, res: Response) => {
  void (async () => {
    try {
      const { email } = forgotSchema.parse(req.body);
      const userResult = await pool.query(
        'SELECT id, email, full_name FROM app_users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (userResult.rows.length === 0) {
        return res.json({ ok: true });
      }

      const user = userResult.rows[0];
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await pool.query(
        `INSERT INTO password_resets (id, user_id, token_hash, expires_at, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
        [user.id, tokenHash, expiresAt]
      );

      const resetUrl = `${env.APP_BASE_URL.replace(/\/$/, '')}/reset-password?token=${token}`;
      await sendEmail({
        to: [{ email: user.email, name: user.full_name || user.email }],
        subject: 'Reset your password',
        text: `Reset your password using this link: ${resetUrl}`,
        html: `<p>Reset your password using this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });

      return res.json({ ok: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request' });
      }
      logger.error({ err: error }, 'Forgot password error');
      return res.status(500).json({ error: 'Failed to send reset email' });
    }
  })();
});

const resetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

router.post('/reset-password', (req: Request, res: Response) => {
  void (async () => {
    const client = await pool.connect();
    try {
      const { token, newPassword } = resetSchema.parse(req.body);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const resetResult = await client.query(
        `SELECT id, user_id FROM password_resets 
         WHERE token_hash = $1 AND expires_at > NOW()`,
        [tokenHash]
      );

      if (resetResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }

      const resetRow = resetResult.rows[0];
      const passwordHash = await hashPassword(newPassword);

      await client.query('BEGIN');
      await client.query('UPDATE app_users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
        passwordHash,
        resetRow.user_id,
      ]);
      await client.query('DELETE FROM password_resets WHERE id = $1', [resetRow.id]);
      await client.query('COMMIT');

      return res.json({ ok: true });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // no-op
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request' });
      }
      logger.error({ err: error }, 'Reset password error');
      return res.status(500).json({ error: 'Failed to reset password' });
    } finally {
      client.release();
    }
  })();
});

export default router;
