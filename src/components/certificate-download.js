import { LitElement, html, css } from 'lit';
import { getUserCertificate, saveCertificate, buildCertificateData } from '../lib/firebase/certificates.js';
import { SITE } from '../config/site.config.js';
import { stateStyles } from '../lib/shared-styles.js';

/**
 * @element certificate-download
 * Shows certificate download button when course is complete.
 */
export class CertificateDownload extends LitElement {
  static properties = {
    userId: { type: String },
    userName: { type: String },
    progress: { type: Number },
    _certificate: { type: Object, state: true },
    _generating: { type: Boolean, state: true },
    _error: { type: String, state: true },
  };

  static styles = [stateStyles, css`
    :host { display: block; }

    .certificate-card {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border-radius: 0.75rem;
      padding: 1.5rem;
      color: #fff;
      text-align: center;
    }

    .certificate-card h3 { font-size: 1.125rem; font-weight: 800; margin: 0 0 0.5rem; }
    .certificate-card p { font-size: 0.875rem; color: #94a3b8; margin: 0 0 1rem; }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition: background-color 0.15s;
    }

    .btn--gold { background: #f59e0b; color: #0f172a; }
    .btn--gold:hover { background: #d97706; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .issued-date { font-size: 0.75rem; color: #64748b; margin-top: 0.75rem; }

    .cert-error {
      margin-top: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: rgba(254, 202, 202, 0.3);
      border-radius: 0.375rem;
      font-size: 0.813rem;
      color: #fecaca;
    }
  `];

  constructor() {
    super();
    this.userId = '';
    this.userName = '';
    this.progress = 0;
    this._certificate = null;
    this._generating = false;
    this._error = '';
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.userId) this._checkCertificate();
  }

  async _checkCertificate() {
    const result = await getUserCertificate(this.userId);
    if (result.success && result.certificate) {
      this._certificate = result.certificate;
    }
  }

  async _generateCertificate() {
    this._generating = true;
    this._error = '';
    const data = buildCertificateData(this.userName, SITE.courseName);
    const result = await saveCertificate(this.userId, data);
    this._generating = false;

    if (result.success) {
      this._certificate = { ...data, id: result.id };
      this._downloadCertificate();
    } else {
      this._error = result.error || 'Error al generar el certificado. Inténtalo de nuevo.';
    }
  }

  _downloadCertificate() {
    const cert = this._certificate;
    if (!cert) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 850;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1200, 850);

    // Border
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, 1120, 770);

    // Inner border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(55, 55, 1090, 740);

    // Title
    ctx.fillStyle = '#f59e0b';
    ctx.font = '700 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICADO DE FINALIZACIÓN', 600, 150);

    // Course name
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px Lexend, Inter, sans-serif';
    ctx.fillText(SITE.courseName, 600, 260);

    // Certifies
    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 16px Inter, sans-serif';
    ctx.fillText('Certifica que', 600, 340);

    // Student name
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 32px Lexend, Inter, sans-serif';
    ctx.fillText(cert.userName || 'Estudiante', 600, 410);

    // Description
    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 16px Inter, sans-serif';
    ctx.fillText('ha completado satisfactoriamente todas las clases y evaluaciones', 600, 480);
    ctx.fillText(SITE.certificateSubtitle, 600, 510);

    // Date
    const date = cert.completedAt
      ? new Date(cert.completedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';
    ctx.fillStyle = '#f59e0b';
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillText(date, 600, 600);

    // Decorative line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(400, 640);
    ctx.lineTo(800, 640);
    ctx.stroke();

    // Footer
    ctx.fillStyle = '#475569';
    ctx.font = '400 12px Inter, sans-serif';
    ctx.fillText(`${SITE.name} — ${SITE.tagline}`, 600, 740);

    // Download
    const link = document.createElement('a');
    link.download = `certificado-${(cert.userName || 'estudiante').replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  render() {
    if (this.progress < 100) return html``;

    return html`
      <div class="certificate-card">
        <h3>Curso completado</h3>
        <p>Has completado el 100% del programa de ${SITE.courseName}</p>
        ${this._certificate
          ? html`
            <button class="btn btn--gold" @click=${this._downloadCertificate}>
              Descargar certificado
            </button>
            <div class="issued-date">
              Emitido: ${new Date(this._certificate.completedAt).toLocaleDateString('es-ES')}
            </div>
          `
          : html`
            <button class="btn btn--gold" ?disabled=${this._generating} @click=${this._generateCertificate}>
              ${this._generating ? 'Generando...' : 'Generar certificado'}
            </button>
            ${this._error ? html`<div class="cert-error">${this._error}</div>` : ''}
          `}
      </div>
    `;
  }
}

customElements.define('certificate-download', CertificateDownload);
