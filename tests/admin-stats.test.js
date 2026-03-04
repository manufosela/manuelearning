import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
}));

vi.mock('firebase/firestore', () => {
  const getDocs = vi.fn();
  return {
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn(),
    getDocs,
    query: vi.fn(),
    where: vi.fn(),
  };
});

import {
  countTotalUsers,
  countActiveUsersLast7Days,
  countQuizzesCompleted,
  getProgressByCohort,
  fetchAdminDashboardStats,
} from '../src/lib/firebase/admin-stats.js';

import { getDocs } from 'firebase/firestore';

/**
 * Helper to create a mock Firestore snapshot.
 * @param {Object[]} docsData - Array of { id, ...fields }
 */
function mockSnapshot(docsData) {
  return {
    size: docsData.length,
    docs: docsData.map((d) => ({
      id: d.id,
      data: () => {
        const { id: _id, ...rest } = d;
        return rest;
      },
    })),
  };
}

describe('countTotalUsers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return the number of users', async () => {
    getDocs.mockResolvedValueOnce(mockSnapshot([
      { id: 'u1', email: 'a@test.com' },
      { id: 'u2', email: 'b@test.com' },
      { id: 'u3', email: 'c@test.com' },
    ]));

    const count = await countTotalUsers();
    expect(count).toBe(3);
  });

  it('should return 0 when no users exist', async () => {
    getDocs.mockResolvedValueOnce(mockSnapshot([]));
    const count = await countTotalUsers();
    expect(count).toBe(0);
  });
});

describe('countActiveUsersLast7Days', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should count unique users active in last 7 days', async () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 2);
    const old = new Date();
    old.setDate(old.getDate() - 10);

    getDocs.mockResolvedValueOnce(mockSnapshot([
      { id: 'p1', userId: 'u1', completed: true, completedAt: { toDate: () => recent } },
      { id: 'p2', userId: 'u1', completed: true, completedAt: { toDate: () => recent } },
      { id: 'p3', userId: 'u2', completed: true, completedAt: { toDate: () => old } },
      { id: 'p4', userId: 'u3', completed: true, completedAt: { toDate: () => recent } },
    ]));

    const count = await countActiveUsersLast7Days();
    expect(count).toBe(2); // u1 and u3
  });

  it('should return 0 when no recent activity', async () => {
    const old = new Date();
    old.setDate(old.getDate() - 30);

    getDocs.mockResolvedValueOnce(mockSnapshot([
      { id: 'p1', userId: 'u1', completed: true, completedAt: { toDate: () => old } },
    ]));

    const count = await countActiveUsersLast7Days();
    expect(count).toBe(0);
  });

  it('should handle entries without completedAt timestamp', async () => {
    getDocs.mockResolvedValueOnce(mockSnapshot([
      { id: 'p1', userId: 'u1', completed: true },
    ]));

    const count = await countActiveUsersLast7Days();
    expect(count).toBe(0);
  });
});

describe('countQuizzesCompleted', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return total quiz responses', async () => {
    getDocs.mockResolvedValueOnce(mockSnapshot([
      { id: 'r1', userId: 'u1', quizId: 'q1' },
      { id: 'r2', userId: 'u2', quizId: 'q1' },
    ]));

    const count = await countQuizzesCompleted();
    expect(count).toBe(2);
  });
});

describe('getProgressByCohort', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should calculate average progress per cohort', async () => {
    // Order of getDocs calls: users, cohorts, progress, modules
    getDocs
      .mockResolvedValueOnce(mockSnapshot([
        { id: 'u1', cohortId: 'c1', email: 'a@test.com' },
        { id: 'u2', cohortId: 'c1', email: 'b@test.com' },
        { id: 'u3', cohortId: 'c2', email: 'c@test.com' },
      ]))
      .mockResolvedValueOnce(mockSnapshot([
        { id: 'c1', name: 'Cohorte Marzo' },
        { id: 'c2', name: 'Cohorte Abril' },
      ]))
      .mockResolvedValueOnce(mockSnapshot([
        { id: 'p1', userId: 'u1', completed: true },
        { id: 'p2', userId: 'u1', completed: true },
        { id: 'p3', userId: 'u2', completed: true },
        { id: 'p4', userId: 'u3', completed: true },
        { id: 'p5', userId: 'u3', completed: true },
        { id: 'p6', userId: 'u3', completed: true },
      ]))
      .mockResolvedValueOnce(mockSnapshot([
        { id: 'm1', lessonCount: 5 },
        { id: 'm2', lessonCount: 5 },
      ]));

    const result = await getProgressByCohort();
    expect(result).toHaveLength(2);

    const c1 = result.find((r) => r.cohortId === 'c1');
    expect(c1.cohortName).toBe('Cohorte Marzo');
    // u1: 2/10 = 20%, u2: 1/10 = 10%, avg = 15%
    expect(c1.avgProgress).toBe(15);

    const c2 = result.find((r) => r.cohortId === 'c2');
    expect(c2.cohortName).toBe('Cohorte Abril');
    // u3: 3/10 = 30%
    expect(c2.avgProgress).toBe(30);
  });

  it('should handle users without cohort', async () => {
    getDocs
      .mockResolvedValueOnce(mockSnapshot([
        { id: 'u1', email: 'a@test.com' }, // no cohortId
      ]))
      .mockResolvedValueOnce(mockSnapshot([]))
      .mockResolvedValueOnce(mockSnapshot([]))
      .mockResolvedValueOnce(mockSnapshot([]));

    const result = await getProgressByCohort();
    expect(result).toHaveLength(0);
  });

  it('should handle zero total lessons', async () => {
    getDocs
      .mockResolvedValueOnce(mockSnapshot([
        { id: 'u1', cohortId: 'c1', email: 'a@test.com' },
      ]))
      .mockResolvedValueOnce(mockSnapshot([
        { id: 'c1', name: 'Cohorte Marzo' },
      ]))
      .mockResolvedValueOnce(mockSnapshot([]))
      .mockResolvedValueOnce(mockSnapshot([]));

    const result = await getProgressByCohort();
    expect(result).toHaveLength(1);
    expect(result[0].avgProgress).toBe(0);
  });
});

describe('fetchAdminDashboardStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return all stats combined', async () => {
    // countTotalUsers
    getDocs.mockResolvedValueOnce(mockSnapshot([{ id: 'u1' }, { id: 'u2' }]));
    // countActiveUsersLast7Days
    getDocs.mockResolvedValueOnce(mockSnapshot([]));
    // countQuizzesCompleted
    getDocs.mockResolvedValueOnce(mockSnapshot([{ id: 'r1' }]));
    // getProgressByCohort: users
    getDocs.mockResolvedValueOnce(mockSnapshot([]));
    // getProgressByCohort: cohorts
    getDocs.mockResolvedValueOnce(mockSnapshot([]));
    // getProgressByCohort: progress
    getDocs.mockResolvedValueOnce(mockSnapshot([]));
    // getProgressByCohort: modules
    getDocs.mockResolvedValueOnce(mockSnapshot([]));
    // totalQuizzes
    getDocs.mockResolvedValueOnce(mockSnapshot([{ id: 'q1' }, { id: 'q2' }]));

    const result = await fetchAdminDashboardStats();
    expect(result.success).toBe(true);
    expect(result.stats.totalUsers).toBe(2);
    expect(result.stats.quizzesCompleted).toBe(1);
    expect(result.stats.totalQuizzes).toBe(2);
    expect(result.stats.approvalRate).toBe(50);
    expect(result.stats.progressByCohort).toEqual([]);
  });

  it('should handle errors gracefully', async () => {
    getDocs.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchAdminDashboardStats();
    expect(result.success).toBe(false);
    expect(result.error).toContain('estadísticas');
  });

  it('should return 0 approval rate when no quizzes exist', async () => {
    // countTotalUsers
    getDocs.mockResolvedValueOnce(mockSnapshot([]));
    // countActiveUsersLast7Days
    getDocs.mockResolvedValueOnce(mockSnapshot([]));
    // countQuizzesCompleted
    getDocs.mockResolvedValueOnce(mockSnapshot([]));
    // getProgressByCohort: users, cohorts, progress, modules
    getDocs.mockResolvedValueOnce(mockSnapshot([]));
    getDocs.mockResolvedValueOnce(mockSnapshot([]));
    getDocs.mockResolvedValueOnce(mockSnapshot([]));
    getDocs.mockResolvedValueOnce(mockSnapshot([]));
    // totalQuizzes
    getDocs.mockResolvedValueOnce(mockSnapshot([]));

    const result = await fetchAdminDashboardStats();
    expect(result.success).toBe(true);
    expect(result.stats.approvalRate).toBe(0);
  });
});
