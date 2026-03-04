import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
}));

const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn();
const mockAddDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: (...args) => mockGetDocs(...args),
  doc: vi.fn(),
  addDoc: (...args) => mockAddDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  increment: vi.fn((n) => n),
}));

import {
  validateInvitationCode,
  markCodeAsUsed,
  normalizeCode,
  fetchCodesByCohort,
  createInvitationCode,
  toggleCodeActive,
  generateCodeString,
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

describe('generateCodeString', () => {
  it('should generate an 8-character string', () => {
    const code = generateCodeString();
    expect(code).toHaveLength(8);
  });

  it('should only contain uppercase alphanumeric chars', () => {
    const code = generateCodeString();
    expect(code).toMatch(/^[A-Z2-9]+$/);
  });

  it('should not contain ambiguous characters (0, 1, I, O)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCodeString();
      expect(code).not.toMatch(/[01IO]/);
    }
  });
});

describe('fetchCodesByCohort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return codes for a cohort', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'c1', data: () => ({ code: 'ABC123', cohortId: 'cohort1', maxUses: 10, usedCount: 2, active: true }) },
        { id: 'c2', data: () => ({ code: 'XYZ789', cohortId: 'cohort1', maxUses: 5, usedCount: 5, active: false }) },
      ],
    });

    const result = await fetchCodesByCohort('cohort1');
    expect(result.success).toBe(true);
    expect(result.codes).toHaveLength(2);
    expect(result.codes[0].code).toBe('ABC123');
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('Network error'));

    const result = await fetchCodesByCohort('cohort1');
    expect(result.success).toBe(false);
  });
});

describe('createInvitationCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fail without cohortId', async () => {
    const result = await createInvitationCode('');
    expect(result.success).toBe(false);
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('should create a code with default maxUses', async () => {
    mockAddDoc.mockResolvedValue({ id: 'newDoc' });

    const result = await createInvitationCode('cohort1');
    expect(result.success).toBe(true);
    expect(result.code).toHaveLength(8);
    expect(mockAddDoc).toHaveBeenCalled();
  });

  it('should create a code with custom maxUses', async () => {
    mockAddDoc.mockResolvedValue({ id: 'newDoc' });

    const result = await createInvitationCode('cohort1', 25);
    expect(result.success).toBe(true);
  });

  it('should handle Firestore errors', async () => {
    mockAddDoc.mockRejectedValue(new Error('Permission denied'));

    const result = await createInvitationCode('cohort1');
    expect(result.success).toBe(false);
  });
});

describe('toggleCodeActive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update the active field', async () => {
    mockUpdateDoc.mockResolvedValue();

    const result = await toggleCodeActive('doc1', false);
    expect(result.success).toBe(true);
    expect(mockUpdateDoc).toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('Error'));

    const result = await toggleCodeActive('doc1', true);
    expect(result.success).toBe(false);
  });
});
