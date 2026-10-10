import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));

const mockGetUserCertificate = vi.fn();
const mockSaveCertificate = vi.fn();

vi.mock('../src/lib/firebase/certificates.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getUserCertificate: (...a) => mockGetUserCertificate(...a),
    saveCertificate: (...a) => mockSaveCertificate(...a),
  };
});

await import('../src/components/certificate-download.js');

const flush = () => new Promise((r) => setTimeout(r, 0));

async function mount(props) {
  const el = document.createElement('certificate-download');
  Object.assign(el, { userId: 'u1', userName: 'Ana Pérez', progress: 100, courseSlug: 'karajan-v4', courseTitle: 'Karajan v4', ...props });
  el._downloadCertificate = vi.fn();
  document.body.appendChild(el);
  await flush();
  await el.updateComplete;
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('certificate-download per course', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserCertificate.mockResolvedValue({ success: true, certificate: null });
    mockSaveCertificate.mockResolvedValue({ success: true, id: 'cert-1' });
  });

  it('looks up the certificate of its own course', async () => {
    await mount();
    expect(mockGetUserCertificate).toHaveBeenCalledWith('u1', 'karajan-v4');
  });

  it('names the completed course, not the platform', async () => {
    const el = await mount();
    expect(el.shadowRoot.querySelector('.certificate-card p').textContent).toContain('Karajan v4');
  });

  it('issues the certificate for that course', async () => {
    const el = await mount();
    el.shadowRoot.querySelector('.btn--gold').click();
    await flush();
    expect(mockSaveCertificate).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ userName: 'Ana Pérez', courseSlug: 'karajan-v4', courseName: 'Karajan v4' })
    );
    expect(el._certificate.id).toBe('cert-1');
  });

  it('renders nothing until the course is complete', async () => {
    const el = await mount({ progress: 80 });
    expect(el.shadowRoot.querySelector('.certificate-card')).toBeNull();
  });
});
