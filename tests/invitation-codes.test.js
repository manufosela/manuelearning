import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
}));

const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: (...args) => mockGetDocs(...args),
  doc: vi.fn(),
  updateDoc: (...args) => mockUpdateDoc(...args),
  increment: vi.fn((n) => n),
}));

import {
  validateInvitationCode,
  markCodeAsUsed,
  normalizeCode,
} from '../src/lib/firebase/invitation-codes.js';

describe('normalizeCode', () => {
  it('should uppercase the code', () => {
    expect(normalizeCode('abc123')).toBe('ABC123');
  });

  it('should trim whitespace', () => {
    expect(normalizeCode('  ABC  ')).toBe('ABC');
  });

  it('should handle null/undefined', () => {
    expect(normalizeCode(null)).toBe('');
    expect(normalizeCode(undefined)).toBe('');
  });

  it('should handle empty string', () => {
    expect(normalizeCode('')).toBe('');
  });
});

describe('validateInvitationCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject empty code', async () => {
    const result = await validateInvitationCode('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('obligatorio');
  });

  it('should reject null code', async () => {
    const result = await validateInvitationCode(null);
    expect(result.valid).toBe(false);
  });

  it('should reject whitespace-only code', async () => {
    const result = await validateInvitationCode('   ');
    expect(result.valid).toBe(false);
  });

  it('should reject code not found in Firestore', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

    const result = await validateInvitationCode('INVALID');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('no válido');
  });

  it('should reject inactive code', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'doc1',
          data: () => ({ code: 'TEST123', cohortId: 'cohort1', maxUses: 10, usedCount: 0, active: false }),
        },
      ],
    });

    const result = await validateInvitationCode('TEST123');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('desactivado');
  });

  it('should reject code that exceeded max uses', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'doc1',
          data: () => ({ code: 'TEST123', cohortId: 'cohort1', maxUses: 5, usedCount: 5, active: true }),
        },
      ],
    });

    const result = await validateInvitationCode('TEST123');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('límite de usos');
  });

  it('should accept valid active code with remaining uses', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'doc1',
          data: () => ({ code: 'TEST123', cohortId: 'cohort1', maxUses: 10, usedCount: 3, active: true }),
        },
      ],
    });

    const result = await validateInvitationCode('test123');
    expect(result.valid).toBe(true);
    expect(result.cohortId).toBe('cohort1');
    expect(result.docId).toBe('doc1');
  });

  it('should handle Firestore errors gracefully', async () => {
    mockGetDocs.mockRejectedValue(new Error('Network error'));

    const result = await validateInvitationCode('TEST123');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Error al validar');
  });
});

describe('markCodeAsUsed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true on success', async () => {
    mockUpdateDoc.mockResolvedValue();

    const result = await markCodeAsUsed('doc1');
    expect(result).toBe(true);
    expect(mockUpdateDoc).toHaveBeenCalled();
  });

  it('should return false on Firestore error', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('Permission denied'));

    const result = await markCodeAsUsed('doc1');
    expect(result).toBe(false);
  });
});
