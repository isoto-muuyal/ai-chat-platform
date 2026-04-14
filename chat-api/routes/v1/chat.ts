import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import { sentimentAnalyzer, SentimentLabel } from '../../src/services/sentiment-analyzer.js';
import { resolveSourceConfig } from '../../src/services/message-routing.js';
import { generateText } from '../../src/services/llm.js';
import { persistInteraction } from '../../src/services/chat-storage.js';

const router = Router();

const chatRequestSchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(300, 'Message must be 300 characters or less'),
  accountNumber: z.coerce.number().int().positive(),
  sourceClient: z.string().min(1).max(64).optional(),
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
  is_troll: z.boolean().optional().nullable(),
});

const normalizeTopicLabel = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .slice(0, 2)
    .join(' ')
    .trim();

  return normalized || null;
};

const inferMeta = async (params: {
  message: string;
  provider: Parameters<typeof generateText>[0]['provider'];
  model: string;
  apiKey: string;
}): Promise<{
  topic: string | null;
  is_troll: boolean;
}> => {
  try {
    const text = await generateText({
      provider: params.provider,
      model: params.model,
      apiKey: params.apiKey,
      prompt:
        'You analyze one chat message at a time. Return ONLY valid JSON with keys ' +
        '"topic" and "is_troll". ' +
        'The topic must be the main subject of the message in one or two words only. ' +
        'Use concise lowercase wording such as "school drama", "new game", "family", "money", "bug report". ' +
        'If the topic is unclear, use "general". ' +
        'Set is_troll=true only for harassment, hate speech, threats, sexual harassment, doxxing, or repeated abuse/spam. ' +
        'Do not include explanations, markdown, or extra keys.',
      message: params.message,
    });

    const parsed = inferenceSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      throw new Error('LLM inference response invalid');
    }

    return {
      topic: normalizeTopicLabel(parsed.data.topic) ?? 'general',
      is_troll: parsed.data.is_troll ?? false,
    };
  } catch (err) {
    logger.warn({ err }, 'topic inference failed, using defaults');
    return { topic: null, is_troll: false };
  }
};

router.post('/stream', async (req: Request, res: Response) => {
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
    sourceClient,
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

  const apiKey = req.header('x-api-key');
  let resolvedSource;
  try {
    resolvedSource = await resolveSourceConfig(accountNumber, sourceClient);
  } catch (err) {
    logger.warn({ err, accountNumber, sourceClient }, 'invalid source client');
    return res.status(400).json({ error: 'Invalid sourceClient' });
  }
  logger.info(
    {
      accountNumber,
      resolvedSource: resolvedSource.sourceName,
      sourceProvider: resolvedSource.sourceProvider,
      destinationProvider: resolvedSource.destination.provider,
      destinationModel: resolvedSource.destination.model,
      hasPrompt: Boolean(resolvedSource.prompt && resolvedSource.prompt.trim()),
      hasApiKey: Boolean(resolvedSource.accountApiKey),
    },
    'source configuration loaded'
  );
  const expectedKey = resolvedSource.accountApiKey;

  if (!apiKey || !expectedKey || apiKey !== expectedKey) {
    logger.warn(
      {
        accountNumber,
        hasApiKeyHeader: Boolean(apiKey),
        hasExpectedKey: Boolean(expectedKey),
      },
      'unauthorized request'
    );
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const resolvedSourceClient = resolvedSource.sourceName;

  logger.info(
    {
      accountNumber,
      sourceClient: resolvedSourceClient,
      playerId,
      robloxUsername,
      sessionId,
      conversationId,
      gender,
      location,
      clientTimestamp,
      message,
      messageLength: message.length,
    },
    'chat request received'
  );

  generateText({
    provider: resolvedSource.destination.provider,
    model: resolvedSource.destination.model,
    apiKey: resolvedSource.destination.apiKey,
    prompt: resolvedSource.prompt?.trim() || null,
    message,
  })
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
        const sentiment = sentimentAnalyzer.analyze(message);
        const { topic, is_troll } = await inferMeta({
          message,
          provider: resolvedSource.destination.provider,
          model: resolvedSource.destination.model,
          apiKey: resolvedSource.destination.apiKey,
        });
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
          sourceClient: resolvedSourceClient,
        });
      })().catch((err) => {
        logger.error({ err }, 'Failed to persist chat interaction');
      });
    })
    .catch((err) => {
      logger.error({ err }, 'LLM request failed');
      return res.status(502).json({ error: 'Upstream AI request failed' });
    });
});

export default router;
