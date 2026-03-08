import { LitElement, html, css } from 'lit';
import { computeRetentionStats } from '../lib/retention.js';
import { fetchAllUsers } from '../lib/firebase/users.js';
import { getUserProgress } from '../lib/firebase/progress.js';
import { fetchAllModules, fetchLessons } from '../lib/firebase/modules.js';
import { getRetentionConfig, saveRetentionConfig, DEFAULT_RETENTION_CONFIG } from '../lib/firebase/settings.js';
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
    _showConfig: { type: Boolean, state: true },
    _config: { type: Object, state: true },
    _saving: { type: Boolean, state: true },
    _students: { type: Array, state: true },
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
    .progress-bar__fill { height: 100%; background: #84cc16; border-radius: 3px; }

    .engagement-section { margin-bottom: 2rem; }
    .engagement-section h3 { font-size: 0.875rem; font-weight: 700; color: #0f172a; margin-bottom: 0.75rem; }
    .engagement-bar { display: flex; height: 1.5rem; border-radius: 0.5rem; overflow: hidden; background: #f1f5f9; }
    .engagement-bar__segment { display: flex; align-items: center; justify-content: center; font-size: 0.688rem; font-weight: 700; color: #fff; transition: width 0.3s; }
    .engagement-bar__segment--low { background: #16a34a; }
    .engagement-bar__segment--medium { background: #ca8a04; }
    .engagement-bar__segment--high { background: #ea580c; }
    .engagement-bar__segment--critical { background: #dc2626; }
    .engagement-legend { display: flex; gap: 1rem; margin-top: 0.5rem; flex-wrap: wrap; }
    .engagement-legend span { font-size: 0.75rem; color: #475569; display: flex; align-items: center; gap: 0.25rem; }
    .legend-dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; display: inline-block; }

    .score-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 2rem; padding: 0.125rem 0.375rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 700; }
    .score-badge--low { background: #dcfce7; color: #166534; }
    .score-badge--medium { background: #fef9c3; color: #854d0e; }
    .score-badge--high { background: #ffedd5; color: #9a3412; }
    .score-badge--critical { background: #fee2e2; color: #991b1b; }

    .churn-tag { font-size: 0.688rem; font-weight: 600; padding: 0.125rem 0.5rem; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.03em; }
    .churn-tag--low { background: #dcfce7; color: #166534; }
    .churn-tag--medium { background: #fef9c3; color: #854d0e; }
    .churn-tag--high { background: #ffedd5; color: #9a3412; }
    .churn-tag--critical { background: #fee2e2; color: #991b1b; }

    .factors { display: flex; gap: 0.25rem; }
    .factor-mini { width: 2rem; height: 0.375rem; border-radius: 2px; background: #e2e8f0; overflow: hidden; }
    .factor-mini__fill { height: 100%; border-radius: 2px; }
    .factor-mini__fill--recency { background: #3b82f6; }
    .factor-mini__fill--progress { background: #84cc16; }
    .factor-mini__fill--velocity { background: #f59e0b; }
    .factor-mini__fill--consistency { background: #8b5cf6; }

    .config-toggle { margin-bottom: 1.5rem; }

    .config-panel { background: #fff; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); margin-bottom: 2rem; }
    .config-panel h3 { font-size: 1rem; font-weight: 700; color: #0f172a; margin-bottom: 1rem; }
    .config-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; }
    .config-group { margin-bottom: 0.25rem; }
    .config-group h4 { font-size: 0.813rem; font-weight: 600; color: #475569; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }

    .config-field { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.625rem; }
    .config-field label { font-size: 0.813rem; color: #334155; min-width: 120px; flex-shrink: 0; }
    .config-field input[type="number"] { width: 70px; padding: 0.375rem 0.5rem; border: 1px solid #e2e8f0; border-radius: 0.375rem; font-size: 0.813rem; font-family: inherit; text-align: center; }
    .config-field input[type="number"]:focus { outline: none; border-color: #84cc16; box-shadow: 0 0 0 2px rgb(132 204 22 / 0.15); }
    .config-field .unit { font-size: 0.75rem; color: #94a3b8; }

    .config-weight-bar { display: flex; align-items: center; gap: 0.5rem; }
    .config-weight-bar input[type="range"] { flex: 1; accent-color: #84cc16; }
    .config-weight-bar .weight-value { font-size: 0.75rem; font-weight: 700; color: #334155; min-width: 2rem; text-align: right; }
    .weight-total { font-size: 0.75rem; margin-top: 0.5rem; padding: 0.25rem 0.5rem; border-radius: 0.25rem; }
    .weight-total--ok { background: #dcfce7; color: #166534; }
    .weight-total--error { background: #fee2e2; color: #991b1b; }

    .config-actions { display: flex; gap: 0.5rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid #f1f5f9; }
    .btn--primary { background: #84cc16; color: #fff; }
    .btn--primary:hover { background: #65a30d; }
    .btn--primary:disabled { opacity: 0.5; cursor: default; }
    .btn--ghost { background: transparent; color: #64748b; }
    .btn--ghost:hover { background: #f1f5f9; }

    .loading, .error-msg { text-align: center; padding: 3rem; color: #475569; }
    .error-msg { color: #991b1b; }
    .spinner { width: 1.5rem; height: 1.5rem; border: 3px solid #e2e8f0; border-top-color: #84cc16; border-radius: 50%; animation: spin 0.6s linear infinite; margin: 0 auto 0.75rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { text-align: center; padding: 3rem; color: #64748b; }
  `;

  constructor() {
    super();
    this._stats = null;
    this._loading = true;
    this._error = '';
    this._filter = 'all';
    this._showConfig = false;
    this._config = { ...DEFAULT_RETENTION_CONFIG };
    this._saving = false;
    this._students = [];
  }

  connectedCallback() {
    super.connectedCallback();
    waitForAuth().then(() => this._loadData());
  }

  async _loadData() {
    this._loading = true;
    const [usersResult, modulesResult, configResult] = await Promise.all([
      fetchAllUsers(),
      fetchAllModules(),
      getRetentionConfig(),
    ]);

    if (configResult.success) {
      this._config = configResult.config;
    }

    if (!usersResult.success) {
      this._error = usersResult.error;
      this._loading = false;
      return;
    }

    // Build total lesson count
    let totalLessons = 0;
    if (modulesResult.success) {
      for (const mod of modulesResult.modules) {
        const res = await fetchLessons(mod.id);
        if (res.success) totalLessons += res.lessons.length;
      }
    }

    // Enrich each student with progress data
    const nonAdmins = usersResult.users.filter((u) => u.role !== 'admin');
    this._students = await Promise.all(
      nonAdmins.map(async (u) => {
        const progressResult = await getUserProgress(u.uid);
        const lessonsCompleted = progressResult.success
          ? progressResult.completedLessons.length
          : 0;
        const progress = totalLessons > 0
          ? Math.round((lessonsCompleted / totalLessons) * 100)
          : 0;

        return {
          uid: u.uid,
          displayName: u.displayName || u.email || 'Sin nombre',
          email: u.email || '',
          lastActivity: u.lastActivity || u.lastLogin || null,
          progress,
          lessonsCompleted,
          enrolledAt: u.createdAt ? (typeof u.createdAt === 'string' ? u.createdAt : u.createdAt.toDate?.().toISOString() || null) : null,
        };
      })
    );

    this._stats = computeRetentionStats(this._students, this._config);
    this._loading = false;
  }

  _recompute() {
    if (this._students.length > 0) {
      this._stats = computeRetentionStats(this._students, this._config);
    }
  }

  _updateConfig(field, value) {
    this._config = { ...this._config, [field]: Number(value) };
    this._recompute();
  }

  async _saveConfig() {
    this._saving = true;
    await saveRetentionConfig(this._config);
    this._saving = false;
  }

  _resetConfig() {
    this._config = { ...DEFAULT_RETENTION_CONFIG };
    this._recompute();
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

    const eng = this._stats.engagement;
    const cfg = this._config;
    const weightTotal = cfg.weightRecency + cfg.weightProgress + cfg.weightVelocity + cfg.weightConsistency;

    return html`
      <div class="summary">
        <div class="summary-card">
          <div class="summary-card__value">${this._stats.total}</div>
          <div class="summary-card__label">Total estudiantes</div>
        </div>
        <div class="summary-card summary-card--green">
          <div class="summary-card__value">${this._stats.green}</div>
          <div class="summary-card__label">Activos (&lt;${cfg.greenDays} días)</div>
        </div>
        <div class="summary-card summary-card--yellow">
          <div class="summary-card__value">${this._stats.yellow}</div>
          <div class="summary-card__label">En riesgo (${cfg.greenDays}-${cfg.yellowDays} días)</div>
        </div>
        <div class="summary-card summary-card--red">
          <div class="summary-card__value">${this._stats.red}</div>
          <div class="summary-card__label">Abandono (&gt;${cfg.yellowDays} días)</div>
        </div>
        <div class="summary-card">
          <div class="summary-card__value">${eng.avgScore}</div>
          <div class="summary-card__label">Engagement medio</div>
        </div>
      </div>

      <div class="config-toggle">
        <button class="btn btn--small ${this._showConfig ? 'btn--active' : 'btn--secondary'}" @click=${() => { this._showConfig = !this._showConfig; }}>
          Configurar algoritmo
        </button>
      </div>

      ${this._showConfig ? html`
        <div class="config-panel">
          <h3>Parámetros del algoritmo</h3>
          <div class="config-grid">
            <div class="config-group">
              <h4>Clasificación por actividad</h4>
              <div class="config-field">
                <label>Activo si &lt;</label>
                <input type="number" min="1" max="30" .value=${String(cfg.greenDays)} @input=${(e) => this._updateConfig('greenDays', e.target.value)}>
                <span class="unit">días</span>
              </div>
              <div class="config-field">
                <label>En riesgo si &le;</label>
                <input type="number" min="2" max="60" .value=${String(cfg.yellowDays)} @input=${(e) => this._updateConfig('yellowDays', e.target.value)}>
                <span class="unit">días</span>
              </div>
            </div>

            <div class="config-group">
              <h4>Pesos del engagement</h4>
              <div class="config-field">
                <label>Recencia</label>
                <div class="config-weight-bar">
                  <input type="range" min="0" max="100" .value=${String(cfg.weightRecency)} @input=${(e) => this._updateConfig('weightRecency', e.target.value)}>
                  <span class="weight-value">${cfg.weightRecency}%</span>
                </div>
              </div>
              <div class="config-field">
                <label>Progreso</label>
                <div class="config-weight-bar">
                  <input type="range" min="0" max="100" .value=${String(cfg.weightProgress)} @input=${(e) => this._updateConfig('weightProgress', e.target.value)}>
                  <span class="weight-value">${cfg.weightProgress}%</span>
                </div>
              </div>
              <div class="config-field">
                <label>Velocidad</label>
                <div class="config-weight-bar">
                  <input type="range" min="0" max="100" .value=${String(cfg.weightVelocity)} @input=${(e) => this._updateConfig('weightVelocity', e.target.value)}>
                  <span class="weight-value">${cfg.weightVelocity}%</span>
                </div>
              </div>
              <div class="config-field">
                <label>Constancia</label>
                <div class="config-weight-bar">
                  <input type="range" min="0" max="100" .value=${String(cfg.weightConsistency)} @input=${(e) => this._updateConfig('weightConsistency', e.target.value)}>
                  <span class="weight-value">${cfg.weightConsistency}%</span>
                </div>
              </div>
              <div class="weight-total ${weightTotal === 100 ? 'weight-total--ok' : 'weight-total--error'}">
                Total: ${weightTotal}% ${weightTotal !== 100 ? '(debe sumar 100%)' : ''}
              </div>
            </div>

            <div class="config-group">
              <h4>Parámetros del cálculo</h4>
              <div class="config-field">
                <label>Decaimiento</label>
                <input type="number" min="0.01" max="1" step="0.01" .value=${String(cfg.decayFactor)} @input=${(e) => this._updateConfig('decayFactor', e.target.value)}>
                <span class="unit">factor</span>
              </div>
              <div class="config-field">
                <label>Objetivo velocidad</label>
                <input type="number" min="1" max="10" .value=${String(cfg.targetLessonsPerWeek)} @input=${(e) => this._updateConfig('targetLessonsPerWeek', e.target.value)}>
                <span class="unit">clases/sem</span>
              </div>
            </div>

            <div class="config-group">
              <h4>Umbrales de riesgo</h4>
              <div class="config-field">
                <label>Bajo si &ge;</label>
                <input type="number" min="0" max="100" .value=${String(cfg.churnLow)} @input=${(e) => this._updateConfig('churnLow', e.target.value)}>
                <span class="unit">puntos</span>
              </div>
              <div class="config-field">
                <label>Medio si &ge;</label>
                <input type="number" min="0" max="100" .value=${String(cfg.churnMedium)} @input=${(e) => this._updateConfig('churnMedium', e.target.value)}>
                <span class="unit">puntos</span>
              </div>
              <div class="config-field">
                <label>Alto si &ge;</label>
                <input type="number" min="0" max="100" .value=${String(cfg.churnHigh)} @input=${(e) => this._updateConfig('churnHigh', e.target.value)}>
                <span class="unit">puntos</span>
              </div>
            </div>
          </div>

          <div class="config-actions">
            <button class="btn btn--primary" @click=${this._saveConfig} ?disabled=${this._saving || weightTotal !== 100}>
              ${this._saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
            <button class="btn btn--ghost" @click=${this._resetConfig}>Restaurar valores por defecto</button>
          </div>
        </div>
      ` : ''}

      <div class="engagement-section">
        <h3>Distribución de riesgo de abandono</h3>
        <div class="engagement-bar">
          ${eng.low > 0 ? html`<div class="engagement-bar__segment engagement-bar__segment--low" style="width: ${(eng.low / this._stats.total) * 100}%">${eng.low}</div>` : ''}
          ${eng.medium > 0 ? html`<div class="engagement-bar__segment engagement-bar__segment--medium" style="width: ${(eng.medium / this._stats.total) * 100}%">${eng.medium}</div>` : ''}
          ${eng.high > 0 ? html`<div class="engagement-bar__segment engagement-bar__segment--high" style="width: ${(eng.high / this._stats.total) * 100}%">${eng.high}</div>` : ''}
          ${eng.critical > 0 ? html`<div class="engagement-bar__segment engagement-bar__segment--critical" style="width: ${(eng.critical / this._stats.total) * 100}%">${eng.critical}</div>` : ''}
        </div>
        <div class="engagement-legend">
          <span><span class="legend-dot" style="background:#16a34a"></span> Bajo (${eng.low})</span>
          <span><span class="legend-dot" style="background:#ca8a04"></span> Medio (${eng.medium})</span>
          <span><span class="legend-dot" style="background:#ea580c"></span> Alto (${eng.high})</span>
          <span><span class="legend-dot" style="background:#dc2626"></span> Crítico (${eng.critical})</span>
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
                <th>Engagement</th>
                <th>Riesgo</th>
                <th>Factores</th>
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
                  <td><span class="score-badge score-badge--${s.engagement.churnRisk}">${s.engagement.score}</span></td>
                  <td><span class="churn-tag churn-tag--${s.engagement.churnRisk}">${s.engagement.churnRisk === 'low' ? 'Bajo' : s.engagement.churnRisk === 'medium' ? 'Medio' : s.engagement.churnRisk === 'high' ? 'Alto' : 'Crítico'}</span></td>
                  <td>
                    <div class="factors" title="Recencia: ${s.engagement.factors.recency} | Progreso: ${s.engagement.factors.progress} | Velocidad: ${s.engagement.factors.velocity} | Constancia: ${s.engagement.factors.consistency}">
                      <div class="factor-mini"><div class="factor-mini__fill factor-mini__fill--recency" style="width: ${s.engagement.factors.recency}%"></div></div>
                      <div class="factor-mini"><div class="factor-mini__fill factor-mini__fill--progress" style="width: ${s.engagement.factors.progress}%"></div></div>
                      <div class="factor-mini"><div class="factor-mini__fill factor-mini__fill--velocity" style="width: ${s.engagement.factors.velocity}%"></div></div>
                      <div class="factor-mini"><div class="factor-mini__fill factor-mini__fill--consistency" style="width: ${s.engagement.factors.consistency}%"></div></div>
                    </div>
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
