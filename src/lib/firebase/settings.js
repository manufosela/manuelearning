import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config.js';

const SETTINGS_DOC = 'site';
const SETTINGS_COLLECTION = 'settings';

/**
 * @typedef {Object} SiteSettings
 * @property {boolean} registrationOpen - Whether registration is open
 */

/**
 * Get site settings from Firestore.
 * @returns {Promise<{success: boolean, settings?: SiteSettings, error?: string}>}
 */
export async function getSiteSettings() {
  try {
    const ref = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { success: true, settings: { registrationOpen: true } };
    }

    return { success: true, settings: snap.data() };
  } catch (err) {
    return { success: false, error: 'Error al cargar configuración' };
  }
}

/**
 * Update registration open/closed setting.
 * @param {boolean} isOpen
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function setRegistrationOpen(isOpen) {
  if (typeof isOpen !== 'boolean') {
    return { success: false, error: 'El valor debe ser true o false' };
  }

  try {
    const ref = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
    await setDoc(ref, { registrationOpen: isOpen }, { merge: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al actualizar configuración' };
  }
}

/**
 * @typedef {Object} RetentionConfig
 * @property {number} greenDays - Max days inactive to be "active" (default 3)
 * @property {number} yellowDays - Max days inactive to be "at risk" (default 7)
 * @property {number} weightRecency - Recency weight 0-100 (default 40)
 * @property {number} weightProgress - Progress weight 0-100 (default 30)
 * @property {number} weightVelocity - Velocity weight 0-100 (default 20)
 * @property {number} weightConsistency - Consistency weight 0-100 (default 10)
 * @property {number} decayFactor - Exponential decay factor for recency (default 0.15)
 * @property {number} targetLessonsPerWeek - Lessons/week for 100% velocity (default 2)
 * @property {number} churnLow - Min score for low risk (default 60)
 * @property {number} churnMedium - Min score for medium risk (default 40)
 * @property {number} churnHigh - Min score for high risk (default 20)
 */

const RETENTION_DOC = 'retention';

/** @type {RetentionConfig} */
export const DEFAULT_RETENTION_CONFIG = {
  greenDays: 3,
  yellowDays: 7,
  weightRecency: 40,
  weightProgress: 30,
  weightVelocity: 20,
  weightConsistency: 10,
  decayFactor: 0.15,
  targetLessonsPerWeek: 2,
  churnLow: 60,
  churnMedium: 40,
  churnHigh: 20,
};

/**
 * Get retention algorithm configuration.
 * @returns {Promise<{success: boolean, config?: RetentionConfig, error?: string}>}
 */
export async function getRetentionConfig() {
  try {
    const ref = doc(db, SETTINGS_COLLECTION, RETENTION_DOC);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { success: true, config: { ...DEFAULT_RETENTION_CONFIG } };
    }

    return { success: true, config: { ...DEFAULT_RETENTION_CONFIG, ...snap.data() } };
  } catch (err) {
    return { success: false, error: 'Error al cargar configuración de retención' };
  }
}

/**
 * Save retention algorithm configuration.
 * @param {RetentionConfig} config
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveRetentionConfig(config) {
  try {
    const ref = doc(db, SETTINGS_COLLECTION, RETENTION_DOC);
    await setDoc(ref, config, { merge: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al guardar configuración de retención' };
  }
}
