import { LitElement, html, css } from 'lit';
import { getSiteSettings, setRegistrationOpen } from '../lib/firebase/settings.js';
import { stateStyles } from '../lib/shared-styles.js';

/**
 * @element registration-toggle
 * Admin toggle to enable/disable registration.
 */
export class RegistrationToggle extends LitElement {
  static properties = {
    _isOpen: { type: Boolean, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
  };

  static styles = [stateStyles, css`
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
      background-color: #84cc16;
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

    .toggle-error {
      margin-top: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: #fef2f2;
      border-radius: 0.375rem;
      font-size: 0.813rem;
      color: #991b1b;
    }
  `];

  constructor() {
    super();
    this._isOpen = true;
    this._loading = true;
    this._error = '';
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadSettings();
  }

  async _loadSettings() {
    this._loading = true;
    this._error = '';
    const result = await getSiteSettings();
    this._loading = false;
    if (result.success) {
      this._isOpen = result.settings.registrationOpen;
    } else {
      this._error = result.error || 'Error al cargar la configuración';
    }
  }

  async _handleToggle() {
    this._error = '';
    const newValue = !this._isOpen;
    const result = await setRegistrationOpen(newValue);
    if (result.success) {
      this._isOpen = newValue;
    } else {
      this._error = result.error || 'Error al cambiar el estado del registro';
    }
  }

  render() {
    if (this._loading) {
      return html`
        <div class="state-loading">
          <div class="state-spinner"></div>
          <p>Cargando configuración...</p>
        </div>
      `;
    }

    if (this._error && !this._isOpen) {
      return html`
        <div class="state-error">
          <p>${this._error}</p>
          <button class="state-retry-btn" @click=${this._loadSettings}>
            <span class="material-symbols-outlined">refresh</span>
            Reintentar
          </button>
        </div>
      `;
    }

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
      ${this._error ? html`<div class="toggle-error">${this._error}</div>` : ''}
    `;
  }
}

customElements.define('registration-toggle', RegistrationToggle);
