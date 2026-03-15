import { LitElement, html, css } from 'lit';
import { onAuthChange } from '../lib/firebase/auth.js';
import { isAdmin } from '../lib/firebase/users.js';

/**
 * @element admin-guard
 * Protects content behind admin role authentication.
 * Redirects to /dashboard if user is not admin, or /login if not authenticated.
 */
export class AdminGuard extends LitElement {
  static properties = {
    _checking: { type: Boolean, state: true },
    _authorized: { type: Boolean, state: true },
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
  `;

  constructor() {
    super();
    this._checking = true;
    this._authorized = false;
    this._unsubscribe = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribe = onAuthChange(async (user) => {
      if (!user) {
        window.location.href = '/login';
        return;
      }

      const adminCheck = await isAdmin(user.uid);
      this._checking = false;

      if (adminCheck) {
        this._authorized = true;
      } else {
        window.location.href = '/dashboard';
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
          <span>Verificando permisos...</span>
        </div>
      `;
    }

    if (this._authorized) {
      return html`<slot></slot>`;
    }

    return html``;
  }
}

customElements.define('admin-guard', AdminGuard);
