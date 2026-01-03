import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

const chatRequestSchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(200, 'Message must be 200 characters or less'),
});

router.post('/stream', (req: Request, res: Response) => {
  // Validate request body
  const validationResult = chatRequestSchema.safeParse(req.body);

  if (!validationResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationResult.error.errors,
    });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send meta event
  res.write(`event: meta\n`);
  res.write(`data: ${JSON.stringify({ ok: true, cache: 'miss' })}\n\n`);

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


