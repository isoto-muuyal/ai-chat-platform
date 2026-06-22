import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { sendEmail } from '../services/mailer.js';

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  message: z.string().min(1).max(5000),
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = contactSchema.parse(req.body);

    await pool.query(
      `INSERT INTO contact_submissions (name, email, message, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [data.name, data.email, data.message]
    );

    const notifyEmail = env.CONTACT_NOTIFY_EMAIL || env.MAIL_FROM;
    try {
      await sendEmail({
        to: [{ email: notifyEmail }],
        subject: `New contact form submission from ${data.name}`,
        text: `Name: ${data.name}\nEmail: ${data.email}\n\n${data.message}`,
        html: `<p><strong>Name:</strong> ${data.name}</p><p><strong>Email:</strong> ${data.email}</p><p>${data.message}</p>`,
      });
    } catch (mailErr) {
      logger.error({ err: mailErr }, 'Failed to send contact notification email');
    }

    return res.status(201).json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    return res.status(500).json({ error: 'Failed to submit contact form' });
  }
});

export default router;
