import { LitElement, html, css } from 'lit';
import { loginWithGoogle, completeRegistration, logoutUser } from '../lib/firebase/auth.js';

/**
 * @element auth-form
 * Authentication form using Google Sign-In.
 * New users are prompted for an invitation code after Google login.
 */
export class AuthForm extends LitElement {
  static properties = {
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
    _pendingUser: { type: Object, state: true },
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
      border-color: #84cc16;
      box-shadow: 0 0 0 3px rgba(132, 204, 22, 0.1);
    }

    .error-message {
      background-color: #fef2f2;
      color: #991b1b;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      border: 1px solid #fecaca;
    }

    .google-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      height: 3.25rem;
      background-color: #fff;
      color: #1f2937;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .google-btn:hover:not(:disabled) {
      background-color: #f8fafc;
      border-color: #cbd5e1;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .google-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .google-btn svg {
      width: 20px;
      height: 20px;
    }

    .submit-btn {
      height: 3.25rem;
      background: linear-gradient(to right, #84cc16, #fb923c);
      color: #0f172a;
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

    .cancel-link {
      text-align: center;
      font-size: 0.875rem;
      color: #475569;
    }

    .cancel-link a {
      color: #84cc16;
      text-decoration: none;
      font-weight: 600;
      cursor: pointer;
    }

    .cancel-link a:hover {
      text-decoration: underline;
    }

    .welcome-text {
      text-align: center;
      font-size: 0.938rem;
      color: #475569;
    }

    .welcome-text strong {
      color: #0f172a;
    }
  `;

  constructor() {
    super();
    this._loading = false;
    this._error = '';
    this._pendingUser = null;
  }

  render() {
    if (this._pendingUser) {
      return this._renderInvitationForm();
    }
    return this._renderGoogleLogin();
  }

  _renderGoogleLogin() {
    return html`
      <div class="auth-form">
        ${this._error
          ? html`<div class="error-message">${this._error}</div>`
          : ''}

        <button
          class="google-btn"
          @click=${this._handleGoogleLogin}
          ?disabled=${this._loading}
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          ${this._loading ? 'Conectando...' : 'Acceder con Google'}
        </button>
      </div>
    `;
  }

  _renderInvitationForm() {
    return html`
      <form class="auth-form" @submit=${this._handleInvitationSubmit}>
        <p class="welcome-text">
          Hola <strong>${this._pendingUser.displayName || this._pendingUser.email}</strong>,
          es tu primera vez. Introduce tu codigo de invitacion para completar el registro.
        </p>

        <div class="form-group">
          <label for="invitationCode">Codigo de invitacion</label>
          <input
            type="text"
            id="invitationCode"
            name="invitationCode"
            placeholder="Ej: ABC123"
            required
            autocomplete="off"
          />
        </div>

        ${this._error
          ? html`<div class="error-message">${this._error}</div>`
          : ''}

        <button type="submit" class="submit-btn" ?disabled=${this._loading}>
          ${this._loading ? 'Registrando...' : 'Completar registro'}
        </button>

        <p class="cancel-link">
          <a @click=${this._cancelRegistration}>Cancelar</a>
        </p>
      </form>
    `;
  }

  async _handleGoogleLogin() {
    this._error = '';
    this._loading = true;

    const result = await loginWithGoogle();
    this._loading = false;

    if (!result.success) {
      this._error = result.error;
      return;
    }

    if (result.isNewUser) {
      this._pendingUser = result.user;
    } else {
      window.location.href = '/dashboard';
    }
  }

  /** @param {Event} e */
  async _handleInvitationSubmit(e) {
    e.preventDefault();
    this._error = '';
    this._loading = true;

    const form = /** @type {HTMLFormElement} */ (e.target);
    const formData = new FormData(form);
    const invitationCode = /** @type {string} */ (formData.get('invitationCode') || '');

    const result = await completeRegistration(this._pendingUser, invitationCode);
    this._loading = false;

    if (result.success) {
      window.location.href = '/dashboard';
    } else {
      this._error = result.error;
    }
  }

  async _cancelRegistration() {
    await logoutUser();
    this._pendingUser = null;
    this._error = '';
  }
}

customElements.define('auth-form', AuthForm);
