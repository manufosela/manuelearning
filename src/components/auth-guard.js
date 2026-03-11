import { LitElement, html, css } from 'lit';
import { onAuthChange, logoutUser } from '../lib/firebase/auth.js';
import { fetchUser } from '../lib/firebase/users.js';
import { materialIconsLink } from './shared/material-icons.js';

/**
 * @element auth-guard
 * Protects content behind authentication.
 * Redirects to /login if user is not authenticated.
 * Shows a loading spinner while checking auth state.
 */
export class AuthGuard extends LitElement {
  static properties = {
    _checking: { type: Boolean, state: true },
    _authenticated: { type: Boolean, state: true },
    _userStatus: { type: String, state: true },
  };

  static styles = css`
    :host {
      display: block;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      color: var(--color-text-secondary, #475569);
      font-size: 1.125rem;
    }

    .spinner {
      width: 2rem;
      height: 2rem;
      border: 3px solid var(--color-border, #e2e8f0);
      border-top-color: #84cc16;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-right: 0.75rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .pending {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      text-align: center;
      padding: 2rem;
    }

    .pending-card {
      background: var(--color-bg-white, #fff);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 1rem;
      padding: 2.5rem 2rem;
      max-width: 480px;
      width: 100%;
    }

    .pending-icon {
      font-family: 'Material Symbols Outlined';
      font-size: 3rem;
      color: #84cc16;
      margin-bottom: 1rem;
    }

    .pending-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text-primary, #0f172a);
      margin: 0 0 0.75rem;
    }

    .pending-text {
      font-size: 0.95rem;
      color: var(--color-text-secondary, #475569);
      margin: 0 0 1.5rem;
      line-height: 1.6;
    }

    .pending-link {
      display: inline-block;
      color: #84cc16;
      text-decoration: none;
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }

    .pending-link:hover {
      text-decoration: underline;
    }

    .pending-logout {
      display: block;
      width: 100%;
      margin-top: 0.75rem;
      padding: 0.5rem 1rem;
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 0.5rem;
      background: transparent;
      color: var(--color-text-secondary, #475569);
      font-size: 0.9rem;
      cursor: pointer;
    }

    .pending-logout:hover {
      background: var(--color-border, #e2e8f0);
    }
  `;

  constructor() {
    super();
    this._checking = true;
    this._authenticated = false;
    this._userStatus = '';
    this._unsubscribe = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribe = onAuthChange(async (user) => {
      if (user) {
        const result = await fetchUser(user.uid);
        const status = result.success ? result.user?.status : undefined;
        this._userStatus = status === 'pending' ? 'pending' : 'active';
        this._authenticated = true;
      } else {
        window.location.href = '/login';
      }
      this._checking = false;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubscribe) {
      this._unsubscribe();
    }
  }

  render() {
    if (this._checking) {
      return html`
        <div class="loading">
          <div class="spinner"></div>
          <span>Verificando acceso...</span>
        </div>
      `;
    }

    if (this._authenticated && this._userStatus === 'pending') {
      return html`
        ${materialIconsLink}
        <div class="pending">
          <div class="pending-card">
            <span class="pending-icon">hourglass_top</span>
            <h2 class="pending-title">Cuenta pendiente de validación</h2>
            <p class="pending-text">Tu cuenta está siendo revisada. Recibirás un email cuando sea aprobada por el administrador.</p>
            <a href="/" class="pending-link">Volver a la página principal</a>
            <button class="pending-logout" @click=${() => logoutUser()}>Cerrar sesión</button>
          </div>
        </div>
      `;
    }

    if (this._authenticated) {
      return html`<slot></slot>`;
    }

    return html``;
  }
}

customElements.define('auth-guard', AuthGuard);
