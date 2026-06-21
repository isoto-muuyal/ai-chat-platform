import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { logger } from '../config/logger.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const contextSchema = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(20000),
  sourceName: z.string().min(1).max(64).optional().nullable(),
  enabled: z.boolean().default(true),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, source_name, title, content, enabled, created_at, updated_at
       FROM agent_contexts
       WHERE account_number = $1
       ORDER BY updated_at DESC`,
      [req.session.accountNumber]
    );

    return res.json({
      contexts: result.rows.map((row) => ({
        id: row.id,
        sourceName: row.source_name,
        title: row.title,
        content: row.content,
        enabled: row.enabled,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to load agent context');
    return res.status(500).json({ error: 'Failed to load agent context' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = contextSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO agent_contexts (account_number, source_name, title, content, enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, source_name, title, content, enabled, created_at, updated_at`,
      [req.session.accountNumber, data.sourceName?.trim() || null, data.title.trim(), data.content, data.enabled]
    );

    const row = result.rows[0];
    return res.status(201).json({
      context: {
        id: row.id,
        sourceName: row.source_name,
        title: row.title,
        content: row.content,
        enabled: row.enabled,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    logger.error({ err: error }, 'Failed to create agent context');
    return res.status(500).json({ error: 'Failed to create agent context' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = contextSchema.parse(req.body);
    const result = await pool.query(
      `UPDATE agent_contexts
       SET source_name = $1, title = $2, content = $3, enabled = $4, updated_at = NOW()
       WHERE id = $5 AND account_number = $6
       RETURNING id, source_name, title, content, enabled, created_at, updated_at`,
      [
        data.sourceName?.trim() || null,
        data.title.trim(),
        data.content,
        data.enabled,
        req.params.id,
        req.session.accountNumber,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Context not found' });
    }

    const row = result.rows[0];
    return res.json({
      context: {
        id: row.id,
        sourceName: row.source_name,
        title: row.title,
        content: row.content,
        enabled: row.enabled,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    logger.error({ err: error }, 'Failed to update agent context');
    return res.status(500).json({ error: 'Failed to update agent context' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `DELETE FROM agent_contexts WHERE id = $1 AND account_number = $2`,
      [req.params.id, req.session.accountNumber]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Context not found' });
    }
    return res.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete agent context');
    return res.status(500).json({ error: 'Failed to delete agent context' });
  }
});

export default router;
