import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));

const mockCreateInvitation = vi.fn();
vi.mock('../src/lib/firebase/invitations.js', () => ({
  createInvitation: (...args) => mockCreateInvitation(...args),
}));
vi.mock('../src/lib/firebase/auth.js', () => ({ getCurrentUser: vi.fn(() => ({ uid: 'admin1' })) }));

await import('../src/components/invitation-form.js');

const flush = () => new Promise((r) => setTimeout(r, 0));
const expiresAt = new Date('2026-12-11T10:00:00Z');

async function mount() {
  const el = document.createElement('invitation-form');
  el.cohorts = [{ id: 'c1', name: 'Karajan v4' }];
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

async function submit(el, email, cohortId = 'c1') {
  const root = el.shadowRoot;
  const input = root.querySelector('#invite-email');
  input.value = email;
  input.dispatchEvent(new Event('input'));
  const select = root.querySelector('#invite-cohort');
  select.value = cohortId;
  select.dispatchEvent(new Event('change'));
  root.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
  await flush();
  await el.updateComplete;
}

beforeEach(() => mockCreateInvitation.mockReset());
afterEach(() => { document.body.innerHTML = ''; });

describe('invitation-form', () => {
  it('lists the cohorts to invite into', async () => {
    const el = await mount();
    const options = [...el.shadowRoot.querySelectorAll('#invite-cohort option')].map((o) => o.textContent.trim());
    expect(options).toEqual(['Sin convocatoria', 'Karajan v4']);
  });

  it('rejects an invalid email without creating anything', async () => {
    const el = await mount();
    await submit(el, 'no-es-email');
    expect(mockCreateInvitation).not.toHaveBeenCalled();
    expect(el.shadowRoot.querySelector('[role="alert"]').textContent).toContain('email');
  });

  it('creates the invitation and shows the link and the email to copy', async () => {
    mockCreateInvitation.mockResolvedValue({
      success: true,
      invitation: { id: 'tok', email: 'ana@example.com', cohortId: 'c1', status: 'pending', expiresAt },
    });
    const el = await mount();
    const created = vi.fn();
    el.addEventListener('invitation-created', created);

    await submit(el, 'ana@example.com');

    expect(mockCreateInvitation).toHaveBeenCalledWith({ email: 'ana@example.com', cohortId: 'c1', createdBy: 'admin1' });
    const root = el.shadowRoot;
    expect(root.querySelector('#invite-link').value).toBe(`${window.location.origin}/invitacion?token=tok`);
    expect(root.querySelector('#invite-message').value).toContain('Karajan v4');
    expect(root.querySelectorAll('copy-button')).toHaveLength(2);
    expect(created).toHaveBeenCalledOnce();
    expect(created.mock.calls[0][0].detail.id).toBe('tok');
  });

  it('shows the error when the invitation cannot be created', async () => {
    mockCreateInvitation.mockResolvedValue({ success: false, error: 'Error al crear la invitación' });
    const el = await mount();
    await submit(el, 'ana@example.com');
    expect(el.shadowRoot.querySelector('[role="alert"]').textContent).toContain('Error al crear');
  });
});
