import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const auth = { loginWithGoogle: vi.fn(), completeRegistration: vi.fn(), logoutUser: vi.fn(), fetchActiveConvocatorias: vi.fn() };
let authUser = { uid: 'u1' };
const unsubscribe = vi.fn();
vi.mock('../src/lib/firebase/auth.js', () => ({
  ...Object.fromEntries(Object.keys(auth).map((k) => [k, (...a) => auth[k](...a)])),
  onAuthChange: (cb) => { cb(authUser); return unsubscribe; },
}));
const mockFetchUser = vi.fn();
vi.mock('../src/lib/firebase/users.js', () => ({ fetchUser: (...a) => mockFetchUser(...a) }));

await import('../src/components/auth-form.js');
await import('../src/components/auth-guard.js');

const flush = () => new Promise((r) => setTimeout(r, 0));
const $ = (el, s) => el.shadowRoot.querySelector(s);
const settle = async (el) => { for (let i = 0; i < 4; i++) await flush(); await el.updateComplete; };
async function mount(tag) {
  const el = document.createElement(tag);
  el.innerHTML = '<p id="content">Contenido</p>';
  document.body.appendChild(el);
  await settle(el);
  return el;
}
const originalLocation = window.location;
let navigatedTo;

beforeEach(() => {
  vi.clearAllMocks();
  authUser = { uid: 'u1' };
  navigatedTo = null;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { set href(v) { navigatedTo = v; }, get href() { return navigatedTo ?? ''; } },
  });
  auth.logoutUser.mockResolvedValue({ success: true });
});
afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  document.body.innerHTML = '';
});

describe('auth-form', () => {
  it('shows the Google error, or sends existing users to their dashboard', async () => {
    auth.loginWithGoogle.mockResolvedValueOnce({ success: false, error: 'Ventana cerrada' });
    const el = await mount('auth-form');
    $(el, '.google-btn').click();
    await settle(el);
    expect($(el, '[role="alert"]').textContent).toBe('Ventana cerrada');
    auth.loginWithGoogle.mockResolvedValueOnce({ success: true, isNewUser: false, user: { uid: 'u1' } });
    $(el, '.google-btn').click();
    await settle(el);
    expect(navigatedTo).toBe('/dashboard');
  });

  it('registers a new user in the chosen cohort', async () => {
    auth.loginWithGoogle.mockResolvedValue({ success: true, isNewUser: true, user: { uid: 'u2', email: 'bea@test.local' } });
    auth.fetchActiveConvocatorias.mockResolvedValue({ success: true, cohorts: [{ id: 'c1', name: 'Docker 2026' }] });
    auth.completeRegistration.mockResolvedValueOnce({ success: false, error: 'Sin permisos' }).mockResolvedValueOnce({ success: true });
    const el = await mount('auth-form');
    $(el, '.google-btn').click();
    await settle(el);
    expect($(el, '.welcome-text').textContent).toContain('bea@test.local');
    const select = $(el, '#cohortSelect');
    select.value = 'c1';
    select.dispatchEvent(new Event('change'));
    $(el, 'form').dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(el);
    expect($(el, '[role="alert"]').textContent).toBe('Sin permisos');
    $(el, 'form').dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(el);
    expect(auth.completeRegistration).toHaveBeenLastCalledWith({ uid: 'u2', email: 'bea@test.local' }, 'c1');
    expect($(el, '.success-message')).not.toBeNull();
  });

  it('explains there are no open cohorts and lets the user cancel', async () => {
    auth.loginWithGoogle.mockResolvedValue({ success: true, isNewUser: true, user: { uid: 'u2', displayName: 'Bea' } });
    auth.fetchActiveConvocatorias.mockResolvedValue({ success: false });
    const el = await mount('auth-form');
    $(el, '.google-btn').click();
    await settle(el);
    expect(el.shadowRoot.textContent).toContain('No hay convocatorias abiertas');
    $(el, '.cancel-link a').click();
    await settle(el);
    expect(auth.logoutUser).toHaveBeenCalled();
    expect($(el, '.google-btn')).not.toBeNull();
  });
});

describe('auth-guard', () => {
  it('shows the protected content to active users and stops listening on removal', async () => {
    mockFetchUser.mockResolvedValue({ success: true, user: { status: 'active' } });
    const el = await mount('auth-guard');
    expect($(el, 'slot')).not.toBeNull();
    el.remove();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it.each([
    ['pending', 'Cuenta pendiente de validación'],
    ['inactive', 'Cuenta desactivada'],
  ])('blocks %s accounts and lets them sign out', async (status, title) => {
    mockFetchUser.mockResolvedValue({ success: true, user: { status } });
    const el = await mount('auth-guard');
    expect($(el, '.pending-title').textContent).toBe(title);
    expect($(el, 'slot')).toBeNull();
    $(el, '.pending-logout').click();
    expect(auth.logoutUser).toHaveBeenCalled();
  });

  it('sends visitors without session to the login page', async () => {
    authUser = null;
    const el = await mount('auth-guard');
    expect(navigatedTo).toBe('/login');
    expect($(el, 'slot')).toBeNull();
  });
});
