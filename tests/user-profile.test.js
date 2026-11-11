import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/components/activity-heatmap.js', () => ({}));
const users = { fetchUser: vi.fn(), updateUserDisplayName: vi.fn(), updateWeeklyDigest: vi.fn() };
vi.mock('../src/lib/firebase/users.js', () => Object.fromEntries(Object.keys(users).map((k) => [k, (...a) => users[k](...a)])));
let authUser = { uid: 'u1' };
const unsubscribe = vi.fn();
vi.mock('../src/lib/firebase/auth.js', () => ({
  getCurrentUser: vi.fn(),
  onAuthChange: (cb) => { cb(authUser); return unsubscribe; },
}));
const mockBadges = vi.fn();
vi.mock('../src/lib/firebase/badges.js', () => ({ getUserBadges: (...a) => mockBadges(...a) }));

await import('../src/components/user-profile.js');

const PROFILE = { uid: 'u1', email: 'ana@test.local', displayName: 'Ana', role: 'student', cohortId: 'c1', createdAt: '2026-09-01T10:00:00Z' };
const flush = () => new Promise((r) => setTimeout(r, 0));
const $ = (el, s) => el.shadowRoot.querySelector(s);
const settle = async (el) => { for (let i = 0; i < 4; i++) await flush(); await el.updateComplete; };
const button = (el, text) => [...el.shadowRoot.querySelectorAll('button')].find((b) => b.textContent.trim() === text);

async function mount() {
  const el = document.createElement('user-profile');
  document.body.appendChild(el);
  await settle(el);
  return el;
}

beforeEach(() => {
  vi.clearAllMocks();
  authUser = { uid: 'u1' };
  users.fetchUser.mockResolvedValue({ success: true, user: PROFILE });
  users.updateUserDisplayName.mockResolvedValue({ success: true });
  users.updateWeeklyDigest.mockResolvedValue({ success: true });
  mockBadges.mockResolvedValue({ success: true, badges: [] });
});
afterEach(() => { document.body.innerHTML = ''; });

describe('user-profile', () => {
  it('explains when there is no session or the profile cannot be loaded', async () => {
    authUser = null;
    expect((await mount()).shadowRoot.textContent).toContain('No se pudo cargar el perfil');
    document.body.innerHTML = '';
    authUser = { uid: 'u1' };
    users.fetchUser.mockResolvedValueOnce({ success: false });
    expect((await mount()).shadowRoot.textContent).toContain('No se pudo cargar el perfil');
  });

  it('shows the profile data, the empty badges and stops listening on removal', async () => {
    const el = await mount();
    expect($(el, '.avatar').textContent).toBe('A');
    expect($(el, '.role-badge').textContent.trim()).toBe('Estudiante');
    expect(el.shadowRoot.textContent).toContain('1 de septiembre de 2026');
    expect($(el, '.badges-empty')).not.toBeNull();
    expect($(el, 'activity-heatmap').userId).toBe('u1');
    el.remove();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('lists module and course badges for an admin without name', async () => {
    users.fetchUser.mockResolvedValueOnce({ success: true, user: { ...PROFILE, displayName: '', role: 'admin', cohortId: '' } });
    mockBadges.mockResolvedValueOnce({
      success: true,
      badges: [
        { type: 'module_complete', refTitle: 'Docker básico', awardedAt: { toDate: () => new Date('2026-10-01T10:00:00Z') } },
        { type: 'course_complete', refTitle: 'Docker', awardedAt: null },
      ],
    });
    const el = await mount();
    expect($(el, '.avatar').textContent).toBe('A');
    expect($(el, '.profile-header__name').textContent).toBe('Sin nombre');
    expect($(el, '.role-badge').textContent.trim()).toBe('Administrador');
    expect(el.shadowRoot.querySelectorAll('.badge-card')).toHaveLength(2);
    expect($(el, '.badge-card__icon--course')).not.toBeNull();
  });

  it('edits the display name, and cancels or reports errors', async () => {
    const el = await mount();
    button(el, 'Editar').click();
    await el.updateComplete;
    const input = $(el, '.edit-row input');
    input.value = '  Ana Pérez ';
    input.dispatchEvent(new Event('input'));
    users.updateUserDisplayName.mockResolvedValueOnce({ success: false, error: 'Nombre no válido' });
    button(el, 'Guardar').click();
    await settle(el);
    expect($(el, '.message--error').textContent).toBe('Nombre no válido');
    button(el, 'Guardar').click();
    await settle(el);
    expect(users.updateUserDisplayName).toHaveBeenLastCalledWith('u1', '  Ana Pérez ');
    expect($(el, '.profile-header__name').textContent).toBe('Ana Pérez');
    expect($(el, '.message--success').textContent).toContain('Nombre actualizado');

    button(el, 'Editar').click();
    await el.updateComplete;
    button(el, 'Cancelar').click();
    await el.updateComplete;
    expect($(el, '.edit-row input')).toBeNull();
  });

  it('turns the weekly digest on and off', async () => {
    const el = await mount();
    const toggle = $(el, '.toggle input');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    await settle(el);
    expect(users.updateWeeklyDigest).toHaveBeenCalledWith('u1', true);
    expect($(el, '.message--success').textContent).toBe('Resumen semanal activado');
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    await settle(el);
    expect($(el, '.message--success').textContent).toBe('Resumen semanal desactivado');
    users.updateWeeklyDigest.mockResolvedValueOnce({ success: false, error: 'Sin conexión' });
    toggle.dispatchEvent(new Event('change'));
    await settle(el);
    expect($(el, '.message--error').textContent).toBe('Sin conexión');
  });
});
