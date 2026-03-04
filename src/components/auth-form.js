import { LitElement, html, css } from 'lit';
import { registerUser, loginUser } from '../lib/firebase/auth.js';

/**
 * @element auth-form
 * Reusable authentication form for login and registration.
 *
 * @property {string} mode - 'login' or 'register'
 */
export class AuthForm extends LitElement {
  static properties = {
    mode: { type: String },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
  };

  static styles = css`
    :host {
      display: block;
      max-width: 420px;
      margin: 0 auto;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #0f172a;
    }

    input {
      height: 3rem;
      padding: 0 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-family: 'Inter', sans-serif;
      transition: border-color 0.15s ease;
    }

    input:focus {
      outline: none;
      border-color: #ec1313;
      box-shadow: 0 0 0 3px rgba(236, 19, 19, 0.1);
    }

    .error-message {
      background-color: #fef2f2;
      color: #991b1b;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      border: 1px solid #fecaca;
    }

    .submit-btn {
      height: 3.25rem;
      background-color: #ec1313;
      color: #fff;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 700;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: filter 0.15s ease;
    }

    .submit-btn:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .switch-link {
      text-align: center;
      font-size: 0.875rem;
      color: #475569;
    }

    .switch-link a {
      color: #ec1313;
      text-decoration: none;
      font-weight: 600;
    }

    .switch-link a:hover {
      text-decoration: underline;
    }
  `;

  constructor() {
    super();
    this.mode = 'login';
    this._loading = false;
    this._error = '';
  }

  render() {
    const isRegister = this.mode === 'register';
    const title = isRegister ? 'Crear cuenta' : 'Iniciar sesión';
    const submitText = isRegister ? 'Registrarse' : 'Entrar';

    return html`
      <form class="auth-form" @submit=${this._handleSubmit}>
        ${isRegister
          ? html`
              <div class="form-group">
                <label for="invitationCode">Código de invitación</label>
                <input
                  type="text"
                  id="invitationCode"
                  name="invitationCode"
                  placeholder="Ej: ABC123"
                  required
                  autocomplete="off"
                />
              </div>
              <div class="form-group">
                <label for="displayName">Nombre completo</label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  placeholder="Tu nombre"
                  autocomplete="name"
                />
              </div>
            `
          : ''}

        <div class="form-group">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="tu@email.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label for="password">Contraseña</label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="${isRegister ? 'Mínimo 6 caracteres' : 'Tu contraseña'}"
            required
            minlength="6"
            autocomplete="${isRegister ? 'new-password' : 'current-password'}"
          />
        </div>

        ${this._error
          ? html`<div class="error-message">${this._error}</div>`
          : ''}

        <button type="submit" class="submit-btn" ?disabled=${this._loading}>
          ${this._loading ? 'Procesando...' : submitText}
        </button>

        <p class="switch-link">
          ${isRegister
            ? html`¿Ya tienes cuenta? <a href="/login">Inicia sesión</a>`
            : html`¿No tienes cuenta? <a href="/registro">Regístrate</a>`}
        </p>
      </form>
    `;
  }

  /** @param {Event} e */
  async _handleSubmit(e) {
    e.preventDefault();
    this._error = '';
    this._loading = true;

    const form = /** @type {HTMLFormElement} */ (e.target);
    const formData = new FormData(form);
    const email = /** @type {string} */ (formData.get('email'));
    const password = /** @type {string} */ (formData.get('password'));

    let result;

    if (this.mode === 'register') {
      const displayName = /** @type {string} */ (formData.get('displayName') || '');
      const invitationCode = /** @type {string} */ (formData.get('invitationCode') || '');
      result = await registerUser(email, password, displayName, invitationCode);
    } else {
      result = await loginUser(email, password);
    }

    this._loading = false;

    if (result.success) {
      window.location.href = '/dashboard';
    } else {
      this._error = result.error;
    }
  }
}

customElements.define('auth-form', AuthForm);
