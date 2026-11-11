import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));

const api = { fetchAllSessions: vi.fn(), createSession: vi.fn(), updateSession: vi.fn(), deleteSession: vi.fn() };
vi.mock('../src/lib/firebase/sessions.js', async (importOriginal) => ({
  validateSession: (await importOriginal()).validateSession,
  ...Object.fromEntries(Object.keys(api).map((k) => [k, (...a) => api[k](...a)])),
}));
const mockUsers = vi.fn();
const mockNotify = vi.fn();
vi.mock('../src/lib/firebase/users.js', () => ({ fetchAllUsers: (...a) => mockUsers(...a) }));
vi.mock('../src/lib/firebase/user-notifications.js', () => ({ notifyUsers: (...a) => mockNotify(...a) }));
vi.mock('../src/lib/auth-ready.js', () => ({ waitForAuth: vi.fn(() => Promise.resolve({ uid: 'admin' })) }));

await import('../src/components/admin-sessions-list.js');

const SESSIONS = [
  { id: 's1', title: 'Repaso Docker', date: '2099-01-15', time: '18:00', duration: 90, zoomUrl: 'https://zoom.us/j/1', moduleId: 'm1', cohortId: 'c1' },
  { id: 's2', title: 'Kick-off', date: '2020-01-10', time: '17:00', duration: 60, zoomUrl: 'https://zoom.us/j/2', moduleId: 'm1', cohortId: 'c1' },
];
const flush = () => new Promise((r) => setTimeout(r, 0));
const $ = (el, s) => el.shadowRoot.querySelector(s);
const settle = async (el) => { for (let i = 0; i < 4; i++) await flush(); await el.updateComplete; };
const button = (el, text) => [...el.shadowRoot.querySelectorAll('button')].find((b) => b.textContent.includes(text));
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
  const el = document.createElement('admin-sessions-list');
  document.body.appendChild(el);
  await settle(el);
  return el;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchAllSessions.mockResolvedValue({ success: true, sessions: SESSIONS });
  for (const fn of [api.createSession, api.updateSession, api.deleteSession, mockNotify]) fn.mockResolvedValue({ success: true });
  mockUsers.mockResolvedValue({ success: true, users: [{ uid: 'st1', role: 'student' }, { uid: 'ad1', role: 'admin' }] });
});
afterEach(() => { document.body.innerHTML = ''; });

describe('admin-sessions-list', () => {
  it('shows the load error and the empty state', async () => {
    api.fetchAllSessions.mockResolvedValueOnce({ success: false, error: 'Sin acceso' });
    expect($(await mount(), '.error-msg').textContent).toContain('Sin acceso');
    document.body.innerHTML = '';
    api.fetchAllSessions.mockResolvedValueOnce({ success: true, sessions: [] });
    expect($(await mount(), '.empty-state').textContent).toContain('No hay sesiones');
  });

  it('lists upcoming and past sessions with their details', async () => {
    const el = await mount();
    const cards = [...el.shadowRoot.querySelectorAll('.session-card')];
    expect(cards[0].querySelector('.badge--upcoming').textContent.trim()).toBe('Próxima');
    expect(cards[1].querySelector('.badge--past').textContent.trim()).toBe('Pasada');
    expect(cards[0].querySelector('.session-meta').textContent).toContain('15/01/2099');
    expect(cards[0].querySelector('.session-link').getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('validates and creates a session, notifying the students', async () => {
    const el = await mount();
    button(el, 'Nueva sesión').click();
    await el.updateComplete;
    await submit(el);
    expect($(el, '.form-error')).not.toBeNull();
    await fill(el, {
      title: 'Taller Compose', date: '2099-02-01', time: '18:00', duration: '45',
      moduleId: 'm2', zoomUrl: 'https://zoom.us/j/3', cohortId: 'c1',
    });
    const notify = $(el, '#notify-students');
    notify.checked = true;
    notify.dispatchEvent(new Event('change'));
    await submit(el);
    expect(api.createSession.mock.calls[0][0]).toMatchObject({ title: 'Taller Compose', duration: 45 });
    expect(mockNotify).toHaveBeenCalledWith(['st1'], { type: 'new_session', message: 'Nueva sesión programada: Taller Compose' });
    expect($(el, '.form-card')).toBeNull();
  });

  it('edits a session and shows save errors', async () => {
    api.updateSession.mockResolvedValueOnce({ success: false, error: 'No se pudo guardar' });
    const el = await mount();
    button(el, 'Editar').click();
    await el.updateComplete;
    expect($(el, '#session-title').value).toBe('Repaso Docker');
    expect($(el, '#notify-students')).toBeNull();
    await submit(el);
    expect($(el, '.form-error').textContent).toContain('No se pudo guardar');
    await submit(el);
    expect(api.updateSession).toHaveBeenLastCalledWith('s1', expect.objectContaining({ title: 'Repaso Docker' }));
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('deletes a session and closes the form on cancel', async () => {
    const el = await mount();
    button(el, 'Eliminar').click();
    await settle(el);
    expect(api.deleteSession).toHaveBeenCalledWith('s1');
    button(el, 'Nueva sesión').click();
    await el.updateComplete;
    button(el, 'Cancelar').click();
    await el.updateComplete;
    expect($(el, '.form-card')).toBeNull();
  });
});
