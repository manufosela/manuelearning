import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseAstroPages } from './helpers/astro-source.js';

vi.mock('driver.js', () => ({ driver: vi.fn() }));
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));
vi.mock('../src/lib/firebase/auth.js', () => ({ onAuthChange: (cb) => { cb({ uid: 'admin1' }); return () => {}; } }));
vi.mock('../src/lib/firebase/users.js', () => ({ isAdmin: vi.fn(() => Promise.resolve(true)) }));

const { ADMIN_TOUR_ID, adminTourSteps } = await import('../src/lib/tours/admin-tour.js');
const { resolveSteps } = await import('../src/lib/tour.js');
await import('../src/components/admin-guard.js');

afterEach(() => { document.body.innerHTML = ''; });

describe('admin tour', () => {
  it('has a stable id and Spanish steps that start with a welcome', () => {
    const steps = adminTourSteps();
    expect(ADMIN_TOUR_ID).toBe('admin-panel');
    expect(steps[0].element).toBeUndefined();
    for (const step of steps) {
      expect(step.popover.title).toBeTruthy();
      expect(step.popover.description).toBeTruthy();
    }
  });

  it('points to the admin page sections that exist', () => {
    const page = parseAstroPages('src/layouts/AdminLayout.astro', 'src/pages/admin/index.astro');
    document.body.innerHTML = page.doc.body.innerHTML;
    const missing = adminTourSteps().filter((s) => typeof s.element === 'string' && !document.querySelector(s.element));
    expect(missing.map((s) => s.element)).toEqual([]);
    expect(resolveSteps(adminTourSteps()).at(-1).element.id).toBe('admin-tour-help-btn');
  });
});

describe('admin-guard', () => {
  it('announces admin-ready with the uid once the admin is authorised', async () => {
    const onReady = vi.fn();
    document.addEventListener('admin-ready', onReady);
    document.body.appendChild(document.createElement('admin-guard'));
    for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 0));
    document.removeEventListener('admin-ready', onReady);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady.mock.calls[0][0].detail).toEqual({ uid: 'admin1' });
  });
});
