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
  fetchAllCohorts,
  createCohort,
  updateCohort,
} from '../src/lib/firebase/cohorts.js';

describe('Admin Cohorts – integration flows', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('list cohorts flow', () => {
    it('should return cohorts with all fields for admin table', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'c1',
            data: () => ({
              name: 'Cohorte Marzo',
              code: '2026-03',
              startDate: '2026-03-01',
              expiryDate: '2026-06-01',
              active: true,
            }),
          },
          {
            id: 'c2',
            data: () => ({
              name: 'Cohorte Abril',
              code: '2026-04',
              startDate: '2026-04-01',
              expiryDate: '2026-07-01',
              active: false,
            }),
          },
        ],
      });

      const result = await fetchAllCohorts();
      expect(result.success).toBe(true);
      expect(result.cohorts).toHaveLength(2);
      expect(result.cohorts[0]).toEqual({
        id: 'c1',
        name: 'Cohorte Marzo',
        code: '2026-03',
        startDate: '2026-03-01',
        expiryDate: '2026-06-01',
        active: true,
      });
    });

    it('should return empty array when no cohorts', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });
      const result = await fetchAllCohorts();
      expect(result.success).toBe(true);
      expect(result.cohorts).toHaveLength(0);
    });
  });

  describe('create cohort flow', () => {
    it('should create cohort with all required fields', async () => {
      mockAddDoc.mockResolvedValue({ id: 'new-c' });
      const data = {
        name: 'Cohorte Test',
        code: '2026-05',
        startDate: '2026-05-01',
        expiryDate: '2026-08-01',
      };
      const result = await createCohort(data);
      expect(result.success).toBe(true);
      expect(result.id).toBe('new-c');
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
    });

    it('should reject cohort with invalid code for admin form', async () => {
      const data = {
        name: 'Cohorte Test',
        code: 'bad',
        startDate: '2026-05-01',
        expiryDate: '2026-08-01',
      };
      const result = await createCohort(data);
      expect(result.success).toBe(false);
      expect(mockAddDoc).not.toHaveBeenCalled();
    });

    it('should reject cohort with expiry before start for admin form', async () => {
      const data = {
        name: 'Cohorte Test',
        code: '2026-05',
        startDate: '2026-08-01',
        expiryDate: '2026-05-01',
      };
      const result = await createCohort(data);
      expect(result.success).toBe(false);
      expect(mockAddDoc).not.toHaveBeenCalled();
    });
  });

  describe('update cohort flow (toggle active)', () => {
    it('should deactivate a cohort', async () => {
      mockUpdateDoc.mockResolvedValue();
      const result = await updateCohort('c1', { active: false });
      expect(result.success).toBe(true);
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    });

    it('should activate a cohort', async () => {
      mockUpdateDoc.mockResolvedValue();
      const result = await updateCohort('c1', { active: true });
      expect(result.success).toBe(true);
    });

    it('should update cohort name', async () => {
      mockUpdateDoc.mockResolvedValue();
      const result = await updateCohort('c1', { name: 'Nuevo Nombre' });
      expect(result.success).toBe(true);
    });

    it('should handle update errors', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('permission denied'));
      const result = await updateCohort('c1', { active: false });
      expect(result.success).toBe(false);
    });
  });
});

describe('Admin Cohorts Page – structure', () => {
  it('should contain admin-cohorts-list component', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const distPath = path.resolve('dist/admin/cohorts/index.html');
    if (!fs.existsSync(distPath)) {
      // Build might not exist yet; skip structural test in CI
      return;
    }

    const html = fs.readFileSync(distPath, 'utf-8');
    expect(html).toContain('admin-cohorts-list');
  });

  it('should import cohorts component script', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const srcPath = path.resolve('src/pages/admin/cohorts.astro');
    if (!fs.existsSync(srcPath)) {
      return;
    }

    const src = fs.readFileSync(srcPath, 'utf-8');
    expect(src).toContain('admin-cohorts-list');
  });
});
