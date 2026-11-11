import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));

const mockRevoke = vi.fn();
vi.mock('../src/lib/firebase/invitations.js', () => ({
  revokeInvitation: (...args) => mockRevoke(...args),
}));

await import('../src/components/invitation-list.js');

const flush = () => new Promise((r) => setTimeout(r, 0));
const DAY = 86_400_000;
const invitation = (id, extra = {}) => ({
  id, email: `${id}@example.com`, cohortId: 'c1', status: 'pending', expiresAt: new Date(Date.now() + 10 * DAY), ...extra,
});

async function mount(invitations) {
  const el = document.createElement('invitation-list');
  el.invitations = invitations;
  el.cohortMap = { c1: 'Karajan v4' };
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

const rows = (el) => [...el.shadowRoot.querySelectorAll('li')];
const buttonByText = (root, text) => [...root.querySelectorAll('button')].find((b) => b.textContent.includes(text));

beforeEach(() => mockRevoke.mockReset());
afterEach(() => { document.body.innerHTML = ''; });

describe('invitation-list', () => {
  it('says when there are no pending invitations', async () => {
    const el = await mount([]);
    expect(el.shadowRoot.textContent).toContain('No hay invitaciones pendientes');
  });

  it('shows email, cohort and copy buttons for each invitation', async () => {
    const el = await mount([invitation('ana'), invitation('luis', { cohortId: '' })]);
    const [ana, luis] = rows(el);
    expect(ana.textContent).toContain('ana@example.com');
    expect(ana.textContent).toContain('Karajan v4');
    expect(luis.textContent).toContain('Sin convocatoria');
    expect(ana.querySelectorAll('copy-button')).toHaveLength(2);
    expect(ana.querySelector('copy-button').text).toBe(`${window.location.origin}/invitacion?token=ana`);
  });

  it('flags expired invitations', async () => {
    const el = await mount([invitation('old', { expiresAt: new Date(Date.now() - DAY) })]);
    expect(rows(el)[0].textContent).toContain('Caducada');
  });

  it('asks for confirmation before revoking and then notifies', async () => {
    mockRevoke.mockResolvedValue({ success: true });
    const el = await mount([invitation('ana')]);
    const revoked = vi.fn();
    el.addEventListener('invitation-revoked', revoked);

    buttonByText(rows(el)[0], 'Revocar').click();
    await el.updateComplete;
    expect(mockRevoke).not.toHaveBeenCalled();

    buttonByText(rows(el)[0], 'Sí, revocar').click();
    await flush();
    await el.updateComplete;

    expect(mockRevoke).toHaveBeenCalledWith('ana');
    expect(revoked.mock.calls[0][0].detail).toBe('ana');
  });

  it('shows the error when revoking fails', async () => {
    mockRevoke.mockResolvedValue({ success: false, error: 'Error al revocar la invitación' });
    const el = await mount([invitation('ana')]);
    buttonByText(rows(el)[0], 'Revocar').click();
    await el.updateComplete;
    buttonByText(rows(el)[0], 'Sí, revocar').click();
    await flush();
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('[role="alert"]').textContent).toContain('Error al revocar');
  });
});
