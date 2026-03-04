import { describe, it, expect } from 'vitest';
import { classifyStudent, computeRetentionStats } from '../src/lib/retention.js';

/* ── classifyStudent ──────────────────────────────────────── */
describe('classifyStudent', () => {
  it('should classify as green for <3 days inactive', () => {
    const now = new Date();
    const recent = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(classifyStudent(recent).status).toBe('green');
  });

  it('should classify as yellow for 3-7 days inactive', () => {
    const now = new Date();
    const fiveDaysAgo = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(classifyStudent(fiveDaysAgo).status).toBe('yellow');
  });

  it('should classify as red for >7 days inactive', () => {
    const now = new Date();
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(classifyStudent(tenDaysAgo).status).toBe('red');
  });

  it('should classify as red when no activity date', () => {
    expect(classifyStudent(null).status).toBe('red');
  });

  it('should return days since last activity', () => {
    const now = new Date();
    const fiveDaysAgo = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();
    const result = classifyStudent(fiveDaysAgo);
    expect(result.daysSinceActivity).toBeGreaterThanOrEqual(4);
    expect(result.daysSinceActivity).toBeLessThanOrEqual(6);
  });
});

/* ── computeRetentionStats ────────────────────────────────── */
describe('computeRetentionStats', () => {
  it('should compute stats from student list', () => {
    const now = new Date();
    const students = [
      { uid: 'u1', displayName: 'User1', lastActivity: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(), progress: 80 },
      { uid: 'u2', displayName: 'User2', lastActivity: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), progress: 40 },
      { uid: 'u3', displayName: 'User3', lastActivity: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(), progress: 10 },
    ];
    const stats = computeRetentionStats(students);
    expect(stats.total).toBe(3);
    expect(stats.green).toBe(1);
    expect(stats.yellow).toBe(1);
    expect(stats.red).toBe(1);
    expect(stats.students).toHaveLength(3);
    // Should be sorted by days since activity descending (most inactive first)
    expect(stats.students[0].uid).toBe('u3');
  });

  it('should handle empty list', () => {
    const stats = computeRetentionStats([]);
    expect(stats.total).toBe(0);
    expect(stats.students).toHaveLength(0);
  });

  it('should handle students with null lastActivity', () => {
    const students = [
      { uid: 'u1', displayName: 'User1', lastActivity: null, progress: 0 },
    ];
    const stats = computeRetentionStats(students);
    expect(stats.red).toBe(1);
    expect(stats.students[0].classification.status).toBe('red');
  });
});
