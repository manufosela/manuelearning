import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

// Guided tours on driver.js: Spanish texts and a per-browser, per-user "seen" flag.

export const TOUR_STORAGE_PREFIX = 'mel-tour';

const TOUR_OPTIONS = {
  showProgress: true,
  progressText: '{{current}} de {{total}}',
  nextBtnText: 'Siguiente',
  prevBtnText: 'Anterior',
  doneBtnText: 'Entendido',
  popoverClass: 'mel-tour',
};

/** @param {string} tourId @param {string} uid @returns {string} */
export function tourStorageKey(tourId, uid) {
  if (!tourId || !uid) throw new Error('tourId y uid son obligatorios');
  return `${TOUR_STORAGE_PREFIX}:${tourId}:${uid}`;
}

/**
 * Whether the user already finished or closed the tour in this browser. With storage
 * blocked it counts as seen, so it never autostarts every visit; the help button still runs it.
 */
export function hasSeenTour(tourId, uid, storage) {
  const key = tourStorageKey(tourId, uid);
  try {
    return (storage ?? globalThis.localStorage).getItem(key) === 'done';
  } catch (error) {
    console.warn('Tour: almacenamiento no disponible', error);
    return true;
  }
}

/** @param {string} tourId @param {string} uid @param {Storage} [storage] */
export function markTourSeen(tourId, uid, storage) {
  const key = tourStorageKey(tourId, uid);
  try {
    (storage ?? globalThis.localStorage).setItem(key, 'done');
  } catch (error) {
    console.warn('Tour: no se ha podido guardar que ya se vio', error);
  }
}

/**
 * Resolve each step's element now and drop the steps whose element is not on
 * the page. Steps without element are centred popovers and always stay.
 * @param {Array<{element?: string | Element | (() => Element | null), popover: object}>} steps
 * @returns {Array<{element?: Element, popover: object}>}
 */
export function resolveSteps(steps) {
  return steps.flatMap((step) => {
    if (step.element === undefined) return [step];
    const element = resolveElement(step.element);
    return element ? [{ ...step, element }] : [];
  });
}

function resolveElement(target) {
  if (typeof target === 'function') return target();
  if (typeof target === 'string') return document.querySelector(target);
  return target;
}

/** Run a tour now; null when none of its steps is on the page. */
export function startTour(steps, { onFinish } = {}) {
  const resolved = resolveSteps(steps);
  if (resolved.length === 0) return null;
  const tour = driver({ ...TOUR_OPTIONS, steps: resolved, onDestroyed: () => onFinish?.() });
  tour.drive();
  return tour;
}

/** Run the tour only if this user has not seen it, and remember it once finished or closed. */
export function autoStartTour(tourId, uid, steps, storage) {
  if (hasSeenTour(tourId, uid, storage)) return null;
  return startTour(steps, { onFinish: () => markTourSeen(tourId, uid, storage) });
}
