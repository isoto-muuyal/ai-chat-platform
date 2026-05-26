import { Router, Request, Response } from 'express';
import { pool } from '../../config/db.js';
import { logger } from '../../config/logger.js';

const router = Router();

const resolveOwner = async (apiKey: string): Promise<string | null> => {
  const result = await pool.query(
    `SELECT au.full_name, au.email
     FROM account_settings acs
     JOIN app_users au ON au.account_number = acs.account_number
     WHERE acs.api_key = $1
     LIMIT 1`,
    [apiKey]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return (row.full_name as string) || (row.email as string) || null;
};

// GET /v1/message-boards/latest  (must be declared before /:id to avoid route shadowing)
router.get('/latest', async (req: Request, res: Response) => {
  const apiKey = req.header('x-api-key');
  if (!apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let ownerName: string | null;
  try {
    ownerName = await resolveOwner(apiKey);
  } catch (err) {
    logger.error({ err }, 'Failed to resolve owner for message boards');
    return res.status(500).json({ error: 'Internal server error' });
  }

  if (!ownerName) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await pool.query(
      `SELECT id, message
       FROM message_boards
       WHERE owner_name = $1
       ORDER BY id DESC
       LIMIT 1`,
      [ownerName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No messages found' });
    }

    return res.json({ id: result.rows[0].id, message: result.rows[0].message });
  } catch (err) {
    logger.error({ err, ownerName }, 'Failed to fetch latest message board');
    return res.status(500).json({ error: 'Failed to fetch latest message board' });
  }
});

// GET /v1/message-boards
router.get('/', async (req: Request, res: Response) => {
  const apiKey = req.header('x-api-key');
  if (!apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let ownerName: string | null;
  try {
    ownerName = await resolveOwner(apiKey);
  } catch (err) {
    logger.error({ err }, 'Failed to resolve owner for message boards');
    return res.status(500).json({ error: 'Internal server error' });
  }

  if (!ownerName) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await pool.query(
      `SELECT id, message
       FROM message_boards
       WHERE owner_name = $1
       ORDER BY id ASC`,
      [ownerName]
    );

    return res.json({
      messages: result.rows.map((row) => ({ id: row.id as number, message: row.message as string })),
    });
  } catch (err) {
    logger.error({ err, ownerName }, 'Failed to fetch message boards');
    return res.status(500).json({ error: 'Failed to fetch message boards' });
  }
});

export default router;
