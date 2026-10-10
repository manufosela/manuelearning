import { describe, it, expect } from 'vitest';
import { modulesOfSameCourse, getNextLesson } from '../src/lib/learning-path.js';

const modules = [
  { id: 'd1', course: 'docker', order: 0 },
  { id: 'k1', course: 'karajan-v4', order: 0 },
  { id: 'd2', course: 'docker', order: 1 },
  { id: 'k2', course: 'karajan-v4', order: 1 },
];

describe('modulesOfSameCourse', () => {
  it('keeps only the modules of the current module course, in order', () => {
    expect(modulesOfSameCourse(modules, 'k1').map((m) => m.id)).toEqual(['k1', 'k2']);
  });

  it('returns an empty list when the module is unknown', () => {
    expect(modulesOfSameCourse(modules, 'zz')).toEqual([]);
  });

  it('groups modules without course together (legacy data)', () => {
    const legacy = [{ id: 'a' }, { id: 'b', course: 'docker' }, { id: 'c' }];
    expect(modulesOfSameCourse(legacy, 'a').map((m) => m.id)).toEqual(['a', 'c']);
  });

  it('stops "next" at the end of the course instead of jumping to another course', () => {
    const lessonsByModule = { d1: [{ id: 'l1' }], k1: [{ id: 'l2' }], d2: [{ id: 'l3' }], k2: [{ id: 'l4' }] };
    const sameCourse = modulesOfSameCourse(modules, 'd2');
    expect(getNextLesson(sameCourse, lessonsByModule, 'd2', 'l3')).toBeNull();
    expect(getNextLesson(sameCourse, lessonsByModule, 'd1', 'l1')).toEqual({ moduleId: 'd2', lessonId: 'l3' });
  });
});
