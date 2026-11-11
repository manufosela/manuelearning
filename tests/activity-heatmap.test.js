import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';

const originalTz = process.env.TZ;
process.env.TZ = 'Europe/Madrid';
afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

const mockGetUserProgress = vi.fn();
vi.mock('../src/lib/firebase/progress.js', () => ({
  getUserProgress: (...a) => mockGetUserProgress(...a),
}));

await import('../src/components/activity-heatmap.js');

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('activity-heatmap', () => {
  it('counts activity on the local calendar day, including today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-11T10:00:00+01:00'));
    mockGetUserProgress.mockResolvedValue({
      success: true,
      completedLessons: [
        { completedAt: new Date('2026-11-11T00:30:00+01:00') },
        { completedAt: new Date('2026-11-11T12:00:00+01:00') },
        { completedAt: new Date('2026-11-10T23:30:00+01:00') },
      ],
    });

    const el = document.createElement('activity-heatmap');
    await el._loadActivity.call(Object.assign(el, { userId: 'u1' }));
    const cells = el._buildCells();

    expect(cells.at(-1)).toMatchObject({ date: '2026-11-11', count: 2 });
    expect(cells.at(-2)).toMatchObject({ date: '2026-11-10', count: 1 });
    expect(el._totalActivities).toBe(3);
  });

  it('starts the grid on a Sunday 52 weeks back', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-11T10:00:00+01:00'));
    const el = document.createElement('activity-heatmap');
    const cells = el._buildCells();

    expect(cells[0].date).toBe('2025-11-09');
    expect(cells).toHaveLength(52 * 7 + 4);
  });
});
