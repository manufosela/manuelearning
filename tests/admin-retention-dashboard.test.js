import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));

const DEFAULTS = {
  greenDays: 3, yellowDays: 7, weightRecency: 40, weightProgress: 30, weightVelocity: 20,
  weightConsistency: 10, decayFactor: 0.15, targetLessonsPerWeek: 2, churnLow: 60, churnMedium: 40, churnHigh: 20,
};
const mockUsers = vi.fn();
const mockSaveConfig = vi.fn(() => Promise.resolve({ success: true }));
vi.mock('../src/lib/firebase/users.js', () => ({ fetchAllUsers: (...a) => mockUsers(...a) }));
vi.mock('../src/lib/firebase/settings.js', () => ({
  DEFAULT_RETENTION_CONFIG: DEFAULTS,
  getRetentionConfig: vi.fn(() => Promise.resolve({ success: false })),
  saveRetentionConfig: (...a) => mockSaveConfig(...a),
}));
const COMPLETED = { u1: ['l0', 'l1'], u2: ['l0'], u3: ['l0', 'l1', 'l2'] };
vi.mock('../src/lib/firebase/progress.js', () => ({
  getUserProgress: vi.fn((uid) => Promise.resolve({ success: true, completedLessons: COMPLETED[uid].map((l) => ({ lessonId: l })) })),
}));
vi.mock('../src/lib/firebase/modules.js', () => ({
  fetchAllModules: vi.fn(() => Promise.resolve({ success: true, modules: [{ id: 'm1', title: 'Docker' }] })),
  fetchLessons: vi.fn(() => Promise.resolve({
    success: true,
    lessons: [{ id: 'l0', title: 'Intro' }, { id: 'l1', title: 'Volúmenes y redes' }, { id: 'l2', title: 'Compose' }],
  })),
}));
vi.mock('../src/lib/firebase/admin-stats.js', () => ({
  fetchAllProgressRecords: vi.fn(() => Promise.resolve({
    success: true,
    records: Object.entries(COMPLETED).flatMap(([userId, ls]) => ls.map((lessonId) => ({ userId, moduleId: 'm1', lessonId }))),
  })),
  fetchAllQuizResponseRecords: vi.fn(() => Promise.resolve({
    success: true,
    records: [
      { quizId: 'q1', answers: [{ isCorrect: false }, { isCorrect: true }] },
      { quizId: 'q1', answers: ['0', '0'] },
      { quizId: 'unknown', answers: [1] },
    ],
  })),
  fetchAllQuizDefinitions: vi.fn(() => Promise.resolve({
    success: true,
    records: [{ id: 'q1', lessonId: 'l1', questions: [{ text: '¿Qué es un volumen?', correctAnswer: 0 }, { text: '¿Red bridge?', correctAnswer: 1 }] }],
  })),
}));
vi.mock('../src/lib/auth-ready.js', () => ({ waitForAuth: vi.fn(() => Promise.resolve({ uid: 'admin' })) }));

await import('../src/components/admin-retention-dashboard.js');

const flush = () => new Promise((r) => setTimeout(r, 0));
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();
const users = [
  { uid: 'u1', displayName: 'Ana', email: 'ana@test.local', lastActivity: daysAgo(1) },
  { uid: 'u2', email: 'bea@test.local', lastActivity: daysAgo(20), createdAt: { toDate: () => new Date('2026-09-01') } },
  { uid: 'u3', displayName: 'Carlos', lastActivity: daysAgo(5), createdAt: '2026-09-01' },
];

async function mount() {
  const el = document.createElement('admin-retention-dashboard');
  document.body.appendChild(el);
  for (let i = 0; i < 10; i++) await flush();
  await el.updateComplete;
  return el;
}
const $ = (el, s) => el.shadowRoot.querySelector(s);
const $$ = (el, s) => [...el.shadowRoot.querySelectorAll(s)];
const click = async (el, node) => { node.click(); await el.updateComplete; };
const buttonText = (el, text) => $$(el, 'button').find((b) => b.textContent.includes(text));

beforeEach(() => {
  vi.clearAllMocks();
  mockUsers.mockResolvedValue({ success: true, users });
});
afterEach(() => { document.body.innerHTML = ''; });

describe('admin-retention-dashboard', () => {
  it('shows the error when users cannot be loaded', async () => {
    mockUsers.mockResolvedValue({ success: false, error: 'Sin permisos' });
    const el = await mount();
    expect($(el, '.error-msg').textContent).toContain('Sin permisos');
  });

  it('summarises students and lists them with their status', async () => {
    const el = await mount();
    expect($(el, '.summary-card__value').textContent).toBe('3');
    expect($$(el, 'tbody tr')).toHaveLength(3);
    expect(el.shadowRoot.textContent).toContain('bea@test.local');
  });

  it('filters the table by status and shows an empty state', async () => {
    const el = await mount();
    await click(el, buttonText(el, 'Abandono'));
    expect($$(el, 'tbody tr').map((r) => r.textContent)).toEqual([expect.stringContaining('bea@test.local')]);
    await click(el, buttonText(el, 'Activos'));
    expect($$(el, 'tbody tr')).toHaveLength(1);
    await click(el, buttonText(el, 'Todos'));
    expect($$(el, 'tbody tr')).toHaveLength(3);
  });

  it('builds the dropout heatmap and the detail of a lesson', async () => {
    const el = await mount();
    const cells = $$(el, '.heatmap-cell');
    expect(cells.map((c) => c.querySelector('.heatmap-cell__value').textContent)).toEqual(['33%', '33%', '0%']);
    expect(cells[1].querySelector('.heatmap-cell__label').textContent).toBe('Volúmen…');

    await click(el, cells[1]);
    const panel = $(el, '.detail-panel');
    expect(panel.textContent).toContain('Docker — Volúmenes y redes');
    expect(panel.textContent).toContain('Ana');
    expect(panel.textContent).toContain('¿Qué es un volumen?');

    await click(el, $(el, '.detail-panel__close'));
    expect($(el, '.detail-panel')).toBeNull();
  });

  it('switches the heatmap to quiz failures and shows lessons without data', async () => {
    const el = await mount();
    await click(el, buttonText(el, 'Fallos en quiz'));
    const values = $$(el, '.heatmap-cell__value').map((v) => v.textContent);
    expect(values).toEqual(['0%', '100%', '0%']);
    await click(el, $$(el, '.heatmap-cell')[2]);
    expect($(el, '.detail-panel').textContent).toContain('Ningún abandono');
    expect($(el, '.detail-panel').textContent).toContain('Sin datos de quiz');
    await click(el, buttonText(el, 'Tasa de abandono'));
    expect($$(el, '.heatmap-cell__value')[1].textContent).toBe('33%');
  });

  it('edits, validates, saves and resets the algorithm settings', async () => {
    const el = await mount();
    await click(el, buttonText(el, 'Configurar algoritmo'));
    const range = $$(el, 'input[type="range"]')[0];
    range.value = '50';
    range.dispatchEvent(new Event('input'));
    await el.updateComplete;
    expect($(el, '.weight-total').textContent).toContain('debe sumar 100%');
    expect(buttonText(el, 'Guardar configuración').disabled).toBe(true);

    await click(el, buttonText(el, 'Restaurar valores por defecto'));
    expect($(el, '.weight-total').textContent).not.toContain('debe sumar');
    await click(el, buttonText(el, 'Guardar configuración'));
    await flush();
    expect(mockSaveConfig).toHaveBeenCalledWith(DEFAULTS);
  });
});
