import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));

const mockSubmit = vi.fn();
const mockGetResponse = vi.fn();

vi.mock('../src/lib/firebase/quizzes.js', () => ({
  fetchQuizzesByLessonId: vi.fn(() =>
    Promise.resolve({
      success: true,
      quizzes: [
        {
          id: 'q1',
          lessonId: 'l1',
          questions: [{ text: 'Explica el falso verde', type: 'open', explanation: 'Afirma sin probar' }],
        },
      ],
    })
  ),
  submitLessonQuizResponse: (...a) => mockSubmit(...a),
  getStudentQuizResponse: (...a) => mockGetResponse(...a),
}));
vi.mock('../src/lib/auth-ready.js', () => ({
  waitForAuth: vi.fn(() => Promise.resolve({ uid: 'u1', email: 'alumno@test.local' })),
}));

await import('../src/components/lesson-quiz.js');

const flush = () => new Promise((r) => setTimeout(r, 0));

async function mount() {
  const el = document.createElement('lesson-quiz');
  el.lessonId = 'l1';
  document.body.appendChild(el);
  await flush();
  await flush();
  await el.updateComplete;
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('lesson-quiz with open questions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetResponse.mockResolvedValue({ success: true, response: null });
    mockSubmit.mockResolvedValue({ success: true });
  });

  it('renders a labelled textarea instead of options', async () => {
    const el = await mount();
    const textarea = el.shadowRoot.querySelector('textarea.open-answer');
    expect(textarea).not.toBeNull();
    expect(el.shadowRoot.querySelector(`label[for="${textarea.id}"]`)).not.toBeNull();
    expect(el.shadowRoot.querySelector('input[type="radio"]')).toBeNull();
  });

  it('keeps the confirm button disabled while the answer is blank', async () => {
    const el = await mount();
    const textarea = el.shadowRoot.querySelector('textarea.open-answer');
    textarea.value = '   ';
    textarea.dispatchEvent(new Event('input'));
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('.submit-btn').disabled).toBe(true);
  });

  it('submits the written text without grading and shows the reference answer', async () => {
    const el = await mount();
    const textarea = el.shadowRoot.querySelector('textarea.open-answer');
    textarea.value = 'Dice que pasa sin ejecutar los tests';
    textarea.dispatchEvent(new Event('input'));
    await el.updateComplete;

    el.shadowRoot.querySelector('.submit-btn').click(); // confirm
    await el.updateComplete;
    el.shadowRoot.querySelector('.submit-btn').click(); // send
    await flush();
    await el.updateComplete;

    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ answers: [{ text: 'Dice que pasa sin ejecutar los tests' }] })
    );
    expect(el.shadowRoot.querySelector('.feedback-icon')).toBeNull();
    expect(el.shadowRoot.querySelector('.explanation').textContent).toContain('Respuesta de referencia');
  });

  it('restores a previously written answer', async () => {
    mockGetResponse.mockResolvedValue({ success: true, response: { answers: [{ text: 'Respuesta previa' }] } });
    const el = await mount();
    expect(el.shadowRoot.querySelector('textarea.open-answer').value).toBe('Respuesta previa');
    expect(el.shadowRoot.querySelector('textarea.open-answer').disabled).toBe(true);
  });
});
