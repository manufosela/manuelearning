import { LitElement, html, css } from 'lit';
import { getSiteSettings } from '../lib/firebase/settings.js';

/**
 * @element registration-gate
 * Checks if registration is open and shows content or closed message.
 */
export class RegistrationGate extends LitElement {
  static properties = {
    _isOpen: { type: Boolean, state: true },
    _loading: { type: Boolean, state: true },
  };

  static styles = css`
    :host {
      display: block;
    }

    .closed-message {
      text-align: center;
      padding: 3rem 2rem;
      max-width: 480px;
      margin: 0 auto;
    }

    .closed-icon {
      font-size: 3rem;
      color: #94a3b8;
      margin-bottom: 1rem;
    }

    .closed-message h2 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.75rem;
    }

    .closed-message p {
      color: #475569;
      line-height: 1.7;
      margin-bottom: 1.5rem;
    }

    .closed-message a {
      color: #ec1313;
      font-weight: 600;
      text-decoration: none;
    }

    .closed-message a:hover {
      text-decoration: underline;
    }

    .loading {
      text-align: center;
      padding: 2rem;
      color: #475569;
    }

    .spinner {
      width: 1.5rem;
      height: 1.5rem;
      border: 3px solid #e2e8f0;
      border-top-color: #ec1313;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin: 0 auto 0.75rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  constructor() {
    super();
    this._isOpen = false;
    this._loading = true;
  }

  connectedCallback() {
    super.connectedCallback();
    this._checkRegistration();
  }

  async _checkRegistration() {
    const result = await getSiteSettings();
    this._loading = false;
    this._isOpen = result.success ? result.settings.registrationOpen : true;
  }

  render() {
    if (this._loading) {
      return html`
        <div class="loading">
          <div class="spinner"></div>
          <p>Verificando disponibilidad...</p>
        </div>
      `;
    }

    if (!this._isOpen) {
      return html`
        <div class="closed-message">
          <span class="material-symbols-outlined closed-icon">lock</span>
          <h2>Registro cerrado</h2>
          <p>
            El registro no está disponible en este momento.
            Por favor, vuelve más tarde o contacta al administrador
            para obtener un código de invitación.
          </p>
          <a href="/">Volver a la página principal</a>
        </div>
      `;
    }

    return html`<slot></slot>`;
  }
}

customElements.define('registration-gate', RegistrationGate);
