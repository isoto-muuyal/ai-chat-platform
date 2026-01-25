import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { pool } from '../../config/db.js';
import { logger } from '../../config/logger.js';

const router = Router();

const recommendationSchema = z.object({
  accountNumber: z.coerce.number().int().positive(),
  robloxUserId: z.coerce.number().int().positive(),
  ideas: z.string().min(1).max(4000),
  sourceType: z.string().min(1).max(64),
});

const accountSettingsSchema = z.object({
  sources: z.array(z.string()).nullable().optional(),
  api_key: z.string().nullable().optional(),
});

const getAccountSettings = async (accountNumber: number) => {
  const result = await pool.query(
    `SELECT sources, api_key
     FROM account_settings
     WHERE account_number = $1`,
    [accountNumber]
  );

  if (result.rows.length === 0) {
    return { sources: [], api_key: null };
  }

  const parsed = accountSettingsSchema.safeParse(result.rows[0]);
  if (!parsed.success) {
    return { sources: [], api_key: null };
  }

  return {
    sources: parsed.data.sources ?? [],
    api_key: parsed.data.api_key ?? null,
  };
};

router.post('/', async (req: Request, res: Response) => {
  const validationResult = recommendationSchema.safeParse(req.body);

  if (!validationResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationResult.error.issues,
    });
  }

  const { accountNumber, robloxUserId, ideas, sourceType } = validationResult.data;

  const apiKey = req.header('x-api-key');
  const accountSettings = await getAccountSettings(accountNumber);
  const expectedKey = accountSettings.api_key;

  if (!apiKey || !expectedKey || apiKey !== expectedKey) {
    logger.warn(
      { accountNumber, hasApiKeyHeader: Boolean(apiKey), hasExpectedKey: Boolean(expectedKey) },
      'unauthorized recommendations request'
    );
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const normalizedSources = (accountSettings.sources || []).map((value) => value.trim()).filter(Boolean);
  if (normalizedSources.length > 0 && !normalizedSources.includes(sourceType)) {
    logger.warn({ accountNumber, sourceType, allowedSources: normalizedSources }, 'invalid source type');
    return res.status(400).json({ error: 'Invalid sourceType' });
  }

  try {
    await pool.query(
      `INSERT INTO recommendations (
        id,
        account_number,
        roblox_user_id,
        recommendation,
        source_type,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [randomUUID(), accountNumber, robloxUserId, ideas, sourceType, 'New']
    );

    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'Failed to store recommendation');
    return res.status(500).json({ error: 'Failed to store recommendation' });
  }
});

export default router;
