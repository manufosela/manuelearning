import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDrive = vi.fn();
const mockDriver = vi.fn(() => ({ drive: mockDrive }));
vi.mock('driver.js', () => ({ driver: (...a) => mockDriver(...a) }));

const {
  tourStorageKey,
  hasSeenTour,
  markTourSeen,
  resolveSteps,
  startTour,
  autoStartTour,
} = await import('../src/lib/tour.js');

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, String(v)),
  };
}

const blockedStorage = {
  getItem: () => { throw new Error('blocked'); },
  setItem: () => { throw new Error('blocked'); },
};

const step = (element) => ({ element, popover: { title: 'T', description: 'D' } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('tour storage', () => {
  it('keys the seen flag by tour and user', () => {
    expect(tourStorageKey('student', 'u1')).toBe('mel-tour:student:u1');
    expect(() => tourStorageKey('student', '')).toThrow();
  });

  it('remembers that a user saw a tour', () => {
    const storage = memoryStorage();
    expect(hasSeenTour('student', 'u1', storage)).toBe(false);
    markTourSeen('student', 'u1', storage);
    expect(hasSeenTour('student', 'u1', storage)).toBe(true);
    expect(hasSeenTour('student', 'u2', storage)).toBe(false);
  });

  it('treats blocked storage as seen and never throws', () => {
    expect(hasSeenTour('student', 'u1', blockedStorage)).toBe(true);
    expect(() => markTourSeen('student', 'u1', blockedStorage)).not.toThrow();
  });

  it('survives a browser where reading localStorage itself throws', () => {
    const spy = vi.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => { throw new Error('SecurityError'); });
    expect(hasSeenTour('student', 'u1')).toBe(true);
    expect(() => markTourSeen('student', 'u1')).not.toThrow();
    spy.mockRestore();
  });
});

describe('resolveSteps', () => {
  it('resolves functions and selectors and drops steps not on the page', () => {
    const el = document.createElement('div');
    el.id = 'present';
    document.body.append(el);
    const steps = resolveSteps([
      step(() => el), step(() => null), step('#present'), step('#missing'), { popover: { title: 'Intro' } },
    ]);
    expect(steps.map((s) => s.element)).toEqual([el, el, undefined]);
    el.remove();
  });
});

describe('startTour', () => {
  it('runs driver.js in Spanish and calls onFinish when it closes', () => {
    const onFinish = vi.fn();
    startTour([step(document.body)], { onFinish });

    const config = mockDriver.mock.calls[0][0];
    expect(config.nextBtnText).toBe('Siguiente');
    expect(config.doneBtnText).toBe('Entendido');
    expect(mockDrive).toHaveBeenCalled();
    config.onDestroyed();
    expect(onFinish).toHaveBeenCalled();
  });

  it('does nothing when no step is on the page', () => {
    expect(startTour([step(() => null)])).toBeNull();
    expect(mockDriver).not.toHaveBeenCalled();
  });
});

describe('autoStartTour', () => {
  it('runs once and marks the tour seen when it closes', () => {
    const storage = memoryStorage();
    autoStartTour('student', 'u1', [step(document.body)], storage);
    mockDriver.mock.calls[0][0].onDestroyed();

    expect(hasSeenTour('student', 'u1', storage)).toBe(true);
    expect(autoStartTour('student', 'u1', [step(document.body)], storage)).toBeNull();
    expect(mockDriver).toHaveBeenCalledTimes(1);
  });
});
