import { LitElement, html, css } from 'lit';
import { onAuthChange } from '../lib/firebase/auth.js';

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
      color: #475569;
      font-size: 1.125rem;
    }

    .spinner {
      width: 2rem;
      height: 2rem;
      border: 3px solid #e2e8f0;
      border-top-color: #84cc16;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-right: 0.75rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  constructor() {
    super();
    this._checking = true;
    this._authenticated = false;
    this._unsubscribe = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribe = onAuthChange((user) => {
      this._checking = false;
      if (user) {
        this._authenticated = true;
      } else {
        window.location.href = '/login';
      }
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

    if (this._authenticated) {
      return html`<slot></slot>`;
    }

    return html``;
  }
}

customElements.define('auth-guard', AuthGuard);
