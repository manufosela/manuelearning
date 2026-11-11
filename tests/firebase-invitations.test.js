import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));

const mockSetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(() => 'invitations-col'),
  doc: vi.fn((_db, col, id) => `${col}/${id}`),
  setDoc: (...args) => mockSetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
  Timestamp: { fromDate: (date) => ({ toDate: () => date }) },
}));

import {
  createInvitation,
  fetchPendingInvitations,
  revokeInvitation,
} from '../src/lib/firebase/invitations.js';

const expiresAt = new Date('2026-12-11T10:00:00Z');
const snapshot = (id, data) => ({ id, exists: () => true, data: () => data });

beforeEach(() => vi.clearAllMocks());

describe('createInvitation', () => {
  it('rejects an invalid email without writing', async () => {
    const result = await createInvitation({ email: 'no-es-email', cohortId: 'c1', createdBy: 'admin1' });
    expect(result.success).toBe(false);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('stores a pending invitation under a random token with a normalized email', async () => {
    mockSetDoc.mockResolvedValue();
    const result = await createInvitation({ email: ' Ana@Example.com ', cohortId: 'c1', createdBy: 'admin1' });

    expect(result.success).toBe(true);
    expect(result.invitation.id).toMatch(/^[0-9a-f-]{36}$/);
    const [ref, data] = mockSetDoc.mock.calls[0];
    expect(ref).toBe(`invitations/${result.invitation.id}`);
    expect(data).toMatchObject({ email: 'ana@example.com', cohortId: 'c1', status: 'pending', createdBy: 'admin1' });
    expect(data.expiresAt.toDate().getTime()).toBeGreaterThan(Date.now());
  });

  it('reports Firestore failures', async () => {
    mockSetDoc.mockRejectedValue(new Error('denied'));
    const result = await createInvitation({ email: 'ana@example.com', cohortId: '', createdBy: 'admin1' });
    expect(result.success).toBe(false);
  });
});

describe('fetchPendingInvitations', () => {
  it('maps documents with expiresAt as Date', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [snapshot('t1', { email: 'ana@example.com', cohortId: 'c1', status: 'pending', expiresAt: { toDate: () => expiresAt } })],
    });
    const result = await fetchPendingInvitations();
    expect(result.success).toBe(true);
    expect(result.invitations).toEqual([
      { id: 't1', email: 'ana@example.com', cohortId: 'c1', status: 'pending', expiresAt },
    ]);
  });
});

describe('revokeInvitation', () => {
  it('marks the invitation as revoked', async () => {
    mockUpdateDoc.mockResolvedValue();
    const result = await revokeInvitation('t1');
    expect(result.success).toBe(true);
    expect(mockUpdateDoc).toHaveBeenCalledWith('invitations/t1', { status: 'revoked' });
  });

  it('rejects an empty token', async () => {
    expect((await revokeInvitation('')).success).toBe(false);
  });
});
