import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));

const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: (...a) => mockGetDocs(...a),
  getDoc: (...a) => mockGetDoc(...a),
  addDoc: (...a) => mockAddDoc(...a),
  updateDoc: (...a) => mockUpdateDoc(...a),
  deleteDoc: (...a) => mockDeleteDoc(...a),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS'),
}));

import {
  validateSession,
  fetchAllSessions,
  fetchSession,
  createSession,
  updateSession,
  deleteSession,
  fetchSessionsByCohort,
} from '../src/lib/firebase/sessions.js';

/* ── validateSession ──────────────────────────────────────── */
describe('validateSession', () => {
  const valid = {
    title: 'Sesión 1: Introducción',
    date: '2026-03-15',
    time: '10:00',
    duration: 90,
    zoomUrl: 'https://zoom.us/j/1234567890',
    moduleId: 'm1',
    cohortId: 'c1',
  };

  it('should reject empty title', () => {
    expect(validateSession({ ...valid, title: '' }).valid).toBe(false);
  });

  it('should reject missing date', () => {
    expect(validateSession({ ...valid, date: '' }).valid).toBe(false);
  });

  it('should reject missing time', () => {
    expect(validateSession({ ...valid, time: '' }).valid).toBe(false);
  });

  it('should reject missing duration', () => {
    expect(validateSession({ ...valid, duration: 0 }).valid).toBe(false);
  });

  it('should reject negative duration', () => {
    expect(validateSession({ ...valid, duration: -30 }).valid).toBe(false);
  });

  it('should reject missing zoomUrl', () => {
    expect(validateSession({ ...valid, zoomUrl: '' }).valid).toBe(false);
  });

  it('should reject missing moduleId', () => {
    expect(validateSession({ ...valid, moduleId: '' }).valid).toBe(false);
  });

  it('should reject missing cohortId', () => {
    expect(validateSession({ ...valid, cohortId: '' }).valid).toBe(false);
  });

  it('should accept valid session', () => {
    expect(validateSession(valid).valid).toBe(true);
  });

  it('should accept session without optional quizId', () => {
    expect(validateSession({ ...valid, quizId: '' }).valid).toBe(true);
  });
});

/* ── fetchAllSessions ─────────────────────────────────────── */
describe('fetchAllSessions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return sessions on success', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 's1', data: () => ({ title: 'Sesión 1', date: '2026-03-15' }) },
        { id: 's2', data: () => ({ title: 'Sesión 2', date: '2026-03-22' }) },
      ],
    });
    const result = await fetchAllSessions();
    expect(result.success).toBe(true);
    expect(result.sessions).toHaveLength(2);
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    expect((await fetchAllSessions()).success).toBe(false);
  });
});

/* ── fetchSession ─────────────────────────────────────────── */
describe('fetchSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty id', async () => {
    expect((await fetchSession('')).success).toBe(false);
  });

  it('should return session on success', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 's1',
      data: () => ({ title: 'Sesión 1' }),
    });
    const result = await fetchSession('s1');
    expect(result.success).toBe(true);
    expect(result.session.title).toBe('Sesión 1');
  });

  it('should return error when not found', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    expect((await fetchSession('x')).success).toBe(false);
  });

  it('should handle errors', async () => {
    mockGetDoc.mockRejectedValue(new Error('err'));
    expect((await fetchSession('s1')).success).toBe(false);
  });
});

/* ── createSession ────────────────────────────────────────── */
describe('createSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject invalid data', async () => {
    expect((await createSession({ title: '' })).success).toBe(false);
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('should create session on success', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new-s' });
    const data = {
      title: 'Sesión 1',
      date: '2026-03-15',
      time: '10:00',
      duration: 90,
      zoomUrl: 'https://zoom.us/j/123',
      moduleId: 'm1',
      cohortId: 'c1',
    };
    const result = await createSession(data);
    expect(result.success).toBe(true);
    expect(result.id).toBe('new-s');
  });

  it('should handle Firestore errors', async () => {
    mockAddDoc.mockRejectedValue(new Error('err'));
    const data = {
      title: 'Sesión 1',
      date: '2026-03-15',
      time: '10:00',
      duration: 90,
      zoomUrl: 'https://zoom.us/j/123',
      moduleId: 'm1',
      cohortId: 'c1',
    };
    expect((await createSession(data)).success).toBe(false);
  });
});

/* ── updateSession ────────────────────────────────────────── */
describe('updateSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty id', async () => {
    expect((await updateSession('', {})).success).toBe(false);
  });

  it('should update on success', async () => {
    mockUpdateDoc.mockResolvedValue();
    expect((await updateSession('s1', { title: 'Updated' })).success).toBe(true);
  });

  it('should handle errors', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('err'));
    expect((await updateSession('s1', {})).success).toBe(false);
  });
});

/* ── deleteSession ────────────────────────────────────────── */
describe('deleteSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty id', async () => {
    expect((await deleteSession('')).success).toBe(false);
  });

  it('should delete on success', async () => {
    mockDeleteDoc.mockResolvedValue();
    expect((await deleteSession('s1')).success).toBe(true);
  });

  it('should handle errors', async () => {
    mockDeleteDoc.mockRejectedValue(new Error('err'));
    expect((await deleteSession('s1')).success).toBe(false);
  });
});

/* ── fetchSessionsByCohort ────────────────────────────────── */
describe('fetchSessionsByCohort', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty cohortId', async () => {
    expect((await fetchSessionsByCohort('')).success).toBe(false);
  });

  it('should return sessions for a cohort', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 's1', data: () => ({ title: 'Sesión 1', cohortId: 'c1' }) },
      ],
    });
    const result = await fetchSessionsByCohort('c1');
    expect(result.success).toBe(true);
    expect(result.sessions).toHaveLength(1);
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    expect((await fetchSessionsByCohort('c1')).success).toBe(false);
  });
});
