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
 * Check if a cohort has expired based on its expiryDate.
 * @param {{ expiryDate?: string }} cohort
 * @returns {boolean}
 */
export function isCohortExpired(cohort) {
  if (!cohort || !cohort.expiryDate) return false;
  const expiry = new Date(cohort.expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiry < today;
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
