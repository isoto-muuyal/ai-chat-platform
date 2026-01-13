import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';

const router = Router();

const chatRequestSchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(300, 'Message must be 300 characters or less'),
  playerId: z.string().min(1).max(64).optional(),
  sessionId: z.string().min(1).max(64).optional(),
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
    playerId,
    sessionId,
    gender,
    location,
    clientTimestamp,
  } = validationResult.data;

  logger.info(
    { playerId, sessionId, gender, location, clientTimestamp, messageLength: message.length },
    'chat request received'
  );

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
    })}\n\n`
  );

  // Send token event
  res.write(`event: token\n`);
  res.write(`data: ${JSON.stringify({ text: 'Tema: demo\n' })}\n\n`);

  // Send done event
  res.write(`event: done\n`);
  res.write(`data: ${JSON.stringify({ ok: true })}\n\n`);

  // End the response
  res.end();
});

export default router;
