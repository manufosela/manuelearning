import { describe, it, expect, vi } from 'vitest';

vi.mock('driver.js', () => ({ driver: vi.fn() }));

const { STUDENT_TOUR_ID, studentTourSteps } = await import('../src/lib/tours/student-tour.js');
const { resolveSteps } = await import('../src/lib/tour.js');

function fakeView(...classes) {
  const view = document.createElement('div');
  const root = view.attachShadow({ mode: 'open' });
  for (const name of classes) {
    const el = document.createElement('div');
    el.className = name;
    root.append(el);
  }
  return view;
}

describe('student tour', () => {
  it('has a stable id', () => {
    expect(STUDENT_TOUR_ID).toBe('student-dashboard');
  });

  it('opens with a welcome and gives every step a Spanish title and text', () => {
    const steps = studentTourSteps(fakeView());
    expect(steps[0].element).toBeUndefined();
    expect(steps[0].popover.title).toContain('Bienvenid');
    for (const step of steps) {
      expect(step.popover.title).toBeTruthy();
      expect(step.popover.description).toBeTruthy();
    }
  });

  it('points to the sections inside the dashboard view and skips the missing ones', () => {
    const view = fakeView('stats-grid', 'global-progress', 'course-section');
    const resolved = resolveSteps(studentTourSteps(view));
    const classes = resolved.filter((s) => s.element).map((s) => s.element.className);
    expect(classes).toEqual(['stats-grid', 'global-progress', 'course-section']);
  });

  it('ends on the help button when it is on the page', () => {
    const help = document.createElement('button');
    help.id = 'tour-help-btn';
    document.body.append(help);
    const resolved = resolveSteps(studentTourSteps(fakeView()));
    expect(resolved.at(-1).element).toBe(help);
    help.remove();
  });
});
