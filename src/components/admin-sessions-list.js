import { LitElement, html, css } from 'lit';
import {
  fetchAllSessions,
  createSession,
  updateSession,
  deleteSession,
  validateSession,
} from '../lib/firebase/sessions.js';
import { fetchAllUsers } from '../lib/firebase/users.js';
import { notifyUsers } from '../lib/firebase/user-notifications.js';
import { showBrowserNotification, getNotificationPermission } from '../lib/notification-utils.js';
import { waitForAuth } from '../lib/auth-ready.js';
import { materialIconsLink } from './shared/material-icons.js';

/**
 * @element admin-sessions-list
 * Admin panel for managing synchronous sessions.
 */
export class AdminSessionsList extends LitElement {
  static properties = {
    _sessions: { type: Array, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
    _showForm: { type: Boolean, state: true },
    _editingId: { type: String, state: true },
    _formData: { type: Object, state: true },
    _formError: { type: String, state: true },
    _saving: { type: Boolean, state: true },
    _notifyStudents: { type: Boolean, state: true },
  };

  static styles = css`
    :host { display: block; }

    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; font-size: 0.813rem; font-weight: 600; font-family: inherit; cursor: pointer; transition: background-color 0.15s; }
    .btn--primary { background: linear-gradient(to right, #84cc16, #fb923c); color: #0f172a; }
    .btn--primary:hover { background: #d11111; }
    .btn--secondary { background: #f1f5f9; color: #334155; }
    .btn--secondary:hover { background: #e2e8f0; }
    .btn--danger { background: #fef2f2; color: #991b1b; }
    .btn--danger:hover { background: #fee2e2; }
    .btn--small { padding: 0.375rem 0.75rem; font-size: 0.75rem; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .session-card { background: #fff; border-radius: 0.75rem; padding: 1.25rem; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); margin-bottom: 1rem; }
    .session-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .session-title { font-size: 1rem; font-weight: 700; color: #0f172a; }
    .session-meta { display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.813rem; color: #64748b; margin-bottom: 0.5rem; }
    .session-meta-item { display: flex; align-items: center; gap: 0.25rem; }
    .session-actions { display: flex; gap: 0.5rem; }
    .session-link { font-size: 0.813rem; color: #1d4ed8; word-break: break-all; }
    .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.688rem; font-weight: 600; }
    .badge--upcoming { background: #dbeafe; color: #1e40af; }
    .badge--past { background: #f1f5f9; color: #64748b; }

    .form-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .form-card { background: #fff; border-radius: 0.75rem; padding: 2rem; width: 100%; max-width: 560px; box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25); max-height: 90vh; overflow-y: auto; }
    .form-card h3 { margin: 0 0 1.5rem; font-size: 1.125rem; font-weight: 700; color: #0f172a; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.813rem; font-weight: 600; color: #334155; margin-bottom: 0.375rem; }
    .form-group input, .form-group select { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.375rem; font-size: 0.875rem; font-family: inherit; box-sizing: border-box; }
    .form-group input:focus { outline: none; border-color: #84cc16; box-shadow: 0 0 0 3px rgba(132,204,22,0.1); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-error { color: #991b1b; font-size: 0.813rem; margin-bottom: 1rem; }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; }
    .form-check { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; }
    .form-check input[type="checkbox"] { width: auto; margin: 0; accent-color: #84cc16; }
    .form-check label { font-size: 0.813rem; font-weight: 500; color: #334155; cursor: pointer; }

    .loading, .error-msg { text-align: center; padding: 3rem; color: #475569; }
    .error-msg { color: #991b1b; }
    .spinner { width: 1.5rem; height: 1.5rem; border: 3px solid #e2e8f0; border-top-color: #84cc16; border-radius: 50%; animation: spin 0.6s linear infinite; margin: 0 auto 0.75rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { text-align: center; padding: 3rem; color: #64748b; }
  `;

  constructor() {
    super();
    this._sessions = [];
    this._loading = true;
    this._error = '';
    this._showForm = false;
    this._editingId = null;
    this._formData = this._emptyForm();
    this._formError = '';
    this._saving = false;
    this._notifyStudents = false;
  }

  connectedCallback() {
    super.connectedCallback();
    waitForAuth().then(() => this._loadSessions());
  }

  _emptyForm() {
    return {
      title: '',
      date: '',
      time: '',
      duration: 60,
      zoomUrl: '',
      moduleId: '',
      cohortId: '',
      quizId: '',
    };
  }

  async _loadSessions() {
    this._loading = true;
    const result = await fetchAllSessions();
    this._loading = false;
    if (result.success) {
      this._sessions = result.sessions;
    } else {
      this._error = result.error;
    }
  }

  _openCreate() {
    this._editingId = null;
    this._formData = this._emptyForm();
    this._formError = '';
    this._showForm = true;
  }

  _openEdit(session) {
    this._editingId = session.id;
    this._formData = {
      title: session.title || '',
      date: session.date || '',
      time: session.time || '',
      duration: session.duration || 60,
      zoomUrl: session.zoomUrl || '',
      moduleId: session.moduleId || '',
      cohortId: session.cohortId || '',
      quizId: session.quizId || '',
    };
    this._formError = '';
    this._showForm = true;
  }

  _closeForm() {
    this._showForm = false;
    this._formError = '';
  }

  _handleInput(e) {
    const input = /** @type {HTMLInputElement} */ (e.target);
    const value = input.type === 'number' ? Number(input.value) : input.value;
    this._formData = { ...this._formData, [input.name]: value };
  }

  async _handleSubmit(e) {
    e.preventDefault();
    this._formError = '';
    const validation = validateSession(this._formData);
    if (!validation.valid) {
      this._formError = validation.error;
      return;
    }

    this._saving = true;
    let result;
    if (this._editingId) {
      result = await updateSession(this._editingId, this._formData);
    } else {
      result = await createSession(this._formData);
    }
    this._saving = false;

    if (result.success) {
      if (!this._editingId && this._notifyStudents) {
        this._sendSessionNotification(this._formData.title);
      }
      this._closeForm();
      await this._loadSessions();
    } else {
      this._formError = result.error;
    }
  }

  async _sendSessionNotification(sessionTitle) {
    const usersResult = await fetchAllUsers();
    if (!usersResult.success) return;
    const studentIds = usersResult.users
      .filter((u) => u.role === 'student')
      .map((u) => u.uid);
    if (studentIds.length === 0) return;
    await notifyUsers(studentIds, {
      type: 'new_session',
      message: `Nueva sesión programada: ${sessionTitle}`,
    });
  }

  async _handleDelete(id) {
    const result = await deleteSession(id);
    if (result.success) await this._loadSessions();
  }

  _isUpcoming(dateStr) {
    return new Date(dateStr) >= new Date(new Date().toISOString().split('T')[0]);
  }

  _formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  render() {
    if (this._loading) return html`<div class="loading"><div class="spinner"></div><p>Cargando sesiones...</p></div>`;
    if (this._error) return html`<div class="error-msg">${this._error}</div>`;

    return html`
      ${materialIconsLink}
      <div class="toolbar">
        <span>${this._sessions.length} sesión${this._sessions.length !== 1 ? 'es' : ''}</span>
        <button class="btn btn--primary" @click=${this._openCreate}>
          <span class="material-symbols-outlined">add</span> Nueva sesión
        </button>
      </div>

      ${this._sessions.length === 0
        ? html`<div class="empty-state"><p>No hay sesiones programadas</p></div>`
        : this._sessions.map((s) => this._renderSession(s))}

      ${this._showForm ? this._renderForm() : ''}
    `;
  }

  _renderSession(s) {
    const upcoming = this._isUpcoming(s.date);
    return html`
      <div class="session-card">
        <div class="session-header">
          <div>
            <span class="session-title">${s.title}</span>
            <span class="badge ${upcoming ? 'badge--upcoming' : 'badge--past'}">
              ${upcoming ? 'Próxima' : 'Pasada'}
            </span>
          </div>
          <div class="session-actions">
            <button class="btn btn--secondary btn--small" @click=${() => this._openEdit(s)}>Editar</button>
            <button class="btn btn--danger btn--small" @click=${() => this._handleDelete(s.id)}>Eliminar</button>
          </div>
        </div>
        <div class="session-meta">
          <span class="session-meta-item">${this._formatDate(s.date)}</span>
          <span class="session-meta-item">${s.time}h</span>
          <span class="session-meta-item">${s.duration} min</span>
          <span class="session-meta-item">Módulo: ${s.moduleId}</span>
          <span class="session-meta-item">Cohorte: ${s.cohortId}</span>
        </div>
        <a class="session-link" href="${s.zoomUrl}" target="_blank" rel="noopener noreferrer">${s.zoomUrl}</a>
      </div>
    `;
  }

  _renderForm() {
    const title = this._editingId ? 'Editar sesión' : 'Nueva sesión';
    return html`
      <div class="form-overlay" @click=${this._closeForm}>
        <div class="form-card" @click=${(e) => e.stopPropagation()}>
          <h3>${title}</h3>
          <form @submit=${this._handleSubmit}>
            <div class="form-group">
              <label for="session-title">Título</label>
              <input id="session-title" name="title" type="text" .value=${this._formData.title} @input=${this._handleInput} required />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="session-date">Fecha</label>
                <input id="session-date" name="date" type="date" .value=${this._formData.date} @input=${this._handleInput} required />
              </div>
              <div class="form-group">
                <label for="session-time">Hora</label>
                <input id="session-time" name="time" type="time" .value=${this._formData.time} @input=${this._handleInput} required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="session-duration">Duración (min)</label>
                <input id="session-duration" name="duration" type="number" min="1" .value=${this._formData.duration} @input=${this._handleInput} required />
              </div>
              <div class="form-group">
                <label for="session-module">ID del Módulo</label>
                <input id="session-module" name="moduleId" type="text" .value=${this._formData.moduleId} @input=${this._handleInput} required />
              </div>
            </div>
            <div class="form-group">
              <label for="session-zoom">URL de Zoom</label>
              <input id="session-zoom" name="zoomUrl" type="url" .value=${this._formData.zoomUrl} @input=${this._handleInput} required />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="session-cohort">ID de Cohorte</label>
                <input id="session-cohort" name="cohortId" type="text" .value=${this._formData.cohortId} @input=${this._handleInput} required />
              </div>
              <div class="form-group">
                <label for="session-quiz">ID de Quiz (opcional)</label>
                <input id="session-quiz" name="quizId" type="text" .value=${this._formData.quizId} @input=${this._handleInput} />
              </div>
            </div>

            ${!this._editingId ? html`
              <div class="form-check">
                <input type="checkbox" id="notify-students" .checked=${this._notifyStudents} @change=${(e) => { this._notifyStudents = e.target.checked; }} />
                <label for="notify-students">Notificar a los alumnos</label>
              </div>
            ` : ''}

            ${this._formError ? html`<div class="form-error">${this._formError}</div>` : ''}
            <div class="form-actions">
              <button type="button" class="btn btn--secondary" @click=${this._closeForm}>Cancelar</button>
              <button type="submit" class="btn btn--primary" ?disabled=${this._saving}>
                ${this._saving ? 'Guardando...' : (this._editingId ? 'Guardar' : 'Crear')}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
}

customElements.define('admin-sessions-list', AdminSessionsList);
