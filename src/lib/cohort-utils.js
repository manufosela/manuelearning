/**
 * Pure utility functions for cohort management.
 * No Firebase dependency - safe for unit testing.
 */

/**
 * Generate an immutable slug from a cohort name.
 * @param {string} name
 * @returns {string}
 */
export function generateCohortSlug(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Format a Date as YYYY-MM-DD in the local time zone.
 * Cohort dates are stored as plain calendar dates, so comparisons must not
 * go through UTC (toISOString shifts the day near midnight).
 * @param {Date} date
 * @returns {string}
 */
export function toLocalIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a cohort has expired based on its expiryDate.
 * A cohort is still valid on its expiry day; it expires the day after.
 * @param {{ expiryDate?: string }} cohort
 * @returns {boolean}
 */
export function isCohortExpired(cohort) {
  if (!cohort || !cohort.expiryDate) return false;
  const expiry = String(cohort.expiryDate).slice(0, 10);
  return expiry < toLocalIsoDate(new Date());
}

/**
 * Get the display status of a cohort: 'active', 'expired', or 'inactive'.
 * @param {{ active: boolean, expiryDate?: string }} cohort
 * @returns {'active' | 'expired' | 'inactive'}
 */
export function getCohortStatus(cohort) {
  if (!cohort.active) return 'inactive';
  if (isCohortExpired(cohort)) return 'expired';
  return 'active';
}

/**
 * Validate cohort data before creating/updating.
 * @param {{ name?: string, startDate?: string, expiryDate?: string }} data
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCohort(data) {
  if (!data.name || data.name.trim().length === 0) {
    return { valid: false, error: 'El nombre es obligatorio' };
  }

  if (!data.startDate) {
    return { valid: false, error: 'La fecha de inicio es obligatoria' };
  }

  if (!data.expiryDate) {
    return { valid: false, error: 'La fecha de caducidad es obligatoria' };
  }

  if (new Date(data.expiryDate) <= new Date(data.startDate)) {
    return { valid: false, error: 'La fecha de caducidad debe ser posterior a la de inicio' };
  }

  return { valid: true };
}
