import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));
const mockResults = vi.fn();
vi.mock('../src/lib/firebase/quizzes.js', () => ({ getUserQuizResults: (...a) => mockResults(...a) }));
const mockSessions = vi.fn();
vi.mock('../src/lib/firebase/sessions.js', () => ({ fetchSessionsByCohort: (...a) => mockSessions(...a) }));
const mockCertificate = vi.fn();
vi.mock('../src/lib/firebase/certificates.js', () => ({ getCertificateById: (...a) => mockCertificate(...a) }));
vi.mock('../src/lib/auth-ready.js', () => ({ waitForAuth: vi.fn(() => Promise.resolve({ uid: 'u1' })) }));

await import('../src/components/quiz-results-view.js');
await import('../src/components/student-sessions-view.js');
await import('../src/components/certificate-verify.js');

const flush = () => new Promise((r) => setTimeout(r, 0));
const $ = (el, s) => el.shadowRoot.querySelector(s);
const $$ = (el, s) => [...el.shadowRoot.querySelectorAll(s)];
async function mount(tag, props = {}) {
  const el = Object.assign(document.createElement(tag), props);
  document.body.appendChild(el);
  for (let i = 0; i < 4; i++) await flush();
  await el.updateComplete;
  return el;
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => { document.body.innerHTML = ''; });

describe('quiz-results-view', () => {
  const RESULTS = [
    {
      responseId: 'r1', quizTitle: 'Quiz Docker', completedAt: '2026-11-10T10:00:00Z',
      questions: [{ text: '¿Imagen?', type: 'multiple', options: ['Sí', 'No'] }, { text: 'Explica un volumen', type: 'open' }, { text: '¿Algo más?', type: 'open' }],
      userAnswers: ['Sí', 'Datos persistentes', ''],
    },
    { responseId: 'r2', quizTitle: 'Quiz Redes', completedAt: { toDate: () => new Date('2026-11-09T10:00:00Z') }, questions: [], userAnswers: [] },
    { responseId: 'r3', quizTitle: 'Quiz sin fecha', completedAt: 42, questions: [], userAnswers: [] },
  ];

  it('shows the error and the empty state', async () => {
    mockResults.mockResolvedValueOnce({ success: false, error: 'Sin conexión' });
    expect($(await mount('quiz-results-view'), '.error-msg').textContent).toBe('Sin conexión');
    document.body.innerHTML = '';
    mockResults.mockResolvedValueOnce({ success: true, results: [] });
    expect($(await mount('quiz-results-view'), '.empty-state').textContent).toContain('Aún no has completado');
  });

  it('lists the results and expands the answers of one', async () => {
    mockResults.mockResolvedValue({ success: true, results: RESULTS });
    const el = await mount('quiz-results-view');
    expect($(el, '.results-header p').textContent).toBe('Has completado 3 quizzes');
    expect($$(el, '.quiz-card__date').map((d) => d.textContent)).toEqual(['10/11/2026', '9/11/2026', '']);
    $(el, '.quiz-card__header').click();
    await el.updateComplete;
    expect($(el, '.option-item--selected').textContent.trim()).toBe('▸ Sí');
    expect($$(el, '.answer--user').map((a) => a.textContent.replace(/\s+/g, ' ').trim())).toEqual([
      'edit Tu respuesta: Datos persistentes', 'edit Tu respuesta: (sin respuesta)',
    ]);
    $(el, '.quiz-card__header').click();
    await el.updateComplete;
    expect($(el, '.quiz-detail')).toBeNull();
  });

  it('uses the singular for a single quiz', async () => {
    mockResults.mockResolvedValue({ success: true, results: [RESULTS[1]] });
    expect($(await mount('quiz-results-view'), '.results-header p').textContent).toBe('Has completado 1 quiz');
  });
});

describe('student-sessions-view', () => {
  const SESSIONS = [
    { title: 'Repaso', date: '2099-01-15', time: '18:00', duration: 90, zoomUrl: 'https://zoom.us/j/1', quizId: 'qz1' },
    { title: 'Kick-off', date: '2020-01-10', time: '17:00', duration: 60, zoomUrl: 'https://zoom.us/j/2' },
  ];

  it('does nothing without a cohort', async () => {
    const el = await mount('student-sessions-view');
    expect(mockSessions).not.toHaveBeenCalled();
    el._loadSessions();
    await el.updateComplete;
    expect($(el, '.loading')).toBeNull();
  });

  it('shows the error, and the empty upcoming list', async () => {
    mockSessions.mockResolvedValueOnce({ success: false, error: 'Sin acceso' });
    expect($(await mount('student-sessions-view', { cohortId: 'c1' }), '.error-msg').textContent).toBe('Sin acceso');
    document.body.innerHTML = '';
    mockSessions.mockResolvedValueOnce({ success: true, sessions: [SESSIONS[1]] });
    const el = await mount('student-sessions-view', { cohortId: 'c1' });
    expect($(el, '.empty-state').textContent).toContain('No hay sesiones programadas');
    expect($(el, '.session-card--past .btn-zoom')).toBeNull();
  });

  it('splits upcoming and past sessions with the Zoom link and the required quiz', async () => {
    mockSessions.mockResolvedValue({ success: true, sessions: SESSIONS });
    const el = await mount('student-sessions-view', { cohortId: 'c1' });
    expect(mockSessions).toHaveBeenCalledWith('c1');
    const [upcoming, past] = $$(el, '.session-card');
    expect(upcoming.querySelector('.badge--upcoming')).not.toBeNull();
    expect(upcoming.querySelector('.btn-zoom').getAttribute('href')).toBe('https://zoom.us/j/1');
    expect(upcoming.querySelector('.quiz-reminder a').getAttribute('href')).toBe('/curso/quiz/qz1');
    expect(upcoming.querySelector('.session-meta').textContent).toContain('15 de enero');
    expect(past.classList.contains('session-card--past')).toBe(true);
  });
});

describe('certificate-verify', () => {
  const visit = (query) => window.history.replaceState({}, '', `/verificar-certificado${query}`);
  afterEach(() => visit(''));

  it.each([
    ['without id', '', null, 'No se encontró'],
    ['unknown id', '?id=x', { success: false, certificate: null }, 'No se encontró'],
    ['a failing lookup', '?id=x', { success: false, error: 'boom' }, 'Error al verificar'],
  ])('explains %s', async (_case, query, result, text) => {
    visit(query);
    if (result) mockCertificate.mockResolvedValueOnce(result);
    expect((await mount('certificate-verify')).shadowRoot.textContent).toContain(text);
  });

  it('shows a valid certificate with its grade, or without date and grade', async () => {
    visit('?id=cert-1');
    mockCertificate.mockResolvedValueOnce({
      success: true,
      certificate: { userName: 'Ana Pérez', courseName: 'Docker', completedAt: '2026-11-10T10:00:00Z', averageGrade: 8.25 },
    });
    let el = await mount('certificate-verify');
    expect(mockCertificate).toHaveBeenCalledWith('cert-1');
    expect($$(el, '.verify-value').map((v) => v.textContent)).toEqual(['Ana Pérez', 'Docker', '10 de noviembre de 2026', '8.3']);
    document.body.innerHTML = '';
    mockCertificate.mockResolvedValueOnce({ success: true, certificate: { userName: 'Bea', courseName: 'Docker' } });
    el = await mount('certificate-verify');
    expect($$(el, '.verify-value').map((v) => v.textContent)).toEqual(['Bea', 'Docker', 'N/A']);
  });
});
