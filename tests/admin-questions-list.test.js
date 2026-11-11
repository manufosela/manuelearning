import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));

const api = { fetchAllQuestions: vi.fn(), addAnswer: vi.fn(), addReply: vi.fn(), deleteQuestion: vi.fn(), updateQuestionVisibility: vi.fn() };
vi.mock('../src/lib/firebase/questions.js', () => Object.fromEntries(Object.keys(api).map((k) => [k, (...a) => api[k](...a)])));
vi.mock('../src/lib/auth-ready.js', () => ({ waitForAuth: vi.fn(() => Promise.resolve({ uid: 'admin' })) }));

await import('../src/components/admin-questions-list.js');

const QUESTIONS = [
  { id: 'q1', text: '¿Volúmenes o bind mounts?', moduleId: 'm1', lessonId: 'l1', userName: 'Ana' },
  {
    id: 'q2', text: '¿Qué es una red bridge?', moduleId: 'm1', lessonId: 'l2', public: true,
    answers: [{ id: 'a1', text: 'La red por defecto', isAdmin: true, createdAt: '10/11/2026' }],
    replies: [{ id: 'r1', text: 'Gracias', userName: 'Bea' }, { id: 'r2', text: 'Y la host?', isAdmin: false }],
    votes: { a1: ['u1', 'u2'], r1: ['u3'] },
  },
];
const flush = () => new Promise((r) => setTimeout(r, 0));
const $ = (el, s) => el.shadowRoot.querySelector(s);
const $$ = (el, s) => [...el.shadowRoot.querySelectorAll(s)];
const settle = async (el) => { for (let i = 0; i < 4; i++) await flush(); await el.updateComplete; };
const button = (root, text) => [...root.querySelectorAll('button')].find((b) => b.textContent.trim() === text);

async function mount() {
  const el = document.createElement('admin-questions-list');
  document.body.appendChild(el);
  await settle(el);
  return el;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchAllQuestions.mockResolvedValue({ success: true, questions: QUESTIONS });
  for (const fn of [api.addAnswer, api.deleteQuestion, api.updateQuestionVisibility]) fn.mockResolvedValue({ success: true });
});
afterEach(() => { document.body.innerHTML = ''; });

describe('admin-questions-list', () => {
  it('shows the load error', async () => {
    api.fetchAllQuestions.mockResolvedValueOnce({ success: false, error: 'Sin acceso' });
    expect($(await mount(), '.error-msg').textContent).toContain('Sin acceso');
  });

  it('counts pending questions and filters them', async () => {
    const el = await mount();
    expect($(el, '.toolbar-count').textContent).toBe('2 preguntas · 1 pendientes');
    button(el.shadowRoot, 'Pendientes').click();
    await el.updateComplete;
    expect($$(el, '.question-card').map((c) => c.querySelector('.question-text').textContent)).toEqual(['¿Volúmenes o bind mounts?']);
    button(el.shadowRoot, 'Respondidas').click();
    await el.updateComplete;
    expect($$(el, '.question-card--answered')).toHaveLength(1);
    button(el.shadowRoot, 'Todas').click();
    await el.updateComplete;
    expect($$(el, '.question-card')).toHaveLength(2);
  });

  it('shows the empty state of each filter', async () => {
    api.fetchAllQuestions.mockResolvedValue({ success: true, questions: [QUESTIONS[0]] });
    const el = await mount();
    button(el.shadowRoot, 'Respondidas').click();
    await el.updateComplete;
    expect($(el, '.empty-state').textContent).toContain('No hay preguntas respondidas');
  });

  it('renders answers and student replies with their votes', async () => {
    const el = await mount();
    const answered = $$(el, '.question-card')[1];
    expect(answered.querySelector('.answer-meta').textContent).toContain('Admin');
    expect(answered.querySelector('.answer-meta .vote-count').textContent).toContain('2');
    expect(answered.querySelector('.replies-section h4').textContent).toContain('(2)');
    expect([...answered.querySelectorAll('.reply-meta')].map((m) => m.textContent.includes('Anónimo'))).toEqual([false, true]);
    expect($$(el, '.question-card')[0].querySelector('.btn--visibility').disabled).toBe(true);
  });

  it('answers a pending question, and cancels', async () => {
    const el = await mount();
    const card = $$(el, '.question-card')[0];
    button(card, 'Responder').click();
    await el.updateComplete;
    const textarea = $(el, '.answer-form textarea');
    textarea.value = 'Volúmenes para datos persistentes';
    textarea.dispatchEvent(new Event('input'));
    await el.updateComplete;
    button(el.shadowRoot, 'Enviar').click();
    await settle(el);
    expect(api.addAnswer).toHaveBeenCalledWith('q1', expect.objectContaining({ text: 'Volúmenes para datos persistentes', isAdmin: true }));
    expect($(el, '.answer-form')).toBeNull();

    button($$(el, '.question-card')[0], 'Responder').click();
    await el.updateComplete;
    button($$(el, '.question-card')[0], 'Cancelar').click();
    await el.updateComplete;
    expect($(el, '.answer-form')).toBeNull();
  });

  it('changes the visibility and deletes questions', async () => {
    const el = await mount();
    button($$(el, '.question-card')[1], 'Pública').click();
    await settle(el);
    expect(api.updateQuestionVisibility).toHaveBeenCalledWith('q2', false);
    button($$(el, '.question-card')[0], 'Eliminar').click();
    await settle(el);
    expect(api.deleteQuestion).toHaveBeenCalledWith('q1');
    expect(api.fetchAllQuestions).toHaveBeenCalledTimes(3);
  });
});
