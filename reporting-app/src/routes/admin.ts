import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { requireSysadmin } from '../middleware/auth.js';
import { hashPassword } from '../utils/password.js';
import { sendEmail } from '../services/mailer.js';
import { env } from '../config/env.js';

const router = Router();

router.use(requireSysadmin);

router.get('/users', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        email,
        full_name,
        company,
        role,
        account_number,
        language,
        theme,
        created_at
      FROM app_users
      ORDER BY created_at DESC`
    );

    return res.json({ users: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

const createUserSchema = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email(),
  company: z.string().max(120).optional().nullable(),
  password: z.string().min(8).max(128),
  role: z.enum(['user', 'sysadmin']).optional(),
});

router.post('/users', async (req: Request, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);
    const hashed = await hashPassword(data.password);

    const result = await pool.query(
      `INSERT INTO app_users (
        id,
        email,
        full_name,
        company,
        role,
        account_number,
        password_hash,
        language,
        theme,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        DEFAULT,
        $5,
        'en',
        'light',
        NOW(),
        NOW()
      )
      RETURNING id, email, full_name, company, role, account_number, language, theme`,
      [data.email.toLowerCase(), data.fullName, data.company ?? null, data.role ?? 'user', hashed]
    );

    const user = result.rows[0];
    const loginUrl = `${env.APP_BASE_URL.replace(/\/$/, '')}/login`;
    await sendEmail({
      to: [{ email: user.email, name: user.full_name || user.email }],
      subject: 'Your account is ready',
      text: `Your reporting account has been created. Login here: ${loginUrl}`,
      html: `<p>Your reporting account has been created.</p><p><a href="${loginUrl}">Login</a></p>`,
    });

    return res.status(201).json({ user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

export default router;
