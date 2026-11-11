import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));

const mockLogin = vi.fn();
const mockLogout = vi.fn(() => Promise.resolve({ success: true }));
vi.mock('../src/lib/firebase/auth.js', () => ({
  loginWithGoogle: (...a) => mockLogin(...a),
  logoutUser: (...a) => mockLogout(...a),
}));

const mockFetchInvitation = vi.fn();
const mockAccept = vi.fn();
vi.mock('../src/lib/firebase/invitations.js', () => ({
  fetchInvitation: (...a) => mockFetchInvitation(...a),
  acceptInvitation: (...a) => mockAccept(...a),
}));

await import('../src/components/invitation-accept.js');

const flush = () => new Promise((r) => setTimeout(r, 0));
const user = { uid: 'u1', email: 'ana@example.com', displayName: 'Ana' };
const invitation = (extra = {}) => ({
  id: 'tok', email: 'ana@example.com', cohortId: 'c1', status: 'pending',
  expiresAt: new Date(Date.now() + 86_400_000), ...extra,
});

async function mount(token = 'tok') {
  const el = document.createElement('invitation-accept');
  el.token = token;
  el._navigate = vi.fn();
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

async function clickLogin(el) {
  el.shadowRoot.querySelector('button').click();
  await flush();
  await flush();
  await el.updateComplete;
}

const alertText = (el) => el.shadowRoot.querySelector('[role="alert"]')?.textContent ?? '';

beforeEach(() => vi.clearAllMocks());
afterEach(() => { document.body.innerHTML = ''; });

describe('invitation-accept', () => {
  it('explains the link is incomplete when there is no token', async () => {
    const el = await mount('');
    expect(alertText(el)).toContain('no existe');
    expect(el.shadowRoot.querySelector('button')).toBeNull();
  });

  it('creates the active profile and goes to the dashboard', async () => {
    mockLogin.mockResolvedValue({ success: true, user, isNewUser: true });
    const valid = invitation();
    mockFetchInvitation.mockResolvedValue({ success: true, invitation: valid });
    mockAccept.mockResolvedValue({ success: true });
    const el = await mount();

    await clickLogin(el);

    expect(mockFetchInvitation).toHaveBeenCalledWith('tok');
    expect(mockAccept).toHaveBeenCalledWith(user, valid);
    expect(el._navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('sends people who already have an account to their dashboard', async () => {
    mockLogin.mockResolvedValue({ success: true, user, isNewUser: false });
    const el = await mount();
    await clickLogin(el);
    expect(mockAccept).not.toHaveBeenCalled();
    expect(el.shadowRoot.textContent).toContain('Ya tienes cuenta');
  });

  it('explains why the invitation is not valid and signs the account out', async () => {
    mockLogin.mockResolvedValue({ success: true, user: { ...user, email: 'otra@example.com' }, isNewUser: true });
    mockFetchInvitation.mockResolvedValue({ success: true, invitation: invitation() });
    const el = await mount();

    await clickLogin(el);

    expect(alertText(el)).toContain('otro correo');
    expect(mockAccept).not.toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
  });

  it('reports an expired invitation', async () => {
    mockLogin.mockResolvedValue({ success: true, user, isNewUser: true });
    mockFetchInvitation.mockResolvedValue({ success: true, invitation: invitation({ expiresAt: new Date(Date.now() - 1000) }) });
    const el = await mount();
    await clickLogin(el);
    expect(alertText(el)).toContain('caducado');
  });

  it('shows the error when accepting fails', async () => {
    mockLogin.mockResolvedValue({ success: true, user, isNewUser: true });
    mockFetchInvitation.mockResolvedValue({ success: true, invitation: invitation() });
    mockAccept.mockResolvedValue({ success: false, error: 'No se ha podido aceptar la invitación' });
    const el = await mount();
    await clickLogin(el);
    expect(alertText(el)).toContain('No se ha podido aceptar');
    expect(el._navigate).not.toHaveBeenCalled();
  });
});
