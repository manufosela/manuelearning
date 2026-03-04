import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));

const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: (...a) => mockGetDocs(...a),
  getDoc: (...a) => mockGetDoc(...a),
  addDoc: (...a) => mockAddDoc(...a),
  updateDoc: (...a) => mockUpdateDoc(...a),
  query: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS'),
}));

import {
  validateCohort,
  fetchAllCohorts,
  fetchCohort,
  createCohort,
  updateCohort,
} from '../src/lib/firebase/cohorts.js';

describe('validateCohort', () => {
  const valid = { name: 'Cohorte Marzo', code: '2026-03', startDate: '2026-03-01', expiryDate: '2026-06-01' };

  it('should reject empty name', () => {
    expect(validateCohort({ ...valid, name: '' }).valid).toBe(false);
  });

  it('should reject invalid code format', () => {
    expect(validateCohort({ ...valid, code: 'March2026' }).valid).toBe(false);
  });

  it('should reject missing startDate', () => {
    expect(validateCohort({ ...valid, startDate: '' }).valid).toBe(false);
  });

  it('should reject missing expiryDate', () => {
    expect(validateCohort({ ...valid, expiryDate: '' }).valid).toBe(false);
  });

  it('should reject expiryDate before startDate', () => {
    expect(validateCohort({ ...valid, expiryDate: '2026-01-01' }).valid).toBe(false);
  });

  it('should accept valid cohort data', () => {
    expect(validateCohort(valid).valid).toBe(true);
  });
});

describe('fetchAllCohorts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return cohorts on success', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'c1', data: () => ({ name: 'C1', code: '2026-03' }) },
        { id: 'c2', data: () => ({ name: 'C2', code: '2026-04' }) },
      ],
    });
    const result = await fetchAllCohorts();
    expect(result.success).toBe(true);
    expect(result.cohorts).toHaveLength(2);
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    const result = await fetchAllCohorts();
    expect(result.success).toBe(false);
  });
});

describe('fetchCohort', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty id', async () => {
    expect((await fetchCohort('')).success).toBe(false);
  });

  it('should return cohort on success', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, id: 'c1', data: () => ({ name: 'C1' }) });
    const result = await fetchCohort('c1');
    expect(result.success).toBe(true);
    expect(result.cohort.name).toBe('C1');
  });

  it('should return error when not found', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    expect((await fetchCohort('x')).success).toBe(false);
  });
});

describe('createCohort', () => {
  beforeEach(() => vi.clearAllMocks());
  const valid = { name: 'C1', code: '2026-03', startDate: '2026-03-01', expiryDate: '2026-06-01' };

  it('should reject invalid data', async () => {
    expect((await createCohort({ ...valid, name: '' })).success).toBe(false);
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('should create cohort on success', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new-id' });
    const result = await createCohort(valid);
    expect(result.success).toBe(true);
    expect(result.id).toBe('new-id');
  });

  it('should handle Firestore errors', async () => {
    mockAddDoc.mockRejectedValue(new Error('err'));
    expect((await createCohort(valid)).success).toBe(false);
  });
});

describe('updateCohort', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty id', async () => {
    expect((await updateCohort('', {})).success).toBe(false);
  });

  it('should update on success', async () => {
    mockUpdateDoc.mockResolvedValue();
    expect((await updateCohort('c1', { active: false })).success).toBe(true);
  });

  it('should handle errors', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('err'));
    expect((await updateCohort('c1', {})).success).toBe(false);
  });
});
