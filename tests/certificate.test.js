import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));

const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: (...a) => mockGetDocs(...a),
  getDoc: vi.fn(),
  addDoc: (...a) => mockAddDoc(...a),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS'),
}));

import {
  saveCertificate,
  getUserCertificate,
  buildCertificateData,
} from '../src/lib/firebase/certificates.js';

/* ── buildCertificateData ─────────────────────────────────── */
describe('buildCertificateData', () => {
  it('should build certificate data with required fields', () => {
    const data = buildCertificateData('Juan Pérez', 'ManuElearning');
    expect(data.userName).toBe('Juan Pérez');
    expect(data.courseName).toBe('ManuElearning');
    expect(data.completedAt).toBeDefined();
  });

  it('should include current date', () => {
    const data = buildCertificateData('User', 'Course');
    const today = new Date().toISOString().split('T')[0];
    expect(data.completedAt).toContain(today);
  });
});

/* ── saveCertificate ──────────────────────────────────────── */
describe('saveCertificate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty userId', async () => {
    expect((await saveCertificate('', { userName: 'U', courseName: 'C' })).success).toBe(false);
  });

  it('should reject empty userName', async () => {
    expect((await saveCertificate('u1', { userName: '', courseName: 'C' })).success).toBe(false);
  });

  it('should save certificate on success', async () => {
    mockAddDoc.mockResolvedValue({ id: 'cert-1' });
    const result = await saveCertificate('u1', {
      userName: 'Juan',
      courseName: 'ManuElearning',
      completedAt: '2026-02-27',
    });
    expect(result.success).toBe(true);
    expect(result.id).toBe('cert-1');
  });

  it('should handle errors', async () => {
    mockAddDoc.mockRejectedValue(new Error('err'));
    expect((await saveCertificate('u1', { userName: 'U', courseName: 'C' })).success).toBe(false);
  });
});

/* ── getUserCertificate ───────────────────────────────────── */
describe('getUserCertificate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty userId', async () => {
    expect((await getUserCertificate('')).success).toBe(false);
  });

  it('should return null when no certificate', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const result = await getUserCertificate('u1');
    expect(result.success).toBe(true);
    expect(result.certificate).toBeNull();
  });

  it('should return certificate when exists', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: 'cert-1', data: () => ({ userName: 'Juan', completedAt: '2026-02-27' }) }],
    });
    const result = await getUserCertificate('u1');
    expect(result.success).toBe(true);
    expect(result.certificate.userName).toBe('Juan');
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    expect((await getUserCertificate('u1')).success).toBe(false);
  });
});
