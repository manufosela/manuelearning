import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));

const mockFetchLessons = vi.fn();

vi.mock('../src/lib/firebase/modules.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchAllModules: vi.fn(() => Promise.resolve({ success: true, modules: [{ id: 'm1', title: 'Módulo 1', order: 0, course: 'karajan-v4' }] })),
    fetchModulesByCourse: vi.fn(() => Promise.resolve({ success: true, modules: [] })),
    fetchCourseList: vi.fn(() => Promise.resolve({ success: true, courses: ['karajan-v4'] })),
    fetchLessons: (...a) => mockFetchLessons(...a),
  };
});
vi.mock('../src/lib/firebase/users.js', () => ({ fetchAllUsers: vi.fn(() => Promise.resolve({ success: true, users: [] })) }));
vi.mock('../src/lib/firebase/quizzes.js', () => ({
  fetchQuizByLesson: vi.fn(() => Promise.resolve({ success: true, quiz: null })),
  createQuiz: vi.fn(),
  updateQuiz: vi.fn(),
  validateQuiz: vi.fn(() => ({ valid: true })),
}));
vi.mock('../src/lib/firebase/user-notifications.js', () => ({ notifyUsers: vi.fn() }));
vi.mock('../src/lib/auth-ready.js', () => ({ waitForAuth: vi.fn(() => Promise.resolve({ uid: 'admin' })) }));

await import('../src/components/admin-modules-list.js');

const flush = () => new Promise((r) => setTimeout(r, 0));

async function mountAndExpand() {
  const el = document.createElement('admin-modules-list');
  document.body.appendChild(el);
  await flush();
  await el.updateComplete;
  el.shadowRoot.querySelector('.module-header').click();
  await flush();
  await el.updateComplete;
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('admin-modules-list and lesson audience', () => {
  beforeEach(() => {
    mockFetchLessons.mockReset();
    mockFetchLessons.mockResolvedValue({
      success: true,
      lessons: [
        { id: 'l1', title: 'Conceptos', order: 0, audience: 'student' },
        { id: 'l2', title: 'Solucionario', order: 1, audience: 'instructor' },
      ],
    });
  });

  it('fetches every lesson, instructor ones included', async () => {
    await mountAndExpand();
    expect(mockFetchLessons).toHaveBeenCalledWith('m1', { audience: 'all' });
  });

  it('tags instructor lessons with a "Formador" badge', async () => {
    const el = await mountAndExpand();
    const badges = [...el.shadowRoot.querySelectorAll('.lesson-badge--instructor')];
    expect(badges).toHaveLength(1);
    expect(badges[0].textContent.trim()).toBe('Formador');
  });

  it('offers an audience selector in the lesson form, defaulting to students', async () => {
    const el = await mountAndExpand();
    el._openCreateLesson('m1');
    await el.updateComplete;
    const select = el.shadowRoot.querySelector('#les-audience');
    expect(select).not.toBeNull();
    expect([...select.options].map((o) => o.value)).toEqual(['student', 'instructor']);
    expect(el._lessonFormData.audience).toBe('student');
  });

  it('keeps the audience of the lesson being edited', async () => {
    const el = await mountAndExpand();
    el._openEditLesson('m1', { id: 'l2', title: 'Solucionario', order: 1, audience: 'instructor' });
    expect(el._lessonFormData.audience).toBe('instructor');
  });
});
