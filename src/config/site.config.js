/**
 * Central site configuration.
 * All project-specific branding, contact info, and metadata
 * should be defined here instead of hardcoded in templates.
 */
export const SITE = {
  name: 'ManuElearning',
  tagline: 'Plataforma de formación online de Mánu Fosela',
  /**
   * Public contact address, read from PUBLIC_CONTACT_EMAIL (.env, not tracked)
   * so no personal email lives in the public repository.
   */
  get contactEmail() {
    const email = import.meta.env.PUBLIC_CONTACT_EMAIL;
    if (!email) throw new Error('PUBLIC_CONTACT_EMAIL no está definido: añádelo a .env (ver .env.example)');
    return email;
  },
  copyrightYear: 2026,
  courseName: 'ManuElearning',
  certificateSubtitle: 'del programa de formación.',
};
