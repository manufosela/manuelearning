import { LitElement, html, css } from 'lit';
import { revokeInvitation } from '../lib/firebase/invitations.js';
import { invitationEmailFor } from '../lib/invitations.js';
import { SITE } from '../config/site.config.js';
import './copy-button.js';

const dateFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' });

/**
 * @element invitation-list
 * Pending invitations with copy link / copy email / revoke actions.
 * Fires `invitation-revoked` with the token.
 */
export class InvitationList extends LitElement {
  static properties = {
    invitations: { type: Array },
    cohortMap: { type: Object },
    _confirming: { type: String, state: true },
    _error: { type: String, state: true },
  };

  static styles = css`
    :host { display: block; }
    h3 { font-size: 0.938rem; margin: 0 0 0.75rem; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; }
    li { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border: 1px solid var(--color-border, #e2e8f0); border-radius: 0.5rem; background: var(--color-bg-white, #fff); }
    .meta { display: grid; gap: 0.125rem; font-size: 0.813rem; color: var(--color-text-secondary, #475569); }
    .email { font-weight: 600; color: var(--color-text-primary, #0f172a); }
    .expired { color: var(--color-error-text, #991b1b); font-weight: 600; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    button { padding: 0.375rem 0.75rem; border-radius: 0.375rem; font: inherit; font-size: 0.75rem; font-weight: 600; cursor: pointer; border: 1px solid var(--color-border, #e2e8f0); background: var(--color-bg-white, #fff); color: var(--color-error-text, #991b1b); }
    button.danger { background: var(--color-error-text, #991b1b); color: #fff; border-color: transparent; }
    button:focus-visible { outline: 3px solid var(--color-primary, #84cc16); outline-offset: 2px; }
    .error { color: var(--color-error-text, #991b1b); font-size: 0.813rem; }
    .empty { font-size: 0.813rem; color: var(--color-text-secondary, #475569); }
  `;

  constructor() {
    super();
    this.invitations = [];
    this.cohortMap = {};
    this._confirming = '';
    this._error = '';
  }

  /** @param {string} token */
  async _revoke(token) {
    const result = await revokeInvitation(token);
    this._confirming = '';
    this._error = result.success ? '' : result.error;
    if (result.success) {
      this.dispatchEvent(new CustomEvent('invitation-revoked', { detail: token, bubbles: true, composed: true }));
    }
  }

  /** @param {import('../lib/firebase/invitations.js').Invitation} invitation */
  _renderRow(invitation) {
    const cohortName = this.cohortMap[invitation.cohortId] ?? '';
    const email = invitationEmailFor(invitation, { origin: window.location.origin, siteName: SITE.name, cohortName });
    const expired = invitation.expiresAt.getTime() <= Date.now();
    const confirming = this._confirming === invitation.id;
    return html`
      <li>
        <div class="meta">
          <span class="email">${invitation.email}</span>
          <span>${cohortName || 'Sin convocatoria'}</span>
          ${expired
            ? html`<span class="expired">Caducada el ${dateFormatter.format(invitation.expiresAt)}</span>`
            : html`<span>Caduca el ${dateFormatter.format(invitation.expiresAt)}</span>`}
        </div>
        <div class="actions">
          <copy-button .text=${email.link} label="Copiar enlace"></copy-button>
          <copy-button .text=${`Asunto: ${email.subject}\n\n${email.body}`} label="Copiar mensaje"></copy-button>
          ${confirming
            ? html`
              <button class="danger" @click=${() => this._revoke(invitation.id)}>Sí, revocar</button>
              <button @click=${() => { this._confirming = ''; }}>No</button>`
            : html`<button @click=${() => { this._confirming = invitation.id; }}>Revocar</button>`}
        </div>
      </li>
    `;
  }

  render() {
    return html`
      <h3>Invitaciones enviadas (${this.invitations.length})</h3>
      ${this._error ? html`<p class="error" role="alert">${this._error}</p>` : ''}
      ${this.invitations.length === 0
        ? html`<p class="empty">No hay invitaciones pendientes.</p>`
        : html`<ul>${this.invitations.map((i) => this._renderRow(i))}</ul>`}
    `;
  }
}

customElements.define('invitation-list', InvitationList);
