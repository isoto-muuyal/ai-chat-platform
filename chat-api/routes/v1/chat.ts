import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import { pool } from '../../config/db.js';

const router = Router();

const chatRequestSchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(300, 'Message must be 300 characters or less'),
  accountNumber: z.coerce.number().int().positive(),
  playerId: z.string().min(1).max(64).optional(),
  robloxUsername: z.string().min(1).max(64).optional(),
  sessionId: z.string().min(1).max(64).optional(),
  conversationId: z.string().uuid().optional(),
  gender: z.enum(['male', 'female', 'other', 'unknown']).optional(),
  location: z
    .object({
      country: z.string().min(2).max(2).optional(),
      region: z.string().min(1).max(64).optional(),
      city: z.string().min(1).max(64).optional(),
    })
    .optional(),
  clientTimestamp: z
    .union([z.string().datetime(), z.number().int().nonnegative()])
    .optional(),
});

const inferenceSchema = z.object({
  topic: z.string().min(1).max(120).optional().nullable(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional().nullable(),
  is_troll: z.boolean().optional().nullable(),
});

const inferMeta = async (message: string): Promise<{
  topic: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  is_troll: boolean;
}> => {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_KEY}`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              'You are a classifier. Return ONLY a JSON object with keys: ' +
              'topic (string or null), sentiment ("positive"|"neutral"|"negative" or null), ' +
              'is_troll (boolean). No extra text.\n\n' +
              `Message: ${message}`,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini inference error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini inference response missing text');
    }

    const parsed = inferenceSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      throw new Error('Gemini inference response invalid');
    }

    return {
      topic: parsed.data.topic ?? null,
      sentiment: parsed.data.sentiment ?? null,
      is_troll: parsed.data.is_troll ?? false,
    };
  } catch (err) {
    logger.warn({ err }, 'Gemini inference failed, using defaults');
    return { topic: null, sentiment: null, is_troll: false };
  }
};

const persistInteraction = async (params: {
  conversationId: string;
  accountNumber: number;
  robloxUserId: number | null;
  robloxUsername?: string;
  userMessage: string;
  aiMessage: string;
  country?: string;
  topic: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  isTroll: boolean;
}): Promise<void> => {
  const {
    conversationId,
    accountNumber,
    robloxUserId,
    robloxUsername,
    userMessage,
    aiMessage,
    country,
    topic,
    sentiment,
    isTroll,
  } = params;
  const now = new Date();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO conversations (
        id,
        account_number,
        roblox_user_id,
        roblox_username,
        started_at,
        last_message_at,
        topic,
        sentiment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        last_message_at = EXCLUDED.last_message_at,
        roblox_user_id = COALESCE(conversations.roblox_user_id, EXCLUDED.roblox_user_id),
        roblox_username = COALESCE(conversations.roblox_username, EXCLUDED.roblox_username),
        topic = COALESCE(conversations.topic, EXCLUDED.topic),
        sentiment = COALESCE(conversations.sentiment, EXCLUDED.sentiment)`,
      [
        conversationId,
        accountNumber,
        robloxUserId,
        robloxUsername ?? null,
        now,
        now,
        topic,
        sentiment,
      ]
    );

    await client.query(
      `INSERT INTO messages (
        id,
        conversation_id,
        sender,
        content,
        content_encrypted,
        created_at,
        account_number,
        is_troll
      ) VALUES ($1, $2, $3, $4, pgp_sym_encrypt($5, $6), $7, $8, $9)`,
      [
        randomUUID(),
        conversationId,
        'user',
        null,
        userMessage,
        env.MESSAGE_ENCRYPTION_KEY,
        now,
        accountNumber,
        isTroll,
      ]
    );

    await client.query(
      `INSERT INTO messages (
        id,
        conversation_id,
        sender,
        content,
        content_encrypted,
        created_at,
        account_number,
        is_troll
      ) VALUES ($1, $2, $3, $4, pgp_sym_encrypt($5, $6), $7, $8, $9)`,
      [
        randomUUID(),
        conversationId,
        'assistant',
        null,
        aiMessage,
        env.MESSAGE_ENCRYPTION_KEY,
        now,
        accountNumber,
        false,
      ]
    );

    if (robloxUserId !== null && country) {
      await client.query(
        `INSERT INTO analytics (
          id,
          roblox_user_id,
          account_number,
          country,
          inferred_age_range,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [randomUUID(), robloxUserId, accountNumber, country, null, now]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

router.post('/stream', (req: Request, res: Response) => {
  const apiKey = req.header('x-api-key');
  if (!apiKey || apiKey !== env.CHAT_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate request body
  const validationResult = chatRequestSchema.safeParse(req.body);

  if (!validationResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationResult.error.issues,
    });
  }

  const {
    message,
    accountNumber,
    playerId,
    robloxUsername,
    sessionId,
    conversationId: providedConversationId,
    gender,
    location,
    clientTimestamp,
  } = validationResult.data;

  const conversationId = providedConversationId ?? randomUUID();
  const robloxUserId = playerId && Number.isFinite(Number(playerId)) ? Number(playerId) : null;

  logger.info(
    {
      accountNumber,
      playerId,
      robloxUsername,
      sessionId,
      conversationId,
      gender,
      location,
      clientTimestamp,
      messageLength: message.length,
    },
    'chat request received'
  );

  const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_KEY}`;
  const geminiBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ],
  };

  const geminiRequest = async () => {
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini response missing text');
    }

    return text as string;
  };

  geminiRequest()
    .then((text) => {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // Send meta event
      res.write(`event: meta\n`);
      res.write(
        `data: ${JSON.stringify({
          ok: true,
          cache: 'miss',
          receivedAt: new Date().toISOString(),
          conversationId,
        })}\n\n`
      );

      // Send token event
      res.write(`event: token\n`);
      res.write(`data: ${JSON.stringify({ text })}\n\n`);

      // Send done event
      res.write(`event: done\n`);
      res.write(`data: ${JSON.stringify({ ok: true })}\n\n`);

      res.end();

      void (async () => {
        const { topic, sentiment, is_troll } = await inferMeta(message);
        const normalizedTopic = topic && topic.trim() ? topic.trim() : 'general';
        await persistInteraction({
          conversationId,
          accountNumber,
          robloxUserId,
          robloxUsername,
          userMessage: message,
          aiMessage: text,
          country: location?.country,
          topic: normalizedTopic,
          sentiment,
          isTroll: is_troll,
        });
      })().catch((err) => {
        logger.error({ err }, 'Failed to persist chat interaction');
      });
    })
    .catch((err) => {
      logger.error({ err }, 'Gemini request failed');
      return res.status(502).json({ error: 'Upstream AI request failed' });
    });
});

export default router;
