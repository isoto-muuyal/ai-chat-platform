import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('POST /v1/chat/stream', () => {
  it('should stream SSE events in correct order: meta -> token -> done', async () => {
    const response = await request(app)
      .post('/v1/chat/stream')
      .send({ message: 'Hello, world!' })
      .expect('Content-Type', /text\/event-stream/)
      .expect(200);

    const text = response.text;
    
    // Parse SSE events (format: event: <name>\ndata: <json>\n\n)
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
        events.push({
          event,
          data: JSON.parse(data),
        });
      }
    }

    // Assert event order and content
    expect(events).toHaveLength(3);
    expect(events[0].event).toBe('meta');
    expect(events[0].data).toEqual({ ok: true, cache: 'miss' });
    
    expect(events[1].event).toBe('token');
    expect(events[1].data).toEqual({ text: 'Tema: demo\n' });
    
    expect(events[2].event).toBe('done');
    expect(events[2].data).toEqual({ ok: true });
  });

  it('should return 400 if message is missing', async () => {
    await request(app)
      .post('/v1/chat/stream')
      .send({})
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe('Validation failed');
        expect(res.body.details).toBeDefined();
      });
  });

  it('should return 400 if message exceeds 200 characters', async () => {
    const longMessage = 'a'.repeat(201);
    await request(app)
      .post('/v1/chat/stream')
      .send({ message: longMessage })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe('Validation failed');
        expect(res.body.details).toBeDefined();
      });
  });

  it('should accept message with exactly 200 characters', async () => {
    const message = 'a'.repeat(200);
    await request(app)
      .post('/v1/chat/stream')
      .send({ message })
      .expect('Content-Type', /text\/event-stream/)
      .expect(200);
  });
});

