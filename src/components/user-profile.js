import { LitElement, html, css } from 'lit';
import { fetchUser, updateUserDisplayName, updateWeeklyDigest } from '../lib/firebase/users.js';
import { getCurrentUser, onAuthChange } from '../lib/firebase/auth.js';
import { getUserBadges } from '../lib/firebase/badges.js';
import './activity-heatmap.js';

/**
 * @element user-profile
 * User profile page component. Shows user info and allows editing display name.
 */
export class UserProfile extends LitElement {
  static properties = {
    _user: { type: Object, state: true },
    _loading: { type: Boolean, state: true },
    _editing: { type: Boolean, state: true },
    _saving: { type: Boolean, state: true },
    _editName: { type: String, state: true },
    _message: { type: String, state: true },
    _messageType: { type: String, state: true },
    _badges: { type: Array, state: true },
    _savingDigest: { type: Boolean, state: true },
  };

  static styles = css`
    :host {
      display: block;
      max-width: 900px;
      margin: 0 auto;
    }

    .profile-card {
      background: #fff;
      border-radius: 0.75rem;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      overflow: hidden;
    }

    .profile-header {
      background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%);
      padding: 2rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .avatar {
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 1.75rem;
      font-weight: 700;
      border: 2px solid rgba(255, 255, 255, 0.4);
    }

    .profile-header__info {
      color: #fff;
    }

    .profile-header__name {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
    }

    .profile-header__email {
      font-size: 0.875rem;
      opacity: 0.85;
      margin: 0.25rem 0 0;
    }

    .profile-body {
      padding: 1.5rem 2rem;
    }

    .field {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .field:last-child {
      border-bottom: none;
    }

    .field__label {
      font-size: 0.813rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .field__value {
      font-size: 0.938rem;
      color: #0f172a;
      font-weight: 500;
    }

    .edit-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .edit-row input {
      padding: 0.375rem 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-family: inherit;
      min-width: 200px;
    }

    .edit-row input:focus {
      outline: none;
      border-color: #84cc16;
      box-shadow: 0 0 0 3px rgba(132, 204, 22, 0.1);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.375rem 0.75rem;
      border: none;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background-color 0.15s;
    }

    .btn--primary {
      background: #84cc16;
      color: #fff;
    }

    .btn--primary:hover { background: #d11111; }

    .btn--secondary {
      background: #f1f5f9;
      color: #334155;
    }

    .btn--secondary:hover { background: #e2e8f0; }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .message {
      padding: 0.625rem 1rem;
      border-radius: 0.375rem;
      font-size: 0.813rem;
      margin-top: 1rem;
    }

    .message--success {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }

    .message--error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .loading {
      text-align: center;
      padding: 3rem;
      color: #475569;
    }

    .spinner {
      width: 1.5rem;
      height: 1.5rem;
      border: 3px solid #e2e8f0;
      border-top-color: #84cc16;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin: 0 auto 0.75rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .role-badge {
      display: inline-flex;
      padding: 0.2rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .role-badge--admin {
      background: #fef2f2;
      color: #991b1b;
    }

    .role-badge--student {
      background: #f0fdf4;
      color: #166534;
    }

    .badges-section {
      background: #fff;
      border-radius: 0.75rem;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      padding: 1.5rem 2rem;
      margin-top: 1.5rem;
    }

    .badges-section__title {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .badges-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.75rem;
    }

    .badge-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      border: 1px solid #e2e8f0;
      background: #fafafa;
    }

    .badge-card__icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .badge-card__icon--module {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .badge-card__icon--course {
      background: #fef9c3;
      color: #a16207;
    }

    .badge-card__info {
      min-width: 0;
    }

    .badge-card__title {
      font-size: 0.813rem;
      font-weight: 600;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .badge-card__date {
      font-size: 0.75rem;
      color: #64748b;
    }

    .badges-empty {
      color: #64748b;
      font-size: 0.875rem;
      text-align: center;
      padding: 1rem 0;
    }

    .preferences-section {
      background: #fff;
      border-radius: 0.75rem;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      padding: 1.5rem 2rem;
      margin-top: 1.5rem;
    }

    .preferences-section__title {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .preference-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 0;
    }

    .preference-row__label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .preference-row__title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #0f172a;
    }

    .preference-row__desc {
      font-size: 0.75rem;
      color: #64748b;
    }

    .toggle {
      position: relative;
      width: 2.75rem;
      height: 1.5rem;
      flex-shrink: 0;
    }

    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle__slider {
      position: absolute;
      inset: 0;
      background: #cbd5e1;
      border-radius: 9999px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .toggle__slider::before {
      content: '';
      position: absolute;
      width: 1.125rem;
      height: 1.125rem;
      left: 0.1875rem;
      bottom: 0.1875rem;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s;
    }

    .toggle input:checked + .toggle__slider {
      background: #84cc16;
    }

    .toggle input:checked + .toggle__slider::before {
      transform: translateX(1.25rem);
    }

    .toggle input:disabled + .toggle__slider {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `;

  constructor() {
    super();
    this._user = null;
    this._loading = true;
    this._editing = false;
    this._saving = false;
    this._editName = '';
    this._message = '';
    this._messageType = '';
    this._badges = [];
    this._savingDigest = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this._unsubAuth = onAuthChange((authUser) => {
      if (authUser) {
        this._loadProfile(authUser.uid);
      } else {
        this._user = null;
        this._loading = false;
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubAuth) this._unsubAuth();
  }

  async _loadProfile(uid) {
    this._loading = true;
    const result = await fetchUser(uid);
    this._loading = false;

    if (result.success) {
      this._user = result.user;
      this._loadBadges(uid);
    }
  }

  async _loadBadges(uid) {
    const result = await getUserBadges(uid);
    if (result.success) {
      this._badges = result.badges;
    }
  }

  _startEdit() {
    this._editing = true;
    this._editName = this._user?.displayName || '';
    this._message = '';
  }

  _cancelEdit() {
    this._editing = false;
    this._message = '';
  }

  async _saveEdit() {
    this._saving = true;
    this._message = '';

    const result = await updateUserDisplayName(this._user.uid, this._editName);
    this._saving = false;

    if (result.success) {
      this._user = { ...this._user, displayName: this._editName.trim() };
      this._editing = false;
      this._message = 'Nombre actualizado correctamente';
      this._messageType = 'success';
    } else {
      this._message = result.error;
      this._messageType = 'error';
    }
  }

  async _toggleDigest(e) {
    const enabled = e.target.checked;
    this._savingDigest = true;

    const result = await updateWeeklyDigest(this._user.uid, enabled);
    this._savingDigest = false;

    if (result.success) {
      this._user = { ...this._user, weeklyDigest: enabled };
      this._message = enabled
        ? 'Resumen semanal activado'
        : 'Resumen semanal desactivado';
      this._messageType = 'success';
    } else {
      this._message = result.error;
      this._messageType = 'error';
    }
  }

  _getInitials() {
    const name = this._user?.displayName || this._user?.email || '?';
    return name.charAt(0).toUpperCase();
  }

  _formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  render() {
    if (this._loading) {
      return html`
        <div class="loading">
          <div class="spinner"></div>
          <p>Cargando perfil...</p>
        </div>
      `;
    }

    if (!this._user) {
      return html`<div class="loading"><p>No se pudo cargar el perfil</p></div>`;
    }

    return html`
      <div class="profile-card">
        <div class="profile-header">
          <div class="avatar">${this._getInitials()}</div>
          <div class="profile-header__info">
            <p class="profile-header__name">${this._user.displayName || 'Sin nombre'}</p>
            <p class="profile-header__email">${this._user.email}</p>
          </div>
        </div>

        <div class="profile-body">
          <div class="field">
            <span class="field__label">Nombre</span>
            ${this._editing
              ? html`
                <div class="edit-row">
                  <input
                    type="text"
                    .value=${this._editName}
                    @input=${(e) => { this._editName = e.target.value; }}
                  />
                  <button class="btn btn--primary" @click=${this._saveEdit} ?disabled=${this._saving}>
                    ${this._saving ? '...' : 'Guardar'}
                  </button>
                  <button class="btn btn--secondary" @click=${this._cancelEdit}>Cancelar</button>
                </div>`
              : html`
                <div class="edit-row">
                  <span class="field__value">${this._user.displayName || '-'}</span>
                  <button class="btn btn--secondary" @click=${this._startEdit}>Editar</button>
                </div>`
            }
          </div>

          <div class="field">
            <span class="field__label">Email</span>
            <span class="field__value">${this._user.email}</span>
          </div>

          <div class="field">
            <span class="field__label">Rol</span>
            <span class="role-badge role-badge--${this._user.role}">
              ${this._user.role === 'admin' ? 'Administrador' : 'Estudiante'}
            </span>
          </div>

          <div class="field">
            <span class="field__label">Convocatoria</span>
            <span class="field__value">${this._user.cohortId || '-'}</span>
          </div>

          <div class="field">
            <span class="field__label">Fecha de registro</span>
            <span class="field__value">${this._formatDate(this._user.createdAt)}</span>
          </div>

          ${this._message
            ? html`<div class="message message--${this._messageType}">${this._message}</div>`
            : ''}
        </div>
      </div>

      <div class="badges-section">
        <h3 class="badges-section__title">
          <span class="material-icons" style="font-size:1.25rem;color:#a16207;">emoji_events</span>
          Logros
        </h3>
        ${this._badges.length > 0
          ? html`
            <div class="badges-grid">
              ${this._badges.map((b) => html`
                <div class="badge-card">
                  <div class="badge-card__icon badge-card__icon--${b.type === 'course_complete' ? 'course' : 'module'}">
                    <span class="material-icons">${b.type === 'course_complete' ? 'school' : 'check_circle'}</span>
                  </div>
                  <div class="badge-card__info">
                    <div class="badge-card__title" title="${b.refTitle}">${b.refTitle}</div>
                    <div class="badge-card__date">${this._formatDate(b.awardedAt)}</div>
                  </div>
                </div>
              `)}
            </div>`
          : html`<p class="badges-empty">Aún no has conseguido ningún logro. ¡Completa módulos para desbloquearlos!</p>`
        }
      </div>

      <div class="preferences-section">
        <h3 class="preferences-section__title">
          <span class="material-icons" style="font-size:1.25rem;color:#64748b;">settings</span>
          Preferencias
        </h3>
        <div class="preference-row">
          <div class="preference-row__label">
            <span class="preference-row__title">Resumen semanal por email</span>
            <span class="preference-row__desc">Recibe cada lunes un resumen con tu progreso, racha y próxima lección recomendada</span>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              .checked=${!!this._user.weeklyDigest}
              ?disabled=${this._savingDigest}
              @change=${this._toggleDigest}
            />
            <span class="toggle__slider"></span>
          </label>
        </div>
      </div>

      <activity-heatmap
        .userId=${this._user.uid}
        style="margin-top: 1.5rem;"
      ></activity-heatmap>
    `;
  }
}

customElements.define('user-profile', UserProfile);
