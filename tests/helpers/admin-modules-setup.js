import { vi } from 'vitest';

/**
 * Mocked services for admin-modules-list tests. Each test file registers the
 * vi.mock calls (they must stay in the test file to be hoisted) and points
 * them at these spies.
 */
export const modulesApi = {
  fetchAllModules: vi.fn(),
  fetchModulesByCourse: vi.fn(),
  fetchCourseList: vi.fn(),
  createModule: vi.fn(),
  updateModule: vi.fn(),
  deleteModule: vi.fn(),
  fetchLessons: vi.fn(),
  createLesson: vi.fn(),
  updateLesson: vi.fn(),
  deleteLesson: vi.fn(),
  reorderModule: vi.fn(),
  reorderLesson: vi.fn(),
};
export const quizApi = { fetchQuizByLesson: vi.fn(), createQuiz: vi.fn(), updateQuiz: vi.fn() };
export const usersApi = { fetchAllUsers: vi.fn() };
export const notifyApi = { notifyUsers: vi.fn() };

export const MODULES = [
  { id: 'm1', title: 'Docker básico', description: 'Primeros pasos', order: 1, course: 'docker' },
  { id: 'm2', title: 'Compose', order: 2, course: 'docker' },
];
export const LESSONS = [
  { id: 'l1', title: 'Contenedores', order: 1, videoUrl: 'https://youtu.be/x', documentation: '# Doc' },
  { id: 'l2', title: 'Solucionario', order: 2, audience: 'instructor' },
];

export function resetModulesApi() {
  vi.clearAllMocks();
  const ok = () => Promise.resolve({ success: true });
  for (const fn of [...Object.values(modulesApi), ...Object.values(quizApi), notifyApi.notifyUsers]) fn.mockImplementation(ok);
  modulesApi.fetchAllModules.mockResolvedValue({ success: true, modules: MODULES });
  modulesApi.fetchModulesByCourse.mockResolvedValue({ success: true, modules: [MODULES[1]] });
  modulesApi.fetchCourseList.mockResolvedValue({ success: true, courses: ['docker', 'karajan'] });
  modulesApi.fetchLessons.mockResolvedValue({ success: true, lessons: LESSONS });
  quizApi.fetchQuizByLesson.mockResolvedValue({ success: true, quiz: null });
  usersApi.fetchAllUsers.mockResolvedValue({
    success: true,
    users: [{ uid: 's1', role: 'student' }, { uid: 'a1', role: 'admin' }],
  });
}

const flush = () => new Promise((r) => setTimeout(r, 0));

export async function settle(el) {
  for (let i = 0; i < 4; i++) await flush();
  await el.updateComplete;
}

export async function mountModulesList() {
  const el = document.createElement('admin-modules-list');
  document.body.appendChild(el);
  await settle(el);
  return el;
}

export async function expandFirstModule(el) {
  el.shadowRoot.querySelector('.module-header').click();
  await settle(el);
}

export const $ = (el, s) => el.shadowRoot.querySelector(s);
export const $$ = (el, s) => [...el.shadowRoot.querySelectorAll(s)];
export const button = (root, text) => [...root.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(text));

export async function typeInto(el, selector, value, eventName = 'input') {
  const input = $(el, selector);
  input.value = value;
  input.dispatchEvent(new Event(eventName));
  await el.updateComplete;
}

export async function submitForm(el) {
  $(el, 'form').dispatchEvent(new Event('submit', { cancelable: true }));
  await settle(el);
}
