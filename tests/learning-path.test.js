import { describe, it, expect } from 'vitest';
import {
  getNextLesson,
  getPrevLesson,
  buildLearningPath,
} from '../src/lib/learning-path.js';

const modules = [
  { id: 'm1', title: 'Mod 1', order: 1 },
  { id: 'm2', title: 'Mod 2', order: 2 },
];

const lessonsByModule = {
  m1: [
    { id: 'l1', title: 'L1', order: 1 },
    { id: 'l2', title: 'L2', order: 2 },
  ],
  m2: [
    { id: 'l3', title: 'L3', order: 1 },
    { id: 'l4', title: 'L4', order: 2 },
  ],
};

describe('getNextLesson', () => {
  it('should return next lesson in same module', () => {
    const next = getNextLesson(modules, lessonsByModule, 'm1', 'l1');
    expect(next).toEqual({ moduleId: 'm1', lessonId: 'l2' });
  });

  it('should return first lesson of next module when at end of module', () => {
    const next = getNextLesson(modules, lessonsByModule, 'm1', 'l2');
    expect(next).toEqual({ moduleId: 'm2', lessonId: 'l3' });
  });

  it('should return null at end of last module', () => {
    const next = getNextLesson(modules, lessonsByModule, 'm2', 'l4');
    expect(next).toBeNull();
  });

  it('should return null for unknown module', () => {
    const next = getNextLesson(modules, lessonsByModule, 'unknown', 'l1');
    expect(next).toBeNull();
  });

  it('should return null for unknown lesson', () => {
    const next = getNextLesson(modules, lessonsByModule, 'm1', 'unknown');
    expect(next).toBeNull();
  });
});

describe('getPrevLesson', () => {
  it('should return previous lesson in same module', () => {
    const prev = getPrevLesson(modules, lessonsByModule, 'm1', 'l2');
    expect(prev).toEqual({ moduleId: 'm1', lessonId: 'l1' });
  });

  it('should return last lesson of previous module when at start of module', () => {
    const prev = getPrevLesson(modules, lessonsByModule, 'm2', 'l3');
    expect(prev).toEqual({ moduleId: 'm1', lessonId: 'l2' });
  });

  it('should return null at start of first module', () => {
    const prev = getPrevLesson(modules, lessonsByModule, 'm1', 'l1');
    expect(prev).toBeNull();
  });

  it('should return null for unknown module', () => {
    const prev = getPrevLesson(modules, lessonsByModule, 'unknown', 'l1');
    expect(prev).toBeNull();
  });
});

describe('buildLearningPath', () => {
  it('should flatten modules and lessons into sequential path', () => {
    const path = buildLearningPath(modules, lessonsByModule);
    expect(path).toHaveLength(4);
    expect(path[0]).toEqual({ moduleId: 'm1', moduleTitle: 'Mod 1', lessonId: 'l1', lessonTitle: 'L1', index: 0 });
    expect(path[3]).toEqual({ moduleId: 'm2', moduleTitle: 'Mod 2', lessonId: 'l4', lessonTitle: 'L4', index: 3 });
  });

  it('should handle empty modules', () => {
    const path = buildLearningPath([], {});
    expect(path).toHaveLength(0);
  });

  it('should handle module with no lessons', () => {
    const path = buildLearningPath([{ id: 'm1', title: 'Mod 1', order: 1 }], { m1: [] });
    expect(path).toHaveLength(0);
  });
});
