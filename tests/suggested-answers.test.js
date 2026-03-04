import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));

const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: (...a) => mockGetDocs(...a),
  getDoc: vi.fn(),
  addDoc: (...a) => mockAddDoc(...a),
  updateDoc: (...a) => mockUpdateDoc(...a),
  deleteDoc: (...a) => mockDeleteDoc(...a),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS'),
}));

import {
  createSuggestedAnswer,
  fetchSuggestedByQuestion,
  fetchPendingSuggestions,
  approveSuggestion,
  rejectSuggestion,
} from '../src/lib/firebase/suggested-answers.js';

/* ── createSuggestedAnswer ────────────────────────────────── */
describe('createSuggestedAnswer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty questionId', async () => {
    expect((await createSuggestedAnswer({ questionId: '', answer: 'A' })).success).toBe(false);
  });

  it('should reject empty answer', async () => {
    expect((await createSuggestedAnswer({ questionId: 'q1', answer: '' })).success).toBe(false);
  });

  it('should create suggestion on success', async () => {
    mockAddDoc.mockResolvedValue({ id: 'sa1' });
    const result = await createSuggestedAnswer({ questionId: 'q1', answer: 'LPS is...', sources: ['M1'] });
    expect(result.success).toBe(true);
    expect(result.id).toBe('sa1');
  });

  it('should handle errors', async () => {
    mockAddDoc.mockRejectedValue(new Error('err'));
    expect((await createSuggestedAnswer({ questionId: 'q1', answer: 'A' })).success).toBe(false);
  });
});

/* ── fetchSuggestedByQuestion ─────────────────────────────── */
describe('fetchSuggestedByQuestion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty questionId', async () => {
    expect((await fetchSuggestedByQuestion('')).success).toBe(false);
  });

  it('should return suggestions', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: 'sa1', data: () => ({ answer: 'A', status: 'pending' }) }],
    });
    const result = await fetchSuggestedByQuestion('q1');
    expect(result.success).toBe(true);
    expect(result.suggestions).toHaveLength(1);
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    expect((await fetchSuggestedByQuestion('q1')).success).toBe(false);
  });
});

/* ── fetchPendingSuggestions ───────────────────────────────── */
describe('fetchPendingSuggestions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return pending suggestions', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'sa1', data: () => ({ answer: 'A1', status: 'pending' }) },
        { id: 'sa2', data: () => ({ answer: 'A2', status: 'pending' }) },
      ],
    });
    const result = await fetchPendingSuggestions();
    expect(result.success).toBe(true);
    expect(result.suggestions).toHaveLength(2);
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    expect((await fetchPendingSuggestions()).success).toBe(false);
  });
});

/* ── approveSuggestion ────────────────────────────────────── */
describe('approveSuggestion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty id', async () => {
    expect((await approveSuggestion('')).success).toBe(false);
  });

  it('should approve on success', async () => {
    mockUpdateDoc.mockResolvedValue();
    expect((await approveSuggestion('sa1')).success).toBe(true);
  });

  it('should handle errors', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('err'));
    expect((await approveSuggestion('sa1')).success).toBe(false);
  });
});

/* ── rejectSuggestion ─────────────────────────────────────── */
describe('rejectSuggestion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty id', async () => {
    expect((await rejectSuggestion('')).success).toBe(false);
  });

  it('should reject on success', async () => {
    mockUpdateDoc.mockResolvedValue();
    expect((await rejectSuggestion('sa1')).success).toBe(true);
  });

  it('should handle errors', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('err'));
    expect((await rejectSuggestion('sa1')).success).toBe(false);
  });
});
