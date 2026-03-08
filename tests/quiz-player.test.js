import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS'),
}));

const mockFetchQuiz = vi.fn();
const mockSubmitQuizResponse = vi.fn();
const mockGetUserQuizResponse = vi.fn();
const mockWaitForAuth = vi.fn();

vi.mock('../src/lib/firebase/quizzes.js', () => ({
  fetchQuiz: (...a) => mockFetchQuiz(...a),
  submitQuizResponse: (...a) => mockSubmitQuizResponse(...a),
  getUserQuizResponse: (...a) => mockGetUserQuizResponse(...a),
}));

vi.mock('../src/lib/auth-ready.js', () => ({
  waitForAuth: (...a) => mockWaitForAuth(...a),
}));

import { QuizPlayer } from '../src/components/quiz-player.js';

describe('QuizPlayer', () => {
  let el;

  beforeEach(() => {
    vi.clearAllMocks();
    el = new QuizPlayer();
  });

  afterEach(() => {
    el = null;
  });

  it('should be defined as a custom element', () => {
    expect(customElements.get('quiz-player')).toBeDefined();
  });

  it('should initialize with default state', () => {
    expect(el.quizId).toBe('');
    expect(el._quiz).toBeNull();
    expect(el._answers).toEqual([]);
    expect(el._currentQuestion).toBe(0);
    expect(el._loading).toBe(true);
    expect(el._submitting).toBe(false);
    expect(el._submitted).toBe(false);
    expect(el._error).toBe('');
    expect(el._user).toBeNull();
    expect(el._previousResponse).toBeNull();
  });

  it('should show error when auth fails', async () => {
    mockWaitForAuth.mockRejectedValue(new Error('not logged in'));

    el.quizId = 'test-quiz';
    await el._init();

    expect(el._error).toBe('Debes iniciar sesión para acceder al quiz.');
    expect(el._loading).toBe(false);
  });

  it('should show error when quizId is empty', async () => {
    mockWaitForAuth.mockResolvedValue({ uid: 'u1' });

    el.quizId = '';
    await el._init();

    expect(el._error).toBe('No se proporcionó un ID de quiz válido.');
    expect(el._loading).toBe(false);
  });

  it('should show error when quiz not found', async () => {
    mockWaitForAuth.mockResolvedValue({ uid: 'u1' });
    mockFetchQuiz.mockResolvedValue({ success: false, error: 'Quiz no encontrado' });

    el.quizId = 'nonexistent';
    await el._init();

    expect(el._error).toBe('Quiz no encontrado');
    expect(el._loading).toBe(false);
  });

  it('should load quiz and initialize answers', async () => {
    mockWaitForAuth.mockResolvedValue({ uid: 'u1' });
    mockFetchQuiz.mockResolvedValue({
      success: true,
      quiz: {
        id: 'q1',
        title: 'Test Quiz',
        questions: [
          { text: 'Q1', type: 'multiple', options: ['A', 'B'] },
          { text: 'Q2', type: 'open' },
        ],
      },
    });
    mockGetUserQuizResponse.mockResolvedValue({ success: true, response: null });

    el.quizId = 'q1';
    await el._init();

    expect(el._quiz).toBeTruthy();
    expect(el._quiz.title).toBe('Test Quiz');
    expect(el._answers).toEqual(['', '']);
    expect(el._loading).toBe(false);
    expect(el._submitted).toBe(false);
  });

  it('should detect previously completed quiz', async () => {
    mockWaitForAuth.mockResolvedValue({ uid: 'u1' });
    mockFetchQuiz.mockResolvedValue({
      success: true,
      quiz: {
        id: 'q1',
        title: 'Test Quiz',
        questions: [{ text: 'Q1', type: 'open' }],
      },
    });
    mockGetUserQuizResponse.mockResolvedValue({
      success: true,
      response: { answers: ['My answer'] },
    });

    el.quizId = 'q1';
    await el._init();

    expect(el._submitted).toBe(true);
    expect(el._previousResponse).toBeTruthy();
    expect(el._answers).toEqual(['My answer']);
  });

  it('should track option selection', () => {
    el._quiz = { questions: [{ text: 'Q1', type: 'multiple', options: ['A', 'B'] }] };
    el._answers = [''];
    el._currentQuestion = 0;

    el._selectOption('B');

    expect(el._answers[0]).toBe('B');
  });

  it('should track open answer', () => {
    el._quiz = { questions: [{ text: 'Q1', type: 'open' }] };
    el._answers = [''];
    el._currentQuestion = 0;

    el._setOpenAnswer('My response');

    expect(el._answers[0]).toBe('My response');
  });

  it('should navigate between questions', () => {
    el._quiz = {
      questions: [
        { text: 'Q1', type: 'open' },
        { text: 'Q2', type: 'open' },
        { text: 'Q3', type: 'open' },
      ],
    };
    el._currentQuestion = 0;

    el._nextQuestion();
    expect(el._currentQuestion).toBe(1);

    el._nextQuestion();
    expect(el._currentQuestion).toBe(2);

    // Should not go beyond last question
    el._nextQuestion();
    expect(el._currentQuestion).toBe(2);

    el._prevQuestion();
    expect(el._currentQuestion).toBe(1);

    el._prevQuestion();
    expect(el._currentQuestion).toBe(0);

    // Should not go below 0
    el._prevQuestion();
    expect(el._currentQuestion).toBe(0);
  });

  it('should check if all questions are answered', () => {
    el._answers = ['A', '', 'C'];
    expect(el._allAnswered()).toBe(false);

    el._answers = ['A', 'B', 'C'];
    expect(el._allAnswered()).toBe(true);
  });

  it('should submit answers successfully', async () => {
    el._user = { uid: 'u1' };
    el._quiz = { id: 'q1', questions: [{ text: 'Q1', type: 'open' }] };
    el._answers = ['answer1'];
    mockSubmitQuizResponse.mockResolvedValue({ success: true, id: 'resp1' });

    await el._submit();

    expect(mockSubmitQuizResponse).toHaveBeenCalledWith('u1', 'q1', ['answer1']);
    expect(el._submitted).toBe(true);
    expect(el._submitting).toBe(false);
  });

  it('should handle submit error', async () => {
    el._user = { uid: 'u1' };
    el._quiz = { id: 'q1', questions: [{ text: 'Q1', type: 'open' }] };
    el._answers = ['answer1'];
    mockSubmitQuizResponse.mockResolvedValue({ success: false, error: 'Error al enviar' });

    await el._submit();

    expect(el._submitted).toBe(false);
    expect(el._error).toBe('Error al enviar');
    expect(el._submitting).toBe(false);
  });

  it('should prevent double submission', async () => {
    el._submitting = true;
    await el._submit();
    expect(mockSubmitQuizResponse).not.toHaveBeenCalled();
  });
});
