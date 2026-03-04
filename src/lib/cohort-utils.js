/**
 * Pure utility functions for cohort management.
 * No Firebase dependency - safe for unit testing.
 */

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
 * @param {{ name?: string, code?: string, startDate?: string, expiryDate?: string }} data
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCohort(data) {
  if (!data.name || data.name.trim().length === 0) {
    return { valid: false, error: 'El nombre es obligatorio' };
  }

  if (!data.code || !/^\d{4}-\d{2}$/.test(data.code)) {
    return { valid: false, error: 'El código debe tener formato YYYY-MM' };
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
