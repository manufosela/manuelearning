import { LitElement, html, css } from 'lit';
import { getSiteSettings, setRegistrationOpen } from '../lib/firebase/settings.js';

/**
 * @element registration-toggle
 * Admin toggle to enable/disable registration.
 */
export class RegistrationToggle extends LitElement {
  static properties = {
    _isOpen: { type: Boolean, state: true },
    _loading: { type: Boolean, state: true },
  };

  static styles = css`
    :host {
      display: block;
    }

    .toggle-card {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .toggle-info h3 {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 0.25rem;
    }

    .toggle-info p {
      font-size: 0.813rem;
      color: #475569;
    }

    .toggle-switch {
      position: relative;
      width: 3rem;
      height: 1.625rem;
      flex-shrink: 0;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      inset: 0;
      background-color: #cbd5e1;
      border-radius: 9999px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .toggle-slider::before {
      content: '';
      position: absolute;
      width: 1.25rem;
      height: 1.25rem;
      left: 0.188rem;
      bottom: 0.188rem;
      background-color: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }

    input:checked + .toggle-slider {
      background-color: #ec1313;
    }

    input:checked + .toggle-slider::before {
      transform: translateX(1.375rem);
    }

    .status {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
    }

    .status--open {
      background: #f0fdf4;
      color: #166534;
    }

    .status--closed {
      background: #fef2f2;
      color: #991b1b;
    }
  `;

  constructor() {
    super();
    this._isOpen = true;
    this._loading = true;
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadSettings();
  }

  async _loadSettings() {
    const result = await getSiteSettings();
    this._loading = false;
    if (result.success) {
      this._isOpen = result.settings.registrationOpen;
    }
  }

  async _handleToggle() {
    const newValue = !this._isOpen;
    const result = await setRegistrationOpen(newValue);
    if (result.success) {
      this._isOpen = newValue;
    }
  }

  render() {
    if (this._loading) return html`<p>Cargando...</p>`;

    return html`
      <div class="toggle-card">
        <div class="toggle-info">
          <h3>Registro de usuarios</h3>
          <p>Controla si los visitantes pueden registrarse</p>
          <span class="status ${this._isOpen ? 'status--open' : 'status--closed'}">
            ${this._isOpen ? 'Abierto' : 'Cerrado'}
          </span>
        </div>
        <label class="toggle-switch">
          <input
            type="checkbox"
            .checked=${this._isOpen}
            @change=${this._handleToggle}
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    `;
  }
}

customElements.define('registration-toggle', RegistrationToggle);
