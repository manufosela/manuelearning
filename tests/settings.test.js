import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
}));

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
}));

import {
  getSiteSettings,
  setRegistrationOpen,
} from '../src/lib/firebase/settings.js';

describe('getSiteSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return default settings when doc does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const result = await getSiteSettings();
    expect(result.success).toBe(true);
    expect(result.settings.registrationOpen).toBe(true);
  });

  it('should return stored settings', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ registrationOpen: false }),
    });

    const result = await getSiteSettings();
    expect(result.success).toBe(true);
    expect(result.settings.registrationOpen).toBe(false);
  });

  it('should handle Firestore errors', async () => {
    mockGetDoc.mockRejectedValue(new Error('Network'));

    const result = await getSiteSettings();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Error al cargar');
  });
});

describe('setRegistrationOpen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject non-boolean value', async () => {
    const result = await setRegistrationOpen('yes');
    expect(result.success).toBe(false);
    expect(result.error).toContain('true o false');
  });

  it('should update setting to true', async () => {
    mockSetDoc.mockResolvedValue();
    const result = await setRegistrationOpen(true);
    expect(result.success).toBe(true);
    expect(mockSetDoc).toHaveBeenCalled();
  });

  it('should update setting to false', async () => {
    mockSetDoc.mockResolvedValue();
    const result = await setRegistrationOpen(false);
    expect(result.success).toBe(true);
  });

  it('should handle Firestore errors', async () => {
    mockSetDoc.mockRejectedValue(new Error('Permission denied'));
    const result = await setRegistrationOpen(true);
    expect(result.success).toBe(false);
  });
});
