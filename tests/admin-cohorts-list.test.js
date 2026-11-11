import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));

const api = { fetchAllCohorts: vi.fn(), createCohort: vi.fn(), updateCohort: vi.fn() };
vi.mock('../src/lib/firebase/cohorts.js', () => Object.fromEntries(Object.keys(api).map((k) => [k, (...a) => api[k](...a)])));
vi.mock('../src/lib/auth-ready.js', () => ({ waitForAuth: vi.fn(() => Promise.resolve({ uid: 'admin' })) }));

await import('../src/components/admin-cohorts-list.js');

const COHORTS = [
  { id: 'c1', name: 'Karajan v4 · 2026-11', slug: 'karajan-v4-2026-11', startDate: '2026-11-01', expiryDate: '2099-01-01', active: true },
  { id: 'c2', name: 'Docker 2025', code: 'docker-2025', startDate: '2025-01-01', expiryDate: '2025-06-01', active: true },
  { id: 'c3', name: 'Piloto', startDate: '2026-01-01', expiryDate: '2099-01-01', active: false },
];
const flush = () => new Promise((r) => setTimeout(r, 0));
const $ = (el, s) => el.shadowRoot.querySelector(s);
const $$ = (el, s) => [...el.shadowRoot.querySelectorAll(s)];
const settle = async (el) => { for (let i = 0; i < 4; i++) await flush(); await el.updateComplete; };
const button = (root, text) => [...root.querySelectorAll('button')].find((b) => b.textContent.trim().includes(text));
const submit = async (el) => { $(el, 'form').dispatchEvent(new Event('submit', { cancelable: true })); await settle(el); };
async function fill(el, values) {
  for (const [name, value] of Object.entries(values)) {
    const input = $(el, `[name="${name}"]`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }
  await el.updateComplete;
}
async function mount() {
  const el = document.createElement('admin-cohorts-list');
  document.body.appendChild(el);
  await settle(el);
  return el;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchAllCohorts.mockResolvedValue({ success: true, cohorts: COHORTS });
  api.createCohort.mockResolvedValue({ success: true });
  api.updateCohort.mockResolvedValue({ success: true });
});
afterEach(() => { document.body.innerHTML = ''; });

describe('admin-cohorts-list', () => {
  it('shows the load error and the empty state', async () => {
    api.fetchAllCohorts.mockResolvedValueOnce({ success: false, error: 'Sin acceso' });
    expect($(await mount(), '.error-msg').textContent).toContain('Sin acceso');
    document.body.innerHTML = '';
    api.fetchAllCohorts.mockResolvedValueOnce({ success: true, cohorts: [] });
    expect($(await mount(), '.empty-state').textContent).toContain('No hay convocatorias');
  });

  it('lists cohorts with their id and status', async () => {
    const el = await mount();
    const rows = $$(el, 'tbody tr');
    expect(rows.map((r) => r.querySelectorAll('td')[1].textContent)).toEqual(['karajan-v4-2026-11', 'docker-2025', 'c3']);
    expect(rows.map((r) => r.querySelector('.status-badge').textContent.trim())).toEqual(['Activa', 'Expirada', 'Inactiva']);
    expect(rows[1].classList.contains('row--expired')).toBe(true);
  });

  it('activates and deactivates a cohort', async () => {
    const el = await mount();
    button($$(el, 'tbody tr')[0], 'Desactivar').click();
    await settle(el);
    expect(api.updateCohort).toHaveBeenCalledWith('c1', { active: false });
    expect(button($$(el, 'tbody tr')[0], 'Activar')).toBeDefined();
  });

  it('validates and creates a cohort', async () => {
    const el = await mount();
    button(el.shadowRoot, 'Nueva convocatoria').click();
    await el.updateComplete;
    await submit(el);
    expect($(el, '.form-error').textContent).toContain('El nombre es obligatorio');
    await fill(el, { name: 'Docker 2027', startDate: '2027-01-01', expiryDate: '2027-06-01' });
    await submit(el);
    expect(api.createCohort).toHaveBeenCalledWith({ name: 'Docker 2027', startDate: '2027-01-01', expiryDate: '2027-06-01' });
    expect($(el, '.form-card')).toBeNull();
  });

  it('edits a cohort keeping its id, and shows save errors', async () => {
    const el = await mount();
    button($$(el, 'tbody tr')[1], 'Editar').click();
    await el.updateComplete;
    expect($(el, '.slug-display').textContent).toBe('docker-2025');
    api.updateCohort.mockResolvedValueOnce({ success: false, error: 'No se pudo guardar' });
    await submit(el);
    expect($(el, '.form-error').textContent).toContain('No se pudo guardar');
    await fill(el, { expiryDate: '2027-01-01' });
    await submit(el);
    expect(api.updateCohort).toHaveBeenLastCalledWith('c2', expect.objectContaining({ slug: 'docker-2025', expiryDate: '2027-01-01' }));
    expect($(el, '.form-card')).toBeNull();
  });

  it('reports creation errors and closes the form on cancel', async () => {
    api.createCohort.mockResolvedValueOnce({ success: false, error: 'Ya existe' });
    const el = await mount();
    button(el.shadowRoot, 'Nueva convocatoria').click();
    await el.updateComplete;
    await fill(el, { name: 'Docker 2027', startDate: '2027-01-01', expiryDate: '2027-06-01' });
    await submit(el);
    expect($(el, '.form-error').textContent).toContain('Ya existe');
    button(el.shadowRoot, 'Cancelar').click();
    await el.updateComplete;
    expect($(el, '.form-card')).toBeNull();
  });
});
