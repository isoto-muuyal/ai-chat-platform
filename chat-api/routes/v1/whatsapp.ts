import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from '../../config/logger.js';
import { sentimentAnalyzer } from '../../src/services/sentiment-analyzer.js';
import { resolveTwilioWhatsAppSource } from '../../src/services/message-routing.js';
import { generateText } from '../../src/services/llm.js';
import { getOrCreateChannelConversation, persistInteraction } from '../../src/services/chat-storage.js';

const router = Router();

const xmlEscape = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

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

  const resolved = await resolveTwilioWhatsAppSource(toNumber);
  if (!resolved) {
    logger.warn({ toNumber }, 'twilio whatsapp source not found');
    return res.status(404).json({ error: 'Source not found' });
  }

  if (!resolved.config.providerSecret || !validateTwilioRequest(req, resolved.config.providerSecret)) {
    logger.warn({ toNumber }, 'invalid twilio signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  if (!incomingMessage) {
    res.type('text/xml');
    return res.send('<Response />');
  }

  try {
    const text = await generateText({
      provider: resolved.config.destination.provider,
      model: resolved.config.destination.model,
      apiKey: resolved.config.destination.apiKey,
      prompt: resolved.config.prompt,
      message: incomingMessage,
    });

    const conversationId = await getOrCreateChannelConversation(
      resolved.accountNumber,
      resolved.config.sourceName || 'whatsapp',
      fromNumber
    );

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
    return res.send(`<Response><Message>${xmlEscape(text)}</Message></Response>`);
  } catch (err) {
    logger.error({ err, toNumber }, 'twilio whatsapp webhook failed');
    res.type('text/xml');
    return res.send('<Response><Message>We are unavailable right now. Please try again shortly.</Message></Response>');
  }
});

export default router;
