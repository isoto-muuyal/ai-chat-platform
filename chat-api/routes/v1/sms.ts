import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from '../../config/logger.js';
import { sentimentAnalyzer } from '../../src/services/sentiment-analyzer.js';
import { resolveTwilioSmsSource } from '../../src/services/message-routing.js';
import { generateText } from '../../src/services/llm.js';
import { buildAgentPrompt } from '../../src/services/agent-context.js';
import { getOrCreateChannelConversation, persistInteraction } from '../../src/services/chat-storage.js';
import { assertUsageAllowed } from '../../src/services/usage-limits.js';

const router = Router();

const buildTwilioSignature = (authToken: string, url: string, body: Record<string, string | string[] | undefined>) => {
  const sortedKeys = Object.keys(body).sort();
  const data = sortedKeys.reduce((acc, key) => {
    const rawValue = body[key];
    if (Array.isArray(rawValue)) {
      return `${acc}${key}${rawValue.join('')}`;
    }
    return `${acc}${key}${rawValue ?? ''}`;
  }, url);

  return crypto.createHmac('sha1', authToken).update(data).digest('base64');
};

const validateTwilioRequest = (req: Request, authToken: string): boolean => {
  const signature = req.header('x-twilio-signature');
  if (!signature) {
    return false;
  }

  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const expected = buildTwilioSignature(authToken, url, req.body as Record<string, string | string[] | undefined>);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

router.post('/twilio/webhook', async (req: Request, res: Response) => {
  const toNumber = typeof req.body?.To === 'string' ? req.body.To : '';
  const fromNumber = typeof req.body?.From === 'string' ? req.body.From : '';
  const incomingMessage = typeof req.body?.Body === 'string' ? req.body.Body.trim() : '';

  if (!toNumber || !fromNumber) {
    return res.status(400).json({ error: 'Missing Twilio identifiers' });
  }

  const resolved = await resolveTwilioSmsSource(toNumber);
  if (!resolved) {
    logger.warn({ toNumber }, 'twilio sms source not found');
    return res.status(404).json({ error: 'Source not found' });
  }

  if (!resolved.config.providerSecret || !validateTwilioRequest(req, resolved.config.providerSecret)) {
    logger.warn({ toNumber }, 'invalid twilio sms signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  if (!incomingMessage) {
    res.type('text/xml');
    return res.send('<Response />');
  }

  try {
    const conversationId = await getOrCreateChannelConversation(
      resolved.accountNumber,
      resolved.config.sourceName || 'sms',
      fromNumber
    );
    const usage = await assertUsageAllowed({ accountNumber: resolved.accountNumber, conversationId });
    if (!usage.allowed) {
      res.type('text/xml');
      return res.send('<Response><Message>This account has run out of credits. Please add credit to continue.</Message></Response>');
    }

    const prompt = await buildAgentPrompt({
      accountNumber: resolved.accountNumber,
      sourceName: resolved.config.sourceName,
      basePrompt: resolved.config.prompt,
    });
    const text = await generateText({
      provider: resolved.config.destination.provider,
      model: resolved.config.destination.model,
      apiKey: resolved.config.destination.apiKey,
      prompt,
      message: incomingMessage,
    });

    const sentiment = sentimentAnalyzer.analyze(incomingMessage);
    await persistInteraction({
      conversationId,
      accountNumber: resolved.accountNumber,
      robloxUserId: null,
      userMessage: incomingMessage,
      aiMessage: text,
      topic: 'general',
      sentiment,
      isTroll: false,
      sourceClient: resolved.config.sourceName,
    });

    res.type('text/xml');
    return res.send(`<Response><Message>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message></Response>`);
  } catch (err) {
    logger.error({ err, toNumber }, 'twilio sms webhook failed');
    res.type('text/xml');
    return res.send('<Response><Message>We are unavailable right now. Please try again shortly.</Message></Response>');
  }
});

export default router;
