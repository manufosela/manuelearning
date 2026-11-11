import { LitElement, html, css } from 'lit';
import { loginWithGoogle, logoutUser } from '../lib/firebase/auth.js';
import { fetchInvitation, acceptInvitation } from '../lib/firebase/invitations.js';
import { invitationProblem, INVITATION_PROBLEM_MESSAGES } from '../lib/invitations.js';

/**
 * @element invitation-accept
 * Accepts an invitation link: Google sign-in, validation and active sign-up.
 */
export class InvitationAccept extends LitElement {
  static properties = {
    token: { type: String },
    _busy: { type: Boolean, state: true },
    _error: { type: String, state: true },
    _existing: { type: Boolean, state: true },
  };

  static styles = css`
    :host { display: block; }
    .box { display: grid; gap: 1rem; text-align: center; }
    p { margin: 0; color: var(--color-text-secondary, #475569); }
    .error { padding: 0.75rem 1rem; border-radius: 0.5rem; background: var(--color-error-bg, #fef2f2); color: var(--color-error-text, #991b1b); }
    button, a.link { justify-self: center; padding: 0.75rem 1.5rem; border: none; border-radius: 0.5rem; background: #84cc16; color: #fff; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none; }
    button[disabled] { opacity: 0.6; cursor: wait; }
    :is(button, a):focus-visible { outline: 3px solid var(--color-primary, #84cc16); outline-offset: 2px; }
  `;

  constructor() {
    super();
    this.token = new URLSearchParams(window.location.search).get('token') ?? '';
    this._busy = false;
    this._error = '';
    this._existing = false;
  }

  /** @param {string} url */
  _navigate(url) {
    window.location.href = url;
  }

  async _accept() {
    this._busy = true;
    this._error = '';
    const login = await loginWithGoogle();
    if (!login.success) return this._fail(login.error);
    if (!login.isNewUser) {
      this._existing = true;
      this._busy = false;
      return;
    }

    const read = await fetchInvitation(this.token);
    if (!read.success) return this._fail(read.error);
    const problem = invitationProblem(read.invitation, login.user.email ?? '', new Date());
    if (problem) {
      await logoutUser();
      return this._fail(INVITATION_PROBLEM_MESSAGES[problem]);
    }

    const accepted = await acceptInvitation(login.user, read.invitation);
    if (!accepted.success) return this._fail(accepted.error);
    this._navigate('/dashboard');
  }

  /** @param {string} message */
  _fail(message) {
    this._error = message;
    this._busy = false;
  }

  render() {
    if (!this.token) {
      return html`<div class="box"><p class="error" role="alert">${INVITATION_PROBLEM_MESSAGES['not-found']}</p></div>`;
    }
    if (this._existing) {
      return html`
        <div class="box">
          <p>Ya tienes cuenta en la plataforma, no necesitas la invitación.</p>
          <a class="link" href="/dashboard">Ir a mi panel</a>
        </div>
      `;
    }
    return html`
      <div class="box">
        <p>Entra con la cuenta de Google del correo al que llegó la invitación.</p>
        ${this._error ? html`<p class="error" role="alert">${this._error}</p>` : ''}
        <button @click=${this._accept} ?disabled=${this._busy} aria-busy=${this._busy}>
          ${this._busy ? 'Comprobando…' : 'Aceptar con Google'}
        </button>
      </div>
    `;
  }
}

customElements.define('invitation-accept', InvitationAccept);
