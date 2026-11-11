import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));
for (const child of ['video-player', 'markdown-content', 'lesson-nav', 'lesson-qa', 'lesson-quiz']) {
  vi.doMock(`../src/components/${child}.js`, () => ({}));
}

const mod = { fetchLesson: vi.fn(), fetchAllModules: vi.fn(), fetchLessons: vi.fn() };
vi.mock('../src/lib/firebase/modules.js', () => ({
  fetchLesson: (...a) => mod.fetchLesson(...a),
  fetchAllModules: (...a) => mod.fetchAllModules(...a),
  fetchLessons: (...a) => mod.fetchLessons(...a),
}));
const prog = {
  markLessonCompleted: vi.fn(), isLessonCompleted: vi.fn(), saveVideoPosition: vi.fn(() => Promise.resolve()),
  getVideoPosition: vi.fn(), addVideoBookmark: vi.fn(), removeVideoBookmark: vi.fn(), getVideoBookmarks: vi.fn(),
};
vi.mock('../src/lib/firebase/progress.js', () => Object.fromEntries(
  ['markLessonCompleted', 'isLessonCompleted', 'saveVideoPosition', 'getVideoPosition', 'addVideoBookmark', 'removeVideoBookmark', 'getVideoBookmarks']
    .map((name) => [name, (...a) => prog[name](...a)]),
));
vi.mock('../src/lib/firebase/users.js', () => ({ trackActivity: vi.fn() }));
const quiz = { fetchQuizzesByLessonId: vi.fn(), getStudentQuizResponse: vi.fn() };
vi.mock('../src/lib/firebase/quizzes.js', () => ({
  fetchQuizzesByLessonId: (...a) => quiz.fetchQuizzesByLessonId(...a),
  getStudentQuizResponse: (...a) => quiz.getStudentQuizResponse(...a),
}));
vi.mock('../src/lib/auth-ready.js', () => ({ waitForAuth: vi.fn(() => Promise.resolve({ uid: 'u1' })) }));
vi.mock('../src/lib/lesson-audience.js', () => ({ lessonQueryFor: vi.fn(() => Promise.resolve({})) }));

await import('../src/components/lesson-view.js');

const LESSONS = [{ id: 'l0', title: 'Intro', order: 0 }, { id: 'l1', title: 'Volúmenes', order: 1 }, { id: 'l2', title: 'Redes', order: 2 }];
const flush = () => new Promise((r) => setTimeout(r, 0));

async function mount(lessonId = 'l1') {
  const el = document.createElement('lesson-view');
  el.dataset.moduleId = 'm1';
  if (lessonId) el.dataset.lessonId = lessonId;
  document.body.appendChild(el);
  for (let i = 0; i < 8; i++) await flush();
  await el.updateComplete;
  return el;
}
const $ = (el, s) => el.shadowRoot.querySelector(s);
const settle = async (el) => { for (let i = 0; i < 4; i++) await flush(); await el.updateComplete; };

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mod.fetchLesson.mockResolvedValue({ success: true, lesson: { title: 'Volúmenes', description: 'Datos persistentes', videoUrl: 'https://youtu.be/x', documentation: '# Doc' } });
  mod.fetchAllModules.mockResolvedValue({ success: true, modules: [{ id: 'm1', order: 0, course: 'docker' }] });
  mod.fetchLessons.mockResolvedValue({ success: true, lessons: LESSONS });
  prog.isLessonCompleted.mockResolvedValue(false);
  prog.getVideoPosition.mockResolvedValue(42);
  prog.getVideoBookmarks.mockResolvedValue([]);
  prog.markLessonCompleted.mockResolvedValue({ success: true });
  quiz.fetchQuizzesByLessonId.mockResolvedValue({ success: true, quizzes: [] });
});
afterEach(() => { document.body.innerHTML = ''; });

describe('lesson-view', () => {
  it('explains when the lesson is not identified or cannot be loaded', async () => {
    expect($(await mount(null), '.error-msg').textContent).toContain('No se encontró la clase');
    document.body.innerHTML = '';
    mod.fetchLesson.mockResolvedValueOnce({ success: false, error: 'Clase no encontrada' });
    expect($(await mount(), '.error-msg').textContent).toContain('Clase no encontrada');
  });

  it('renders the lesson, its video position and the course navigation', async () => {
    const el = await mount();
    expect($(el, 'h1').textContent).toBe('Volúmenes');
    expect($(el, 'video-player').getAttribute('start-at')).toBe('42');
    expect($(el, 'markdown-content')).not.toBeNull();
    expect($(el, 'a[aria-label="Lección anterior"]').getAttribute('href')).toBe('/leccion?m=m1&l=l0');
    expect($(el, 'a[aria-label="Lección siguiente"]').classList.contains('nav-btn--disabled')).toBe(true);
  });

  it('marks the lesson as completed and unlocks the next one', async () => {
    const el = await mount();
    $(el, '.complete-btn').click();
    await settle(el);
    expect(prog.markLessonCompleted).toHaveBeenCalledWith('u1', 'm1', 'l1');
    expect($(el, '.complete-btn--done')).not.toBeNull();
    expect($(el, 'a[aria-label="Lección siguiente"]').classList.contains('nav-btn--disabled')).toBe(false);
  });

  it('locks completion until the lesson quiz is answered', async () => {
    quiz.fetchQuizzesByLessonId.mockResolvedValue({ success: true, quizzes: [{ id: 'q1' }] });
    quiz.getStudentQuizResponse.mockResolvedValue({ success: true, response: null });
    const el = await mount();
    expect($(el, '.complete-btn').disabled).toBe(true);
    expect(el.shadowRoot.textContent).toContain('Responde el cuestionario');
    el.dispatchEvent(new CustomEvent('quiz-completed'));
    await el.updateComplete;
    expect($(el, '.complete-btn').disabled).toBe(false);
  });

  it('adds and removes video bookmarks', async () => {
    prog.addVideoBookmark.mockResolvedValue({ success: true });
    prog.removeVideoBookmark.mockResolvedValue({ success: true });
    const el = await mount();
    prog.getVideoBookmarks.mockResolvedValue([{ seconds: 30, note: 'clave' }]);
    el.dispatchEvent(new CustomEvent('bookmark-add', { detail: { seconds: 30, note: 'clave' } }));
    await settle(el);
    expect(prog.addVideoBookmark).toHaveBeenCalledWith('u1', 'm1', 'l1', 30, 'clave');
    expect($(el, 'video-player').bookmarks).toEqual([{ seconds: 30, note: 'clave' }]);
    el.dispatchEvent(new CustomEvent('bookmark-remove', { detail: { bookmark: { seconds: 30 } } }));
    await settle(el);
    expect(prog.removeVideoBookmark).toHaveBeenCalledWith('u1', 'm1', 'l1', { seconds: 30 });
  });

  it('saves the video position when the page hides, unloads or is left', async () => {
    const el = await mount();
    el.dispatchEvent(new CustomEvent('video-time-update', { detail: { currentTime: 75 } }));
    window.dispatchEvent(new Event('beforeunload'));
    expect(JSON.parse(sessionStorage.getItem('video_pos_u1_m1_l1')).seconds).toBe(75);
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(prog.saveVideoPosition).toHaveBeenCalledWith('u1', 'm1', 'l1', 75);
    expect(sessionStorage.getItem('video_pos_u1_m1_l1')).toBeNull();
    delete document.visibilityState;
    el.remove();
    expect(prog.saveVideoPosition).toHaveBeenCalledTimes(2);
  });

  it('recovers a position saved before the previous unload', async () => {
    sessionStorage.setItem('video_pos_u1_m1_l1', JSON.stringify({ seconds: 90 }));
    await mount();
    expect(prog.saveVideoPosition).toHaveBeenCalledWith('u1', 'm1', 'l1', 90);
    expect(sessionStorage.getItem('video_pos_u1_m1_l1')).toBeNull();
  });
});
