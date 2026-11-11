import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));

const expiresAt = new Date(Date.now() + 10 * 86_400_000);
vi.mock('../src/lib/firebase/users.js', () => ({
  fetchAllUsers: vi.fn(() => Promise.resolve({
    success: true,
    users: [{ uid: 'u1', email: 'pend@example.com', role: 'student', status: 'pending', cohortId: 'c1' }],
  })),
  updateUserRole: vi.fn(),
  updateUserStatus: vi.fn(),
}));
vi.mock('../src/lib/firebase/cohorts.js', () => ({
  fetchAllCohorts: vi.fn(() => Promise.resolve({ success: true, cohorts: [{ id: 'c1', name: 'Karajan v4' }] })),
}));
vi.mock('../src/lib/firebase/invitations.js', () => ({
  fetchPendingInvitations: vi.fn(() => Promise.resolve({
    success: true,
    invitations: [
      { id: 't1', email: 'ana@example.com', cohortId: 'c1', status: 'pending', expiresAt },
      { id: 't2', email: 'luis@example.com', cohortId: '', status: 'pending', expiresAt },
    ],
  })),
  createInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
}));
vi.mock('../src/lib/firebase/auth.js', () => ({ getCurrentUser: vi.fn(() => ({ uid: 'admin1' })) }));
vi.mock('../src/lib/auth-ready.js', () => ({ waitForAuth: vi.fn(() => Promise.resolve({ uid: 'admin1' })) }));

await import('../src/components/admin-users-list.js');

const flush = () => new Promise((r) => setTimeout(r, 0));

async function mount() {
  const el = document.createElement('admin-users-list');
  document.body.appendChild(el);
  await flush();
  await el.updateComplete;
  return el;
}

const tab = (el, label) => [...el.shadowRoot.querySelectorAll('.tab')].find((t) => t.textContent.includes(label));

afterEach(() => { document.body.innerHTML = ''; });

describe('admin-users-list invitations', () => {
  it('counts pending invitations in the Pendientes tab', async () => {
    const el = await mount();
    expect(tab(el, 'Pendientes').querySelector('.tab-count').textContent).toBe('3');
  });

  it('shows the invitation list in the Pendientes tab only', async () => {
    const el = await mount();
    expect(el.shadowRoot.querySelector('invitation-list')).toBeNull();
    tab(el, 'Pendientes').click();
    await el.updateComplete;
    const list = el.shadowRoot.querySelector('invitation-list');
    expect(list.invitations.map((i) => i.id)).toEqual(['t1', 't2']);
    expect(list.cohortMap).toEqual({ c1: 'Karajan v4' });
  });

  it('opens the invitation form with the cohorts from the Invitar button', async () => {
    const el = await mount();
    const invite = [...el.shadowRoot.querySelectorAll('button')].find((b) => b.textContent.includes('Invitar'));
    invite.click();
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('invitation-form').cohorts).toEqual([{ id: 'c1', name: 'Karajan v4' }]);
  });

  it('adds created invitations and drops revoked ones', async () => {
    const el = await mount();
    tab(el, 'Pendientes').click();
    [...el.shadowRoot.querySelectorAll('button')].find((b) => b.textContent.includes('Invitar')).click();
    await el.updateComplete;
    const list = el.shadowRoot.querySelector('invitation-list');

    el.shadowRoot.querySelector('invitation-form').dispatchEvent(new CustomEvent('invitation-created', {
      detail: { id: 't3', email: 'eva@example.com', cohortId: 'c1', status: 'pending', expiresAt },
    }));
    await el.updateComplete;
    expect(list.invitations.map((i) => i.id)).toEqual(['t3', 't1', 't2']);

    list.dispatchEvent(new CustomEvent('invitation-revoked', { detail: 't1', bubbles: true, composed: true }));
    await el.updateComplete;
    expect(list.invitations.map((i) => i.id)).toEqual(['t3', 't2']);
  });
});
