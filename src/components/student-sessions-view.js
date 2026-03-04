import { LitElement, html, css } from 'lit';
import { fetchSessionsByCohort } from '../lib/firebase/sessions.js';
import { waitForAuth } from '../lib/auth-ready.js';

/**
 * @element student-sessions-view
 * Student view for upcoming synchronous sessions.
 */
export class StudentSessionsView extends LitElement {
  static properties = {
    cohortId: { type: String },
    _sessions: { type: Array, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
  };

  static styles = css`
    :host { display: block; }

    h2 { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 1.5rem; }

    .session-card {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
      margin-bottom: 1rem;
      border-left: 4px solid #ec1313;
    }

    .session-card--past {
      border-left-color: #cbd5e1;
      opacity: 0.7;
    }

    .session-title { font-size: 1rem; font-weight: 700; color: #0f172a; margin-bottom: 0.375rem; }

    .session-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.813rem;
      color: #64748b;
      margin-bottom: 0.75rem;
    }

    .session-meta-item { display: flex; align-items: center; gap: 0.25rem; }

    .badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.688rem;
      font-weight: 600;
      margin-left: 0.5rem;
    }

    .badge--upcoming { background: #dbeafe; color: #1e40af; }
    .badge--past { background: #f1f5f9; color: #64748b; }

    .session-actions { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }

    .btn-zoom {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      background: #1d4ed8;
      color: #fff;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.813rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      text-decoration: none;
      transition: background-color 0.15s;
    }

    .btn-zoom:hover { background: #1e40af; }

    .quiz-reminder {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: #b45309;
      background: #fffbeb;
      padding: 0.375rem 0.75rem;
      border-radius: 0.375rem;
    }

    .loading, .error-msg { text-align: center; padding: 3rem; color: #475569; }
    .error-msg { color: #991b1b; }
    .spinner { width: 1.5rem; height: 1.5rem; border: 3px solid #e2e8f0; border-top-color: #ec1313; border-radius: 50%; animation: spin 0.6s linear infinite; margin: 0 auto 0.75rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { text-align: center; padding: 3rem; color: #64748b; }
  `;

  constructor() {
    super();
    this.cohortId = '';
    this._sessions = [];
    this._loading = true;
    this._error = '';
  }

  connectedCallback() {
    super.connectedCallback();
    waitForAuth().then(() => {
      if (this.cohortId) this._loadSessions();
    });
  }

  async _loadSessions() {
    if (!this.cohortId) {
      this._loading = false;
      return;
    }
    this._loading = true;
    const result = await fetchSessionsByCohort(this.cohortId);
    this._loading = false;
    if (result.success) {
      this._sessions = result.sessions;
    } else {
      this._error = result.error;
    }
  }

  _isUpcoming(dateStr) {
    return dateStr >= new Date().toISOString().split('T')[0];
  }

  _formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  render() {
    if (this._loading) return html`<div class="loading"><div class="spinner"></div><p>Cargando sesiones...</p></div>`;
    if (this._error) return html`<div class="error-msg">${this._error}</div>`;

    const upcoming = this._sessions.filter((s) => this._isUpcoming(s.date));
    const past = this._sessions.filter((s) => !this._isUpcoming(s.date));

    return html`
      <h2>Próximas sesiones</h2>
      ${upcoming.length === 0
        ? html`<div class="empty-state"><p>No hay sesiones programadas próximamente</p></div>`
        : upcoming.map((s) => this._renderSession(s, true))}

      ${past.length > 0 ? html`
        <h2 style="margin-top: 2rem;">Sesiones pasadas</h2>
        ${past.map((s) => this._renderSession(s, false))}
      ` : ''}
    `;
  }

  _renderSession(s, isUpcoming) {
    return html`
      <div class="session-card ${isUpcoming ? '' : 'session-card--past'}">
        <div class="session-title">
          ${s.title}
          <span class="badge ${isUpcoming ? 'badge--upcoming' : 'badge--past'}">
            ${isUpcoming ? 'Próxima' : 'Pasada'}
          </span>
        </div>
        <div class="session-meta">
          <span class="session-meta-item">${this._formatDate(s.date)}</span>
          <span class="session-meta-item">${s.time}h</span>
          <span class="session-meta-item">${s.duration} min</span>
        </div>
        <div class="session-actions">
          ${isUpcoming ? html`
            <a class="btn-zoom" href="${s.zoomUrl}" target="_blank" rel="noopener noreferrer">
              Unirse a Zoom
            </a>
          ` : ''}
          ${s.quizId ? html`
            <span class="quiz-reminder">
              Quiz previo requerido
              <a href="/curso/quiz/${s.quizId}" style="color: #b45309; font-weight: 600;">Completar</a>
            </span>
          ` : ''}
        </div>
      </div>
    `;
  }
}

customElements.define('student-sessions-view', StudentSessionsView);
