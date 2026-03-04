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
