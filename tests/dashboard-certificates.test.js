import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));

const mockProgress = vi.fn();

vi.mock('../src/lib/firebase/modules.js', () => ({
  fetchAllModules: vi.fn(() =>
    Promise.resolve({
      success: true,
      modules: [
        { id: 'd1', title: 'Docker 1', order: 0, course: 'docker' },
        { id: 'k1', title: 'Karajan 1', order: 0, course: 'karajan-v4' },
      ],
    })
  ),
  fetchLessons: vi.fn((moduleId) => Promise.resolve({ success: true, lessons: [{ id: `${moduleId}-l1`, title: 'L1', order: 0 }] })),
}));
vi.mock('../src/lib/firebase/courses.js', () => ({
  fetchPublishedCourses: vi.fn(() =>
    Promise.resolve({
      success: true,
      courses: [
        { slug: 'docker', title: 'Docker desde cero' },
        { slug: 'karajan-v4', title: 'Gobernanza con Karajan v4' },
      ],
    })
  ),
}));
vi.mock('../src/lib/firebase/users.js', () => ({
  trackActivity: vi.fn(),
  fetchUser: vi.fn(() => Promise.resolve({ success: true, user: { displayName: 'Ana Pérez' } })),
}));
vi.mock('../src/lib/firebase/progress.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getUserProgress: (...a) => mockProgress(...a),
}));
vi.mock('../src/lib/firebase/streaks.js', () => ({
  getStreak: vi.fn(() => Promise.resolve({ success: true, streak: null })),
  getStreakBadges: vi.fn(() => []),
}));
vi.mock('../src/lib/firebase/cohorts.js', () => ({ fetchCohort: vi.fn() }));
vi.mock('../src/lib/firebase/quizzes.js', () => ({ getUserQuizResults: vi.fn(() => Promise.resolve({ success: true, results: [] })) }));
vi.mock('../src/lib/auth-ready.js', () => ({ waitForAuth: vi.fn(() => Promise.resolve({ uid: 'u1', email: 'ana@test.local' })) }));
vi.mock('../src/components/certificate-download.js', () => ({}));

await import('../src/components/student-dashboard-view.js');

const flush = () => new Promise((r) => setTimeout(r, 0));

async function mount() {
  const el = document.createElement('student-dashboard-view');
  document.body.appendChild(el);
  for (let i = 0; i < 5; i++) await flush();
  await el.updateComplete;
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('student dashboard per-course titles and certificates', () => {
  beforeEach(() => {
    mockProgress.mockResolvedValue({ success: true, completedLessons: [{ moduleId: 'k1', lessonId: 'k1-l1' }] });
  });

  it('shows the course title from the courses collection instead of the slug', async () => {
    const el = await mount();
    const titles = [...el.shadowRoot.querySelectorAll('.course-section-title')].map((t) => t.textContent);
    expect(titles).toEqual(['Docker desde cero', 'Gobernanza con Karajan v4']);
  });

  it('offers the certificate only for the completed course', async () => {
    const el = await mount();
    const certificates = el.shadowRoot.querySelectorAll('certificate-download');
    expect(certificates).toHaveLength(1);
    const cert = certificates[0];
    expect(cert.courseSlug).toBe('karajan-v4');
    expect(cert.courseTitle).toBe('Gobernanza con Karajan v4');
    expect(cert.userId).toBe('u1');
    expect(cert.userName).toBe('Ana Pérez');
    expect(cert.progress).toBe(100);
  });
});
