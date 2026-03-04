import { LitElement, html, css } from 'lit';
import { computeRetentionStats } from '../lib/retention.js';
import { fetchAllUsers } from '../lib/firebase/users.js';
import { waitForAuth } from '../lib/auth-ready.js';

/**
 * @element admin-retention-dashboard
 * Admin dashboard showing student retention/engagement status.
 */
export class AdminRetentionDashboard extends LitElement {
  static properties = {
    _stats: { type: Object, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
    _filter: { type: String, state: true },
  };

  static styles = css`
    :host { display: block; }

    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .summary-card { background: #fff; border-radius: 0.75rem; padding: 1.25rem; text-align: center; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); }
    .summary-card__value { font-size: 2rem; font-weight: 900; }
    .summary-card__label { font-size: 0.75rem; color: #64748b; margin-top: 0.25rem; }
    .summary-card--green .summary-card__value { color: #16a34a; }
    .summary-card--yellow .summary-card__value { color: #ca8a04; }
    .summary-card--red .summary-card__value { color: #dc2626; }

    .filter-group { display: flex; gap: 0.375rem; margin-bottom: 1.5rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; font-size: 0.813rem; font-weight: 600; font-family: inherit; cursor: pointer; transition: background-color 0.15s; }
    .btn--secondary { background: #f1f5f9; color: #334155; }
    .btn--secondary:hover { background: #e2e8f0; }
    .btn--active { background: #0f172a; color: #fff; }
    .btn--small { padding: 0.375rem 0.75rem; font-size: 0.75rem; }

    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); }
    th { text-align: left; padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 600; color: #64748b; background: #f8fafc; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 0.75rem 1rem; font-size: 0.875rem; color: #334155; border-top: 1px solid #f1f5f9; }

    .status-dot { display: inline-block; width: 0.625rem; height: 0.625rem; border-radius: 50%; margin-right: 0.5rem; }
    .status-dot--green { background: #16a34a; }
    .status-dot--yellow { background: #ca8a04; }
    .status-dot--red { background: #dc2626; }

    .progress-bar { width: 80px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle; margin-right: 0.5rem; }
    .progress-bar__fill { height: 100%; background: #ec1313; border-radius: 3px; }

    .loading, .error-msg { text-align: center; padding: 3rem; color: #475569; }
    .error-msg { color: #991b1b; }
    .spinner { width: 1.5rem; height: 1.5rem; border: 3px solid #e2e8f0; border-top-color: #ec1313; border-radius: 50%; animation: spin 0.6s linear infinite; margin: 0 auto 0.75rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { text-align: center; padding: 3rem; color: #64748b; }
  `;

  constructor() {
    super();
    this._stats = null;
    this._loading = true;
    this._error = '';
    this._filter = 'all';
  }

  connectedCallback() {
    super.connectedCallback();
    waitForAuth().then(() => this._loadData());
  }

  async _loadData() {
    this._loading = true;
    const usersResult = await fetchAllUsers();
    if (!usersResult.success) {
      this._error = usersResult.error;
      this._loading = false;
      return;
    }

    const students = usersResult.users
      .filter((u) => u.role !== 'admin')
      .map((u) => ({
        uid: u.uid,
        displayName: u.displayName || u.email || 'Sin nombre',
        email: u.email || '',
        lastActivity: u.lastActivity || u.lastLogin || null,
        progress: u.progress || 0,
      }));

    this._stats = computeRetentionStats(students);
    this._loading = false;
  }

  get _filteredStudents() {
    if (!this._stats) return [];
    if (this._filter === 'all') return this._stats.students;
    return this._stats.students.filter((s) => s.classification.status === this._filter);
  }

  render() {
    if (this._loading) return html`<div class="loading"><div class="spinner"></div><p>Analizando retención...</p></div>`;
    if (this._error) return html`<div class="error-msg">${this._error}</div>`;
    if (!this._stats) return html`<div class="empty-state">No hay datos</div>`;

    return html`
      <div class="summary">
        <div class="summary-card">
          <div class="summary-card__value">${this._stats.total}</div>
          <div class="summary-card__label">Total estudiantes</div>
        </div>
        <div class="summary-card summary-card--green">
          <div class="summary-card__value">${this._stats.green}</div>
          <div class="summary-card__label">Activos (&lt;3 días)</div>
        </div>
        <div class="summary-card summary-card--yellow">
          <div class="summary-card__value">${this._stats.yellow}</div>
          <div class="summary-card__label">En riesgo (3-7 días)</div>
        </div>
        <div class="summary-card summary-card--red">
          <div class="summary-card__value">${this._stats.red}</div>
          <div class="summary-card__label">Abandono (&gt;7 días)</div>
        </div>
      </div>

      <div class="filter-group">
        ${['all', 'red', 'yellow', 'green'].map((f) => html`
          <button class="btn btn--small ${this._filter === f ? 'btn--active' : 'btn--secondary'}" @click=${() => { this._filter = f; }}>
            ${f === 'all' ? 'Todos' : f === 'red' ? 'Abandono' : f === 'yellow' ? 'En riesgo' : 'Activos'}
          </button>
        `)}
      </div>

      ${this._filteredStudents.length === 0
        ? html`<div class="empty-state">No hay estudiantes en esta categoría</div>`
        : html`
          <table>
            <thead>
              <tr>
                <th>Estado</th>
                <th>Estudiante</th>
                <th>Última actividad</th>
                <th>Días inactivo</th>
                <th>Progreso</th>
              </tr>
            </thead>
            <tbody>
              ${this._filteredStudents.map((s) => html`
                <tr>
                  <td><span class="status-dot status-dot--${s.classification.status}"></span></td>
                  <td>${s.displayName}</td>
                  <td>${s.lastActivity ? new Date(s.lastActivity).toLocaleDateString('es-ES') : 'Nunca'}</td>
                  <td>${s.classification.daysSinceActivity === Infinity ? '—' : s.classification.daysSinceActivity}</td>
                  <td>
                    <span class="progress-bar">
                      <span class="progress-bar__fill" style="width: ${s.progress}%"></span>
                    </span>
                    ${s.progress}%
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        `}
    `;
  }
}

customElements.define('admin-retention-dashboard', AdminRetentionDashboard);
