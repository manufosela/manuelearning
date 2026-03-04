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
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS'),
}));

import {
  validateModule,
  validateLesson,
  fetchAllModules,
  fetchModule,
  createModule,
  updateModule,
  deleteModule,
  fetchLessons,
  fetchLesson,
  createLesson,
  updateLesson,
  deleteLesson,
} from '../src/lib/firebase/modules.js';

/* ── validateModule ─────────────────────────────────────────── */
describe('validateModule', () => {
  const valid = { title: 'Módulo 1', order: 1 };

  it('should reject empty title', () => {
    expect(validateModule({ ...valid, title: '' }).valid).toBe(false);
  });

  it('should reject missing order', () => {
    expect(validateModule({ ...valid, order: undefined }).valid).toBe(false);
  });

  it('should reject non-numeric order', () => {
    expect(validateModule({ ...valid, order: 'abc' }).valid).toBe(false);
  });

  it('should reject negative order', () => {
    expect(validateModule({ ...valid, order: -1 }).valid).toBe(false);
  });

  it('should accept valid module', () => {
    expect(validateModule(valid).valid).toBe(true);
  });
});

/* ── validateLesson ─────────────────────────────────────────── */
describe('validateLesson', () => {
  const valid = { title: 'Clase 1', order: 1 };

  it('should reject empty title', () => {
    expect(validateLesson({ ...valid, title: '' }).valid).toBe(false);
  });

  it('should reject missing order', () => {
    expect(validateLesson({ ...valid, order: undefined }).valid).toBe(false);
  });

  it('should accept lesson without optional fields', () => {
    expect(validateLesson(valid).valid).toBe(true);
  });

  it('should accept lesson with all optional fields', () => {
    const full = { ...valid, description: 'Desc', videoUrl: 'https://youtube.com/watch?v=abc', documentation: '# Doc' };
    expect(validateLesson(full).valid).toBe(true);
  });
});

/* ── fetchAllModules ────────────────────────────────────────── */
describe('fetchAllModules', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return modules on success', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'm1', data: () => ({ title: 'Mod 1', order: 1 }) },
        { id: 'm2', data: () => ({ title: 'Mod 2', order: 2 }) },
      ],
    });
    const result = await fetchAllModules();
    expect(result.success).toBe(true);
    expect(result.modules).toHaveLength(2);
    expect(result.modules[0].id).toBe('m1');
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    const result = await fetchAllModules();
    expect(result.success).toBe(false);
  });
});

/* ── fetchModule ────────────────────────────────────────────── */
describe('fetchModule', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty id', async () => {
    expect((await fetchModule('')).success).toBe(false);
  });

  it('should return module on success', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, id: 'm1', data: () => ({ title: 'Mod 1' }) });
    const result = await fetchModule('m1');
    expect(result.success).toBe(true);
    expect(result.module.title).toBe('Mod 1');
  });

  it('should return error when not found', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    expect((await fetchModule('x')).success).toBe(false);
  });
});

/* ── createModule ───────────────────────────────────────────── */
describe('createModule', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject invalid data', async () => {
    expect((await createModule({ title: '', order: 1 })).success).toBe(false);
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('should create module on success', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new-m' });
    const result = await createModule({ title: 'Mod 1', order: 1 });
    expect(result.success).toBe(true);
    expect(result.id).toBe('new-m');
  });

  it('should handle Firestore errors', async () => {
    mockAddDoc.mockRejectedValue(new Error('err'));
    expect((await createModule({ title: 'Mod 1', order: 1 })).success).toBe(false);
  });
});

/* ── updateModule ───────────────────────────────────────────── */
describe('updateModule', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty id', async () => {
    expect((await updateModule('', {})).success).toBe(false);
  });

  it('should update on success', async () => {
    mockUpdateDoc.mockResolvedValue();
    expect((await updateModule('m1', { title: 'Updated' })).success).toBe(true);
  });

  it('should handle errors', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('err'));
    expect((await updateModule('m1', {})).success).toBe(false);
  });
});

/* ── deleteModule ───────────────────────────────────────────── */
describe('deleteModule', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty id', async () => {
    expect((await deleteModule('')).success).toBe(false);
  });

  it('should delete on success', async () => {
    mockDeleteDoc.mockResolvedValue();
    expect((await deleteModule('m1')).success).toBe(true);
  });

  it('should handle errors', async () => {
    mockDeleteDoc.mockRejectedValue(new Error('err'));
    expect((await deleteModule('m1')).success).toBe(false);
  });
});

/* ── fetchLessons ───────────────────────────────────────────── */
describe('fetchLessons', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty moduleId', async () => {
    expect((await fetchLessons('')).success).toBe(false);
  });

  it('should return lessons on success', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'l1', data: () => ({ title: 'Lesson 1', order: 1 }) },
      ],
    });
    const result = await fetchLessons('m1');
    expect(result.success).toBe(true);
    expect(result.lessons).toHaveLength(1);
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    expect((await fetchLessons('m1')).success).toBe(false);
  });
});

/* ── fetchLesson ────────────────────────────────────────────── */
describe('fetchLesson', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty ids', async () => {
    expect((await fetchLesson('', 'l1')).success).toBe(false);
    expect((await fetchLesson('m1', '')).success).toBe(false);
  });

  it('should return lesson on success', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, id: 'l1', data: () => ({ title: 'L1' }) });
    const result = await fetchLesson('m1', 'l1');
    expect(result.success).toBe(true);
    expect(result.lesson.title).toBe('L1');
  });

  it('should return error when not found', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    expect((await fetchLesson('m1', 'x')).success).toBe(false);
  });
});

/* ── createLesson ───────────────────────────────────────────── */
describe('createLesson', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty moduleId', async () => {
    expect((await createLesson('', { title: 'L1', order: 1 })).success).toBe(false);
  });

  it('should reject invalid data', async () => {
    expect((await createLesson('m1', { title: '', order: 1 })).success).toBe(false);
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('should create lesson on success', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new-l' });
    const result = await createLesson('m1', { title: 'L1', order: 1, videoUrl: 'https://youtube.com/watch?v=abc' });
    expect(result.success).toBe(true);
    expect(result.id).toBe('new-l');
  });

  it('should handle Firestore errors', async () => {
    mockAddDoc.mockRejectedValue(new Error('err'));
    expect((await createLesson('m1', { title: 'L1', order: 1 })).success).toBe(false);
  });
});

/* ── updateLesson ───────────────────────────────────────────── */
describe('updateLesson', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty ids', async () => {
    expect((await updateLesson('', 'l1', {})).success).toBe(false);
    expect((await updateLesson('m1', '', {})).success).toBe(false);
  });

  it('should update on success', async () => {
    mockUpdateDoc.mockResolvedValue();
    expect((await updateLesson('m1', 'l1', { title: 'Updated' })).success).toBe(true);
  });

  it('should handle errors', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('err'));
    expect((await updateLesson('m1', 'l1', {})).success).toBe(false);
  });
});

/* ── deleteLesson ───────────────────────────────────────────── */
describe('deleteLesson', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty ids', async () => {
    expect((await deleteLesson('', 'l1')).success).toBe(false);
    expect((await deleteLesson('m1', '')).success).toBe(false);
  });

  it('should delete on success', async () => {
    mockDeleteDoc.mockResolvedValue();
    expect((await deleteLesson('m1', 'l1')).success).toBe(true);
  });

  it('should handle errors', async () => {
    mockDeleteDoc.mockRejectedValue(new Error('err'));
    expect((await deleteLesson('m1', 'l1')).success).toBe(false);
  });
});
