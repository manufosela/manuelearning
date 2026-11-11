import { LitElement, html, css } from 'lit';
import { createInvitation } from '../lib/firebase/invitations.js';
import { getCurrentUser } from '../lib/firebase/auth.js';
import { normalizeEmail, isValidEmail, invitationEmailFor } from '../lib/invitations.js';
import { SITE } from '../config/site.config.js';
import './copy-button.js';

/**
 * @element invitation-form
 * Admin form to invite someone by email into a cohort. Shows the invitation
 * link and a ready-to-send email, and fires `invitation-created`.
 */
export class InvitationForm extends LitElement {
  static properties = {
    cohorts: { type: Array },
    _email: { type: String, state: true },
    _cohortId: { type: String, state: true },
    _saving: { type: Boolean, state: true },
    _error: { type: String, state: true },
    _created: { type: Object, state: true },
  };

  static styles = css`
    :host { display: block; }
    form, .result { display: grid; gap: 0.75rem; padding: 1rem; border: 1px solid var(--color-border, #e2e8f0); border-radius: 0.75rem; background: var(--color-bg-white, #fff); }
    label { display: grid; gap: 0.25rem; font-size: 0.813rem; font-weight: 600; color: var(--color-text-secondary, #334155); }
    input, select, textarea { padding: 0.5rem 0.75rem; border: 1px solid var(--color-border, #e2e8f0); border-radius: 0.5rem; font: inherit; font-weight: 400; }
    textarea { min-height: 12rem; resize: vertical; }
    .actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .primary { padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; background: #84cc16; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
    .primary[disabled] { opacity: 0.6; cursor: wait; }
    .error { color: var(--color-error-text, #991b1b); font-size: 0.813rem; }
    :is(input, select, textarea, button):focus-visible { outline: 3px solid var(--color-primary, #84cc16); outline-offset: 2px; }
  `;

  constructor() {
    super();
    this.cohorts = [];
    this._reset();
  }

  _reset() {
    this._email = '';
    this._cohortId = '';
    this._saving = false;
    this._error = '';
    this._created = null;
  }

  /** @param {Event} e */
  async _submit(e) {
    e.preventDefault();
    const email = normalizeEmail(this._email);
    if (!isValidEmail(email)) {
      this._error = 'Escribe un email válido';
      return;
    }
    this._saving = true;
    this._error = '';
    const result = await createInvitation({ email, cohortId: this._cohortId, createdBy: getCurrentUser().uid });
    this._saving = false;
    if (!result.success) {
      this._error = result.error;
      return;
    }
    this._created = result.invitation;
    this.dispatchEvent(new CustomEvent('invitation-created', { detail: result.invitation, bubbles: true, composed: true }));
  }

  _renderResult() {
    const cohortName = this.cohorts.find((c) => c.id === this._created.cohortId)?.name ?? '';
    const email = invitationEmailFor(this._created, { origin: window.location.origin, siteName: SITE.name, cohortName });
    const message = `Asunto: ${email.subject}\n\n${email.body}`;
    return html`
      <div class="result">
        <p>Invitación creada para <strong>${this._created.email}</strong>. Envíale el enlace o este correo:</p>
        <label>Enlace de invitación <input id="invite-link" readonly .value=${email.link} /></label>
        <copy-button .text=${email.link} label="Copiar enlace"></copy-button>
        <label>Mensaje para el correo <textarea id="invite-message" readonly .value=${message}></textarea></label>
        <div class="actions">
          <copy-button .text=${message} label="Copiar mensaje"></copy-button>
          <button type="button" class="primary" @click=${this._reset}>Invitar a otra persona</button>
        </div>
      </div>
    `;
  }

  render() {
    if (this._created) return this._renderResult();
    return html`
      <form @submit=${this._submit} novalidate>
        <label>Email de la persona invitada
          <input id="invite-email" type="email" required autocomplete="off" .value=${this._email}
            @input=${(e) => { this._email = e.target.value; }} />
        </label>
        <label>Convocatoria
          <select id="invite-cohort" @change=${(e) => { this._cohortId = e.target.value; }}>
            <option value="">Sin convocatoria</option>
            ${this.cohorts.map((c) => html`<option value=${c.id} ?selected=${c.id === this._cohortId}>${c.name}</option>`)}
          </select>
        </label>
        ${this._error ? html`<p class="error" role="alert">${this._error}</p>` : ''}
        <div class="actions">
          <button class="primary" type="submit" ?disabled=${this._saving} aria-busy=${this._saving}>
            ${this._saving ? 'Creando…' : 'Crear invitación'}
          </button>
        </div>
      </form>
    `;
  }
}

customElements.define('invitation-form', InvitationForm);
