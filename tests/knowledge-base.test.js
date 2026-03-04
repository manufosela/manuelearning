import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryKnowledgeBase, buildKnowledgeQuery } from '../src/lib/knowledge-base.js';

/* ── buildKnowledgeQuery ──────────────────────────────────── */
describe('buildKnowledgeQuery', () => {
  it('should build query with question text', () => {
    const query = buildKnowledgeQuery('What is Last Planner System?', 'l1', 'm1');
    expect(query.question).toBe('What is Last Planner System?');
    expect(query.context.lessonId).toBe('l1');
    expect(query.context.moduleId).toBe('m1');
  });

  it('should include timestamp', () => {
    const query = buildKnowledgeQuery('Q?', 'l1', 'm1');
    expect(query.timestamp).toBeDefined();
  });
});

/* ── queryKnowledgeBase ───────────────────────────────────── */
describe('queryKnowledgeBase', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('should return error if no endpoint', async () => {
    const result = await queryKnowledgeBase('', 'question');
    expect(result.success).toBe(false);
  });

  it('should return error if no question', async () => {
    const result = await queryKnowledgeBase('https://api.example.com', '');
    expect(result.success).toBe(false);
  });

  it('should query endpoint and return answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ answer: 'LPS is a production planning system', sources: ['Module 1, Lesson 2'] }),
    }));
    const result = await queryKnowledgeBase('https://api.example.com/query', 'What is LPS?');
    expect(result.success).toBe(true);
    expect(result.answer).toBe('LPS is a production planning system');
    expect(result.sources).toHaveLength(1);
  });

  it('should handle network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network')));
    const result = await queryKnowledgeBase('https://api.example.com/query', 'Q?');
    expect(result.success).toBe(false);
  });

  it('should handle non-ok responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const result = await queryKnowledgeBase('https://api.example.com/query', 'Q?');
    expect(result.success).toBe(false);
  });
});
