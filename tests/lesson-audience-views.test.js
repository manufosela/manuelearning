import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));

const mockIsAdmin = vi.fn();
const mockFetchLessons = vi.fn();

vi.mock('../src/lib/firebase/users.js', () => ({ isAdmin: (...a) => mockIsAdmin(...a) }));
vi.mock('../src/lib/firebase/modules.js', () => ({
  fetchAllModules: vi.fn(() => Promise.resolve({ success: true, modules: [] })),
  fetchModulesByCourse: vi.fn(() =>
    Promise.resolve({ success: true, modules: [{ id: 'm1', title: 'Módulo 1', order: 0, course: 'karajan-v4' }] })
  ),
  fetchLessons: (...a) => mockFetchLessons(...a),
}));
vi.mock('../src/lib/auth-ready.js', () => ({ waitForAuth: vi.fn(() => Promise.resolve({ uid: 'u1' })) }));

const { lessonQueryFor } = await import('../src/lib/lesson-audience.js');
const { buildLearningPath } = await import('../src/lib/learning-path.js');
await import('../src/components/learning-path-view.js');

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('lessonQueryFor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks for every lesson when the user is admin', async () => {
    mockIsAdmin.mockResolvedValue(true);
    expect(await lessonQueryFor('u1')).toEqual({ audience: 'all' });
    expect(mockIsAdmin).toHaveBeenCalledWith('u1');
  });

  it('asks for student lessons otherwise', async () => {
    mockIsAdmin.mockResolvedValue(false);
    expect(await lessonQueryFor('u1')).toEqual({ audience: 'student' });
  });

  it('falls back to student lessons without a user', async () => {
    expect(await lessonQueryFor(null)).toEqual({ audience: 'student' });
    expect(mockIsAdmin).not.toHaveBeenCalled();
  });
});

describe('buildLearningPath audience', () => {
  it('carries the lesson audience, defaulting to student', () => {
    const path = buildLearningPath([{ id: 'm1', title: 'M' }], {
      m1: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B', audience: 'instructor' }],
    });
    expect(path.map((p) => p.audience)).toEqual(['student', 'instructor']);
  });
});

describe('learning-path-view', () => {
  beforeEach(() => vi.clearAllMocks());

  async function mount(admin, lessons) {
    mockIsAdmin.mockResolvedValue(admin);
    mockFetchLessons.mockResolvedValue({ success: true, lessons });
    const el = document.createElement('learning-path-view');
    el.setAttribute('course', 'karajan-v4');
    document.body.appendChild(el);
    await flush();
    await flush();
    await el.updateComplete;
    return el;
  }

  it('shows instructor lessons to admins with a "Material del formador" tag', async () => {
    const el = await mount(true, [
      { id: 'l1', title: 'Conceptos', order: 0, audience: 'student' },
      { id: 'l2', title: 'Solucionario', order: 1, audience: 'instructor' },
    ]);
    expect(mockFetchLessons).toHaveBeenCalledWith('m1', { audience: 'all' });
    const tags = el.shadowRoot.querySelectorAll('.instructor-tag');
    expect(tags).toHaveLength(1);
    expect(tags[0].textContent).toContain('Material del formador');
  });

  it('queries only student lessons for students', async () => {
    const el = await mount(false, [{ id: 'l1', title: 'Conceptos', order: 0, audience: 'student' }]);
    expect(mockFetchLessons).toHaveBeenCalledWith('m1', { audience: 'student' });
    expect(el.shadowRoot.querySelector('.instructor-tag')).toBeNull();
  });

  it('counts only the modules that have visible lessons', async () => {
    const el = await mount(false, [{ id: 'l1', title: 'Conceptos', order: 0, audience: 'student' }]);
    expect(el.shadowRoot.querySelector('.path-header p').textContent).toContain('1 clases en 1 módulos');
  });
});
