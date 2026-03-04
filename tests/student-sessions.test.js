import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));

const mockGetDocs = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: (...a) => mockGetDocs(...a),
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS'),
}));

import { fetchSessionsByCohort } from '../src/lib/firebase/sessions.js';

/* ── fetchSessionsByCohort for student view ───────────────── */
describe('fetchSessionsByCohort (student view)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return upcoming sessions for a cohort', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 's1', data: () => ({ title: 'Sesión 1', date: '2026-03-15', time: '10:00', cohortId: 'c1', zoomUrl: 'https://zoom.us/j/1' }) },
        { id: 's2', data: () => ({ title: 'Sesión 2', date: '2026-03-22', time: '10:00', cohortId: 'c1', zoomUrl: 'https://zoom.us/j/2' }) },
      ],
    });
    const result = await fetchSessionsByCohort('c1');
    expect(result.success).toBe(true);
    expect(result.sessions).toHaveLength(2);
    expect(result.sessions[0].title).toBe('Sesión 1');
  });

  it('should return empty when no sessions', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const result = await fetchSessionsByCohort('c1');
    expect(result.success).toBe(true);
    expect(result.sessions).toHaveLength(0);
  });

  it('should reject empty cohortId', async () => {
    const result = await fetchSessionsByCohort('');
    expect(result.success).toBe(false);
  });
});

/* ── Session filtering helpers ────────────────────────────── */
describe('session filtering helpers', () => {
  const sessions = [
    { id: 's1', title: 'Pasada', date: '2025-01-01', time: '10:00' },
    { id: 's2', title: 'Futura', date: '2027-12-31', time: '10:00' },
    { id: 's3', title: 'Hoy futura', date: new Date().toISOString().split('T')[0], time: '23:59' },
  ];

  it('should filter upcoming sessions', () => {
    const today = new Date().toISOString().split('T')[0];
    const upcoming = sessions.filter((s) => s.date >= today);
    expect(upcoming.length).toBeGreaterThanOrEqual(2);
    expect(upcoming.find((s) => s.title === 'Pasada')).toBeUndefined();
  });

  it('should sort sessions by date ascending', () => {
    const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
    expect(sorted[0].title).toBe('Pasada');
    expect(sorted[sorted.length - 1].title).toBe('Futura');
  });
});
