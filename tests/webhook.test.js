import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendWebhook, buildQuestionPayload } from '../src/lib/webhook.js';

/* ── buildQuestionPayload ─────────────────────────────────── */
describe('buildQuestionPayload', () => {
  it('should build payload with required fields', () => {
    const payload = buildQuestionPayload({
      questionId: 'q1',
      text: 'What is LPS?',
      userName: 'Juan',
      lessonId: 'l1',
      moduleId: 'm1',
    });
    expect(payload.event).toBe('new_question');
    expect(payload.data.questionId).toBe('q1');
    expect(payload.data.text).toBe('What is LPS?');
    expect(payload.timestamp).toBeDefined();
  });

  it('should include all data fields', () => {
    const payload = buildQuestionPayload({
      questionId: 'q1',
      text: 'Q?',
      userName: 'U',
      lessonId: 'l1',
      moduleId: 'm1',
    });
    expect(payload.data).toHaveProperty('questionId');
    expect(payload.data).toHaveProperty('text');
    expect(payload.data).toHaveProperty('userName');
    expect(payload.data).toHaveProperty('lessonId');
    expect(payload.data).toHaveProperty('moduleId');
  });
});

/* ── sendWebhook ──────────────────────────────────────────── */
describe('sendWebhook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return false if no URL provided', async () => {
    const result = await sendWebhook('', { event: 'test' });
    expect(result.success).toBe(false);
  });

  it('should send POST request to webhook URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    const result = await sendWebhook('https://n8n.example.com/webhook/123', { event: 'test' });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://n8n.example.com/webhook/123',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('should handle fetch errors gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const result = await sendWebhook('https://n8n.example.com/webhook/123', { event: 'test' });
    expect(result.success).toBe(false);
  });

  it('should handle non-ok responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const result = await sendWebhook('https://n8n.example.com/webhook/123', { event: 'test' });
    expect(result.success).toBe(false);
  });
});
