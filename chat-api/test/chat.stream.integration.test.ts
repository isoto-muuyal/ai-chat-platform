import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

// Integration tests — require a live DB and Gemini API key.
// Run with: npm run test:integration

describe('POST /v1/chat/stream', () => {
  it('should stream SSE events in correct order: meta -> token -> done', async () => {
    const response = await request(app)
      .post('/v1/chat/stream')
      .send({ message: 'Hello, world!' })
      .expect('Content-Type', /text\/event-stream/)
      .expect(200);

    const text = response.text;

    const events: Array<{ event: string; data: unknown }> = [];
    const blocks = text.split('\n\n').filter(block => block.trim());

    for (const block of blocks) {
      const lines = block.split('\n');
      let event: string | undefined;
      let data: string | undefined;

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          event = line.substring(7).trim();
        } else if (line.startsWith('data: ')) {
          data = line.substring(6).trim();
        }
      }

      if (event && data) {
        events.push({ event, data: JSON.parse(data) });
      }
    }

    expect(events).toHaveLength(3);
    expect(events[0].event).toBe('meta');
    expect(events[1].event).toBe('token');
    expect(events[2].event).toBe('done');
    expect((events[2].data as Record<string, unknown>).ok).toBe(true);
  });
});
