import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));

const api = { fetchQuestionsByLesson: vi.fn(), createQuestion: vi.fn(), addReply: vi.fn(), toggleVote: vi.fn() };
vi.mock('../src/lib/firebase/questions.js', () => ({
  fetchQuestionsByLesson: (...a) => api.fetchQuestionsByLesson(...a),
  createQuestion: (...a) => api.createQuestion(...a),
  addReply: (...a) => api.addReply(...a),
  toggleVote: (...a) => api.toggleVote(...a),
}));
vi.mock('../src/lib/auth-ready.js', () => ({ waitForAuth: vi.fn(() => Promise.resolve({ uid: 'u1', displayName: 'Ana' })) }));

await import('../src/components/lesson-qa.js');

const QUESTIONS = [
  {
    id: 'q1', text: '¿Cómo persisto datos?', userId: 'u1', userName: 'Ana', createdAt: '2026-11-10T10:00:00Z',
    answers: [{ id: 'a1', text: 'Con volúmenes', userName: 'Mánu', isAdmin: true }, { id: 'a2', text: 'Con bind mounts' }],
    replies: [{ id: 'r1', text: 'A mí me sirvió', userName: 'Bea' }, { text: 'Gracias' }],
    votes: { a2: ['u1', 'u2'], r1: ['u3'] },
  },
  { id: 'q2', text: '¿Y las redes?', userId: 'u2', public: true, createdAt: { toDate: () => new Date('2026-11-09T10:00:00Z') } },
];
const flush = () => new Promise((r) => setTimeout(r, 0));
const $ = (el, s) => el.shadowRoot.querySelector(s);
const $$ = (el, s) => [...el.shadowRoot.querySelectorAll(s)];
const settle = async (el) => { for (let i = 0; i < 4; i++) await flush(); await el.updateComplete; };
const type = async (el, node, value) => { node.value = value; node.dispatchEvent(new Event('input')); await el.updateComplete; };

async function mount() {
  const el = Object.assign(document.createElement('lesson-qa'), { lessonId: 'l1', moduleId: 'm1' });
  document.body.appendChild(el);
  await settle(el);
  return el;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchQuestionsByLesson.mockResolvedValue({ success: true, questions: QUESTIONS });
  for (const fn of [api.createQuestion, api.addReply, api.toggleVote]) fn.mockResolvedValue({ success: true });
});
afterEach(() => { document.body.innerHTML = ''; });

describe('lesson-qa', () => {
  it('shows the load error with a retry, and the empty state', async () => {
    api.fetchQuestionsByLesson.mockResolvedValueOnce({ success: false });
    const el = await mount();
    expect($(el, '.state-error').textContent).toContain('Error al cargar las preguntas');
    api.fetchQuestionsByLesson.mockResolvedValueOnce({ success: true, questions: [] });
    $(el, '.state-retry-btn').click();
    await settle(el);
    expect($(el, '.empty-state')).not.toBeNull();
  });

  it('lists questions with their state, privacy and answers sorted by votes', async () => {
    const el = await mount();
    expect(api.fetchQuestionsByLesson).toHaveBeenCalledWith('l1', 'u1');
    const [mine, other] = $$(el, '.question-item');
    expect(mine.querySelector('.privacy-badge')).not.toBeNull();
    expect(mine.querySelector('.answered-badge')).not.toBeNull();
    expect(other.classList.contains('question-item--pending')).toBe(true);
    expect(other.querySelector('.privacy-badge')).toBeNull();
    expect(other.querySelector('.question-meta').textContent).toContain('Anónimo');
    const answers = [...mine.querySelectorAll('.answer-list .answer-text')].map((a) => a.textContent);
    expect(answers).toEqual(['Con bind mounts', 'Con volúmenes']);
    expect(mine.querySelector('.answer-list .vote-btn.voted')).not.toBeNull();
    expect(mine.querySelector('.profesor-badge')).not.toBeNull();
    expect(mine.querySelectorAll('.replies-section .vote-btn')).toHaveLength(1);
  });

  it('asks a new question and reloads', async () => {
    const el = await mount();
    const button = $(el, '.qa-form button');
    expect(button.disabled).toBe(true);
    await type(el, $(el, '.qa-form textarea'), '¿Qué es un registry?');
    $(el, '.qa-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(el);
    expect(api.createQuestion).toHaveBeenCalledWith({ text: '¿Qué es un registry?', userId: 'u1', userName: 'Ana', lessonId: 'l1', moduleId: 'm1' });
    expect($(el, '.qa-form textarea').value).toBe('');
    expect(api.fetchQuestionsByLesson).toHaveBeenCalledTimes(2);
  });

  it('replies to a question, and cancels a reply', async () => {
    const el = await mount();
    $(el, '.reply-btn').click();
    await el.updateComplete;
    await type(el, $(el, '.reply-form textarea'), 'Usa volúmenes con nombre');
    $(el, '.reply-form button').click();
    await settle(el);
    expect(api.addReply).toHaveBeenCalledWith('q1', { text: 'Usa volúmenes con nombre', userId: 'u1', userName: 'Ana' });
    expect($(el, '.reply-form')).toBeNull();

    $(el, '.reply-btn').click();
    await el.updateComplete;
    $(el, '.reply-btn').click();
    await el.updateComplete;
    expect($(el, '.reply-form')).toBeNull();
  });

  it('votes an answer and reloads', async () => {
    const el = await mount();
    $(el, '.answer-list .vote-btn').click();
    await settle(el);
    expect(api.toggleVote).toHaveBeenCalledWith('q1', 'a2', 'u1');
    expect(api.fetchQuestionsByLesson).toHaveBeenCalledTimes(2);
  });
});
