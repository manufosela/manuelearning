import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));

const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(() => 'courses-ref'),
  doc: vi.fn((_db, _col, id) => `doc:${id}`),
  getDocs: (...a) => mockGetDocs(...a),
  getDoc: (...a) => mockGetDoc(...a),
  setDoc: (...a) => mockSetDoc(...a),
  deleteDoc: (...a) => mockDeleteDoc(...a),
  query: vi.fn((...parts) => parts),
  where: (...a) => mockWhere(...a),
  orderBy: (...a) => mockOrderBy(...a),
  serverTimestamp: vi.fn(() => 'TS'),
}));

import {
  validateCourse,
  fetchPublishedCourses,
  fetchAllCourses,
  fetchCourse,
  saveCourse,
  deleteCourse,
} from '../src/lib/firebase/courses.js';

const validCourse = () => ({
  slug: 'karajan-v4',
  title: 'Gobernanza con Karajan v4',
  description: 'Curso',
  icon: 'policy',
  color: '#7c3aed',
  order: 2,
  published: true,
});

const snapshotOf = (docs) => ({ docs: docs.map(([id, data]) => ({ id, data: () => data })) });

describe('validateCourse', () => {
  it('accepts a valid course', () => {
    expect(validateCourse(validCourse())).toEqual({ valid: true });
  });

  it('rejects an invalid slug', () => {
    expect(validateCourse({ ...validCourse(), slug: 'Karajan V4' }).valid).toBe(false);
    expect(validateCourse({ ...validCourse(), slug: '' }).valid).toBe(false);
  });

  it('rejects an empty title', () => {
    expect(validateCourse({ ...validCourse(), title: '  ' }).error).toBe('El título es obligatorio');
  });

  it('rejects a negative or missing order', () => {
    expect(validateCourse({ ...validCourse(), order: -1 }).valid).toBe(false);
    expect(validateCourse({ ...validCourse(), order: undefined }).valid).toBe(false);
  });

  it('rejects a non-hex color but allows omitting it', () => {
    expect(validateCourse({ ...validCourse(), color: 'red' }).error).toBe('El color debe ser hexadecimal (#rrggbb)');
    const { color, ...withoutColor } = validCourse();
    expect(validateCourse(withoutColor).valid).toBe(true);
  });
});

describe('fetchPublishedCourses', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queries published courses ordered by order', async () => {
    mockGetDocs.mockResolvedValue(snapshotOf([['docker', { title: 'Docker', published: true, order: 1 }]]));
    const result = await fetchPublishedCourses();
    expect(result.success).toBe(true);
    expect(result.courses).toEqual([{ slug: 'docker', title: 'Docker', published: true, order: 1 }]);
    expect(mockWhere).toHaveBeenCalledWith('published', '==', true);
    expect(mockOrderBy).toHaveBeenCalledWith('order', 'asc');
  });

  it('returns an error when Firestore fails', async () => {
    mockGetDocs.mockRejectedValue(new Error('boom'));
    expect(await fetchPublishedCourses()).toEqual({ success: false, error: 'Error al cargar los cursos' });
  });
});

describe('fetchAllCourses', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns every course without filtering by published', async () => {
    mockGetDocs.mockResolvedValue(snapshotOf([['a', { published: false, order: 0 }], ['b', { published: true, order: 1 }]]));
    const result = await fetchAllCourses();
    expect(result.courses.map((c) => c.slug)).toEqual(['a', 'b']);
    expect(mockWhere).not.toHaveBeenCalled();
  });

  it('returns an error when Firestore fails', async () => {
    mockGetDocs.mockRejectedValue(new Error('boom'));
    expect((await fetchAllCourses()).success).toBe(false);
  });
});

describe('fetchCourse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an empty slug', async () => {
    expect((await fetchCourse('')).success).toBe(false);
  });

  it('returns the course when it exists', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, id: 'docker', data: () => ({ title: 'Docker' }) });
    expect(await fetchCourse('docker')).toEqual({ success: true, course: { slug: 'docker', title: 'Docker' } });
  });

  it('reports a missing course', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    expect((await fetchCourse('nope')).error).toBe('Curso no encontrado');
  });

  it('returns an error when Firestore fails', async () => {
    mockGetDoc.mockRejectedValue(new Error('boom'));
    expect((await fetchCourse('docker')).error).toBe('Error al cargar el curso');
  });
});

describe('saveCourse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates before writing', async () => {
    const result = await saveCourse({ ...validCourse(), title: '' });
    expect(result.success).toBe(false);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('writes the document under the slug with merge and defaults', async () => {
    mockSetDoc.mockResolvedValue();
    const { icon, color, description, ...minimal } = validCourse();
    const result = await saveCourse({ ...minimal, published: undefined });
    expect(result.success).toBe(true);
    expect(mockSetDoc).toHaveBeenCalledWith(
      'doc:karajan-v4',
      expect.objectContaining({ slug: 'karajan-v4', icon: 'school', color: '#d32f2f', description: '', published: false, updatedAt: 'TS' }),
      { merge: true }
    );
  });

  it('returns an error when Firestore fails', async () => {
    mockSetDoc.mockRejectedValue(new Error('boom'));
    expect((await saveCourse(validCourse())).error).toBe('Error al guardar el curso');
  });
});

describe('deleteCourse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an empty slug', async () => {
    expect((await deleteCourse('')).success).toBe(false);
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });

  it('deletes the document', async () => {
    mockDeleteDoc.mockResolvedValue();
    expect(await deleteCourse('docker')).toEqual({ success: true });
    expect(mockDeleteDoc).toHaveBeenCalledWith('doc:docker');
  });

  it('returns an error when Firestore fails', async () => {
    mockDeleteDoc.mockRejectedValue(new Error('boom'));
    expect((await deleteCourse('docker')).error).toBe('Error al eliminar el curso');
  });
});
