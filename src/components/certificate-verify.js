import { LitElement, html, css } from 'lit';
import { getCertificateById } from '../lib/firebase/certificates.js';
import { SITE } from '../config/site.config.js';
import { stateStyles } from '../lib/shared-styles.js';

/**
 * @element certificate-verify
 * Public verification page for certificates. Reads `id` from URL params.
 */
export class CertificateVerify extends LitElement {
  static properties = {
    _certificate: { type: Object, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
  };

  static styles = [stateStyles, css`
    :host { display: block; }

    .verify-card {
      max-width: 600px;
      margin: 2rem auto;
      background: var(--color-bg-white, #fff);
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }

    .verify-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 1.5rem;
      text-align: center;
      color: #fff;
    }

    .verify-header h2 {
      font-size: 1.25rem;
      font-weight: 800;
      margin: 0 0 0.25rem;
    }

    .verify-header p {
      font-size: 0.813rem;
      color: #94a3b8;
      margin: 0;
    }

    .verify-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      font-weight: 700;
      font-size: 0.938rem;
    }

    .verify-status--valid {
      background: var(--color-success-bg, #f0fdf4);
      color: var(--color-success-text, #166534);
    }

    .verify-status--invalid {
      background: var(--color-error-bg, #fef2f2);
      color: var(--color-error-text, #991b1b);
    }

    .verify-status .material-symbols-outlined {
      font-size: 1.25rem;
    }

    .verify-details {
      padding: 1.5rem;
    }

    .verify-field {
      margin-bottom: 1rem;
    }

    .verify-field:last-child { margin-bottom: 0; }

    .verify-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-muted, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }

    .verify-value {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary, #0f172a);
    }

    .not-found {
      text-align: center;
      padding: 3rem 2rem;
      color: var(--color-text-muted, #64748b);
    }

    .not-found .material-symbols-outlined {
      font-size: 3rem;
      color: var(--color-border-light, #cbd5e1);
      display: block;
      margin-bottom: 0.75rem;
    }

    @media (max-width: 640px) {
      .verify-card { padding: 1.25rem; }
      .verify-details { gap: 0.75rem; }
    }

    /* Focus indicators */
    button:focus-visible,
    a:focus-visible,
    select:focus-visible,
    input:focus-visible,
    textarea:focus-visible {
      outline: 3px solid var(--color-primary, #84cc16);
      outline-offset: 2px;
    }
  `];

  constructor() {
    super();
    this._certificate = null;
    this._loading = true;
    this._error = '';
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadCertificate();
  }

  async _loadCertificate() {
    const params = new URLSearchParams(window.location.search);
    const certId = params.get('id');

    if (!certId) {
      this._loading = false;
      this._error = 'not-found';
      return;
    }

    const result = await getCertificateById(certId);
    this._loading = false;

    if (result.success && result.certificate) {
      this._certificate = result.certificate;
    } else {
      this._error = result.certificate === null ? 'not-found' : (result.error || 'error');
    }
  }

  render() {
    if (this._loading) {
      return html`
        <div class="state-loading">
          <div class="state-spinner"></div>
          <p>Verificando certificado...</p>
        </div>
      `;
    }

    if (this._error === 'not-found' || (!this._certificate && !this._error)) {
      return html`
        <div class="not-found">
          <span class="material-symbols-outlined">search_off</span>
          <p>No se encontró ningún certificado con este identificador.</p>
        </div>
      `;
    }

    if (this._error) {
      return html`
        <div class="state-error">
          <p>Error al verificar el certificado. Inténtalo de nuevo más tarde.</p>
        </div>
      `;
    }

    const cert = this._certificate;
    const date = cert.completedAt
      ? new Date(cert.completedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'N/A';

    return html`
      <div class="verify-card" aria-label="Verificar certificado">
        <div class="verify-header">
          <h2>${SITE.name}</h2>
          <p>Verificación de certificado</p>
        </div>
        <div class="verify-status verify-status--valid" role="status">
          <span class="material-symbols-outlined">verified</span>
          Certificado válido
        </div>
        <div class="verify-details">
          <div class="verify-field">
            <div class="verify-label">Estudiante</div>
            <div class="verify-value">${cert.userName}</div>
          </div>
          <div class="verify-field">
            <div class="verify-label">Curso</div>
            <div class="verify-value">${cert.courseName}</div>
          </div>
          <div class="verify-field">
            <div class="verify-label">Fecha de finalización</div>
            <div class="verify-value">${date}</div>
          </div>
          ${cert.averageGrade != null ? html`
            <div class="verify-field">
              <div class="verify-label">Nota media</div>
              <div class="verify-value">${Number(cert.averageGrade).toFixed(1)}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}

customElements.define('certificate-verify', CertificateVerify);
