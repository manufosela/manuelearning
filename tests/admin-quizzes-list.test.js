import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));

const api = {
  fetchAllQuizzes: vi.fn(),
  createQuiz: vi.fn(() => Promise.resolve({ success: true })),
  updateQuiz: vi.fn(() => Promise.resolve({ success: true })),
  deleteQuiz: vi.fn(() => Promise.resolve({ success: true })),
  getQuizResponses: vi.fn(),
};
vi.mock('../src/lib/firebase/quizzes.js', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchAllQuizzes: (...a) => api.fetchAllQuizzes(...a),
  createQuiz: (...a) => api.createQuiz(...a),
  updateQuiz: (...a) => api.updateQuiz(...a),
  deleteQuiz: (...a) => api.deleteQuiz(...a),
  getQuizResponses: (...a) => api.getQuizResponses(...a),
}));
vi.mock('../src/lib/firebase/users.js', () => ({
  fetchAllUsers: vi.fn(() => Promise.resolve({ success: true, users: [{ uid: 'u1', displayName: 'Ana' }, { uid: 'u2', email: 'bea@test.local' }] })),
}));
vi.mock('../src/lib/auth-ready.js', () => ({ waitForAuth: vi.fn(() => Promise.resolve({ uid: 'admin' })) }));
const mockExport = vi.fn();
vi.mock('../src/lib/csv-export.js', () => ({ exportCsv: (...a) => mockExport(...a) }));

await import('../src/components/admin-quizzes-list.js');

const QUIZ = {
  id: 'q1', title: 'Quiz Docker', moduleId: 'm1', lessonId: 'l1',
  questions: [
    { text: '¿Imagen o contenedor?', type: 'multiple', options: ['Imagen', 'Contenedor'], correctAnswer: 'Imagen' },
    { text: 'Explica un volumen', type: 'open' },
  ],
};
const RESPONSES = [
  { userId: 'u1', answers: ['Imagen', 'Persistencia'], completedAt: '2026-11-10T10:00:00Z' },
  { userId: 'u2', answers: ['Contenedor', ''], completedAt: { toDate: () => new Date('2026-11-09T10:00:00Z') } },
];
const flush = () => new Promise((r) => setTimeout(r, 0));

async function mount() {
  const el = document.createElement('admin-quizzes-list');
  document.body.appendChild(el);
  for (let i = 0; i < 4; i++) await flush();
  await el.updateComplete;
  return el;
}
const $ = (el, s) => el.shadowRoot.querySelector(s);
const button = (el, text) => [...el.shadowRoot.querySelectorAll('button')].find((b) => b.textContent.includes(text));
const act = async (el, node) => { node.click(); for (let i = 0; i < 3; i++) await flush(); await el.updateComplete; };
const submit = async (el) => {
  $(el, 'form').dispatchEvent(new Event('submit', { cancelable: true }));
  for (let i = 0; i < 3; i++) await flush();
  await el.updateComplete;
};
const type = async (el, selector, value) => {
  const input = $(el, selector);
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await el.updateComplete;
};

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchAllQuizzes.mockResolvedValue({ success: true, quizzes: [QUIZ] });
  api.getQuizResponses.mockResolvedValue({ success: true, responses: RESPONSES });
});
afterEach(() => { document.body.innerHTML = ''; });

describe('admin-quizzes-list', () => {
  it('shows the load error or the empty state', async () => {
    api.fetchAllQuizzes.mockResolvedValueOnce({ success: false, error: 'Sin acceso' });
    expect($(await mount(), '.error-msg').textContent).toContain('Sin acceso');
    document.body.innerHTML = '';
    api.fetchAllQuizzes.mockResolvedValueOnce({ success: true, quizzes: [] });
    expect($(await mount(), '.empty-state').textContent).toContain('No hay quizzes');
  });

  it('lists quizzes and deletes one', async () => {
    const el = await mount();
    expect($(el, '.quiz-title').textContent).toBe('Quiz Docker');
    expect($(el, '.quiz-meta').textContent).toContain('2 preguntas');
    await act(el, button(el, 'Eliminar'));
    expect(api.deleteQuiz).toHaveBeenCalledWith('q1');
  });

  it('validates and creates a new quiz with up to three questions', async () => {
    const el = await mount();
    await act(el, button(el, 'Nuevo quiz'));
    await submit(el);
    expect($(el, '.form-error')).not.toBeNull();
    expect(api.createQuiz).not.toHaveBeenCalled();

    await type(el, '#quiz-title', 'Quiz nuevo');
    await type(el, '#quiz-module', 'm1');
    await act(el, button(el, 'Añadir pregunta'));
    await act(el, button(el, 'Añadir pregunta'));
    expect(el.shadowRoot.textContent).toContain('Máximo 3 preguntas');
    await act(el, button(el, 'Quitar'));
    await act(el, button(el, 'Quitar'));
    await type(el, '.question-block input', '¿Qué es Docker?');
    await submit(el);
    expect(api.createQuiz.mock.calls[0][0]).toMatchObject({ title: 'Quiz nuevo', moduleId: 'm1' });
    expect($(el, '.form-card')).toBeNull();
  });

  it('edits a quiz, including a multiple choice question', async () => {
    const el = await mount();
    await act(el, button(el, 'Editar'));
    expect($(el, '#quiz-title').value).toBe('Quiz Docker');
    const options = $(el, '.question-block textarea');
    options.value = 'Imagen\nContenedor\nVolumen';
    options.dispatchEvent(new Event('input'));
    await el.updateComplete;
    await submit(el);
    expect(api.updateQuiz.mock.calls[0][0]).toBe('q1');
    expect(api.updateQuiz.mock.calls[0][1].questions[0].options).toEqual(['Imagen', 'Contenedor', 'Volumen']);
  });

  it('shows the update error and closes the form on cancel', async () => {
    api.updateQuiz.mockResolvedValueOnce({ success: false, error: 'No se pudo guardar' });
    const el = await mount();
    await act(el, button(el, 'Editar'));
    await submit(el);
    expect($(el, '.form-error').textContent).toContain('No se pudo guardar');
    await act(el, button(el, 'Cancelar'));
    expect($(el, '.form-card')).toBeNull();
  });

  it('toggles the responses panel and exports them', async () => {
    const el = await mount();
    await act(el, button(el, 'Respuestas'));
    expect(el.shadowRoot.querySelectorAll('.response-item')).toHaveLength(2);
    await act(el, button(el, 'Exportar resultados'));
    expect(mockExport.mock.calls[0][0]).toEqual(['Usuario', 'Fecha', 'Pregunta 1', 'Pregunta 2']);
    expect(mockExport.mock.calls[0][2]).toBe('quiz_quiz_docker.csv');
    await act(el, button(el, 'Ocultar'));
    expect($(el, '.responses-panel')).toBeNull();
  });

  it('computes statistics with correct and incorrect answers per question', async () => {
    const el = await mount();
    await act(el, button(el, 'Estadísticas'));
    const summary = $(el, '.stats-summary').textContent;
    expect(summary).toContain('1 (50%)');
    expect(el.shadowRoot.querySelectorAll('.stats-question')).toHaveLength(2);
    expect($(el, '.stats-students').textContent).toContain('Ana');
    expect($(el, '.stats-students').textContent).toContain('bea@test.local');
    expect(el.shadowRoot.querySelectorAll('.stats-student__answer--incorrect')).toHaveLength(1);
    await act(el, button(el, 'Exportar CSV'));
    expect(mockExport.mock.calls[0][1][0][0]).toBe('Ana');
    await act(el, button(el, 'Cerrar'));
    expect($(el, '.stats-summary')).toBeNull();
  });

  it('shows the stats error and the no-responses state', async () => {
    api.getQuizResponses.mockResolvedValueOnce({ success: true, responses: [] });
    const el = await mount();
    await act(el, button(el, 'Estadísticas'));
    expect(el.shadowRoot.textContent).toContain('Aún no hay respuestas');
    await act(el, button(el, 'Cerrar'));
    api.getQuizResponses.mockRejectedValueOnce(new Error('x'));
    await act(el, button(el, 'Estadísticas'));
    expect(el.shadowRoot.textContent).toContain('Error al cargar las estadísticas');
  });
});
