import { LitElement, html, css } from 'lit';
import { fetchAdminDashboardStats } from '../lib/firebase/admin-stats.js';
import { materialIconsLink } from './shared/material-icons.js';

/**
 * @element admin-dashboard
 * Dashboard with key metrics for the admin panel.
 */
export class AdminDashboard extends LitElement {
  static properties = {
    _stats: { type: Object, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
  };

  static styles = css`
    :host {
      display: block;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .metric-card {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .metric-card__header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #64748b;
      font-size: 0.813rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .metric-card__header .material-symbols-outlined {
      font-size: 1.125rem;
    }

    .metric-card__value {
      font-size: 2rem;
      font-weight: 900;
      color: #0f172a;
      line-height: 1;
    }

    .metric-card__subtitle {
      font-size: 0.813rem;
      color: #94a3b8;
    }

    .cohort-section {
      margin-top: 1.5rem;
    }

    .cohort-section h3 {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 1rem;
    }

    .cohort-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .cohort-row {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .cohort-row__name {
      font-weight: 600;
      color: #0f172a;
      flex: 1;
      font-size: 0.875rem;
    }

    .cohort-row__bar {
      flex: 2;
      height: 8px;
      background: #f1f5f9;
      border-radius: 4px;
      overflow: hidden;
    }

    .cohort-row__bar-fill {
      height: 100%;
      background: #84cc16;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .cohort-row__percent {
      font-size: 0.875rem;
      font-weight: 700;
      color: #0f172a;
      min-width: 48px;
      text-align: right;
    }

    .loading-placeholder {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .skeleton {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 0.75rem;
      height: 100px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .error-banner {
      background: #fef2f2;
      color: #991b1b;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      border: 1px solid #fecaca;
    }

    .empty-state {
      text-align: center;
      color: #94a3b8;
      padding: 2rem;
      font-size: 0.875rem;
    }
  `;

  constructor() {
    super();
    this._stats = null;
    this._loading = true;
    this._error = '';
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadStats();
  }

  async _loadStats() {
    this._loading = true;
    this._error = '';

    const result = await fetchAdminDashboardStats();

    if (result.success) {
      this._stats = result.stats;
    } else {
      this._error = result.error;
    }

    this._loading = false;
  }

  render() {
    if (this._loading) {
      return this._renderLoading();
    }

    if (this._error) {
      return html`<div class="error-banner">${this._error}</div>`;
    }

    if (!this._stats) {
      return html`<div class="empty-state">No hay datos disponibles</div>`;
    }

    return html`
      ${materialIconsLink}
      <div class="metrics-grid">
        ${this._renderMetricCard('group', 'Usuarios totales', this._stats.totalUsers, 'registrados')}
        ${this._renderMetricCard('trending_up', 'Activos (7 días)', this._stats.activeUsersLast7Days, 'con actividad reciente')}
        ${this._renderMetricCard('task_alt', 'Quizzes completados', this._stats.quizzesCompleted, `de ${this._stats.totalQuizzes} disponibles`)}
        ${this._renderMetricCard('percent', 'Tasa de respuesta', `${this._stats.approvalRate}%`, 'quizzes respondidos')}
      </div>

      ${this._stats.progressByCohort.length > 0
        ? html`
            <div class="cohort-section">
              <h3>Progreso medio por cohorte</h3>
              <div class="cohort-list">
                ${this._stats.progressByCohort.map(
                  (c) => html`
                    <div class="cohort-row">
                      <span class="cohort-row__name">${c.cohortName}</span>
                      <div class="cohort-row__bar">
                        <div
                          class="cohort-row__bar-fill"
                          style="width: ${c.avgProgress}%"
                        ></div>
                      </div>
                      <span class="cohort-row__percent">${c.avgProgress}%</span>
                    </div>
                  `,
                )}
              </div>
            </div>
          `
        : ''}
    `;
  }

  _renderMetricCard(icon, label, value, subtitle) {
    return html`
      <div class="metric-card">
        <div class="metric-card__header">
          <span class="material-symbols-outlined">${icon}</span>
          ${label}
        </div>
        <div class="metric-card__value">${value}</div>
        <div class="metric-card__subtitle">${subtitle}</div>
      </div>
    `;
  }

  _renderLoading() {
    return html`
      <div class="loading-placeholder">
        <div class="metrics-grid">
          <div class="skeleton"></div>
          <div class="skeleton"></div>
          <div class="skeleton"></div>
          <div class="skeleton"></div>
        </div>
      </div>
    `;
  }
}

customElements.define('admin-dashboard', AdminDashboard);
