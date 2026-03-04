import { LitElement, html, css } from 'lit';
import { fetchAllModules, fetchLessons } from '../lib/firebase/modules.js';
import { getUserProgress } from '../lib/firebase/progress.js';
import { fetchUser } from '../lib/firebase/users.js';
import { fetchCohort } from '../lib/firebase/cohorts.js';
import { isCohortExpired } from '../lib/cohort-utils.js';
import { waitForAuth } from '../lib/auth-ready.js';
import { computeDashboardStats } from '../lib/dashboard-stats.js';
import { materialIconsLink } from './shared/material-icons.js';

/**
 * @element student-dashboard-view
 * Displays student progress dashboard with global and per-module stats.
 */
export class StudentDashboardView extends LitElement {
  static properties = {
    _stats: { type: Object, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
    _cohortExpired: { type: Boolean, state: true },
  };

  static styles = css`
    :host {
      display: block;
    }

    .dashboard-header {
      margin-bottom: 2rem;
    }

    .dashboard-header h1 {
      font-size: 1.5rem;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 0.25rem;
    }

    .dashboard-header p {
      color: #64748b;
      font-size: 0.938rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
    }

    .stat-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.375rem;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 900;
      color: #0f172a;
    }

    .stat-value--accent {
      color: #84cc16;
    }

    .global-progress {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
      margin-bottom: 2rem;
    }

    .global-progress h2 {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 1rem;
    }

    .progress-bar-container {
      background: #f1f5f9;
      border-radius: 9999px;
      height: 1rem;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-bar {
      height: 100%;
      border-radius: 9999px;
      background: linear-gradient(90deg, #84cc16, #22d3ee);
      transition: width 0.5s ease;
    }

    .progress-text {
      font-size: 0.813rem;
      color: #64748b;
    }

    .modules-section h2 {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 1rem;
    }

    .module-progress {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
      margin-bottom: 0.75rem;
    }

    .module-progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .module-progress-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #0f172a;
    }

    .module-progress-percent {
      font-size: 0.813rem;
      font-weight: 700;
      color: #84cc16;
    }

    .progress-bar-sm {
      background: #f1f5f9;
      border-radius: 9999px;
      height: 0.5rem;
      overflow: hidden;
    }

    .progress-bar-sm .progress-bar {
      height: 100%;
    }

    .quick-link {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      background: #84cc16;
      color: #fff;
      text-decoration: none;
      font-size: 0.813rem;
      font-weight: 600;
      margin-top: 0.75rem;
      transition: background 0.15s;
    }

    .quick-link:hover {
      background: #65a30d;
    }

    .quick-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 1.5rem;
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

    @keyframes spin { to { transform: rotate(360deg); } }

    .error-msg {
      text-align: center;
      padding: 3rem;
      color: #991b1b;
    }

    .expired-banner {
      text-align: center;
      padding: 3rem 2rem;
      max-width: 480px;
      margin: 2rem auto;
    }

    .course-section {
      margin-bottom: 2rem;
    }

    .course-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .course-section-title-link {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      text-decoration: none;
      color: #0f172a;
      transition: color 0.15s;
    }

    .course-section-title-link:hover {
      color: #84cc16;
    }

    .course-section-arrow {
      font-size: 1.125rem;
      opacity: 0;
      transition: opacity 0.15s;
    }

    .course-section-title-link:hover .course-section-arrow {
      opacity: 1;
    }

    .course-section-title {
      font-size: 1rem;
      font-weight: 700;
    }

    .course-section-percent {
      font-size: 0.813rem;
      font-weight: 700;
      color: #84cc16;
    }

    .course-progress-bar {
      background: #f1f5f9;
      border-radius: 9999px;
      height: 0.625rem;
      overflow: hidden;
      margin-bottom: 1rem;
    }

    .course-progress-bar .progress-bar {
      height: 100%;
    }

    .expired-banner .material-symbols-outlined {
      font-size: 3rem;
      color: #f59e0b;
      margin-bottom: 1rem;
    }

    .expired-banner h2 {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.75rem;
    }

    .expired-banner p {
      color: #475569;
      line-height: 1.7;
    }
  `;

  constructor() {
    super();
    this._stats = null;
    this._loading = true;
    this._error = '';
    this._cohortExpired = false;
  }

  connectedCallback() {
    super.connectedCallback();
    waitForAuth().then((user) => this._loadDashboard(user));
  }

  async _loadDashboard(user) {
    this._loading = true;

    const userResult = await fetchUser(user.uid);
    if (userResult.success && userResult.user.cohortId && !userResult.user.lifetimeAccess) {
      const cohortResult = await fetchCohort(userResult.user.cohortId);
      if (cohortResult.success && isCohortExpired(cohortResult.cohort)) {
        this._cohortExpired = true;
        this._loading = false;
        return;
      }
    }

    const [modulesResult, progressResult] = await Promise.all([
      fetchAllModules(),
      getUserProgress(user.uid),
    ]);

    if (!modulesResult.success) {
      this._loading = false;
      this._error = modulesResult.error;
      return;
    }

    if (!progressResult.success) {
      this._loading = false;
      this._error = progressResult.error;
      return;
    }

    const lessonsByModule = {};
    for (const mod of modulesResult.modules) {
      const res = await fetchLessons(mod.id);
      lessonsByModule[mod.id] = res.success ? res.lessons : [];
    }

    this._stats = computeDashboardStats(
      modulesResult.modules,
      lessonsByModule,
      progressResult.completedLessons
    );

    this._loading = false;
  }

  render() {
    if (this._loading) {
      return html`<div class="loading"><div class="spinner"></div><p>Cargando dashboard...</p></div>`;
    }

    if (this._error) {
      return html`<div class="error-msg">${this._error}</div>`;
    }

    if (this._cohortExpired) {
      return html`
        ${materialIconsLink}
        <div class="expired-banner">
          <span class="material-symbols-outlined">schedule</span>
          <h2>Tu cohorte ha expirado</h2>
          <p>
            El periodo de acceso a los contenidos del curso ha finalizado.
            Contacta al administrador si necesitas una extensión o acceso a una nueva cohorte.
          </p>
        </div>
      `;
    }

    const s = this._stats;

    return html`
      ${materialIconsLink}

      <div class="dashboard-header">
        <h1>Mi progreso</h1>
        <p>Sigue tu avance en tus cursos</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Avance global</div>
          <div class="stat-value stat-value--accent">${s.globalPercent}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Clases completadas</div>
          <div class="stat-value">${s.completedCount} / ${s.totalLessons}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Cursos</div>
          <div class="stat-value">${s.courseGroups.length}</div>
        </div>
      </div>

      <div class="global-progress">
        <h2>Progreso general</h2>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${s.globalPercent}%"></div>
        </div>
        <div class="progress-text">${s.completedCount} de ${s.totalLessons} clases completadas</div>
      </div>

      ${s.courseGroups.map(
        (group) => html`
          <div class="course-section">
            <div class="course-section-header">
              <a href="/curso?c=${encodeURIComponent(group.course)}" class="course-section-title-link">
                <span class="course-section-title">${group.course}</span>
                <span class="material-symbols-outlined course-section-arrow">arrow_forward</span>
              </a>
              <span class="course-section-percent">${group.percent}% — ${group.completedCount}/${group.totalLessons} clases</span>
            </div>
            <div class="course-progress-bar">
              <div class="progress-bar" style="width: ${group.percent}%"></div>
            </div>
            <div class="modules-section">
              ${group.modules.map(
                (mod) => html`
                  <div class="module-progress">
                    <div class="module-progress-header">
                      <span class="module-progress-title">${mod.moduleTitle}</span>
                      <span class="module-progress-percent">${mod.percent}%</span>
                    </div>
                    <div class="progress-bar-sm">
                      <div class="progress-bar" style="width: ${mod.percent}%"></div>
                    </div>
                  </div>
                `
              )}
            </div>
          </div>
        `
      )}

      <div class="quick-actions">
        ${s.nextLesson ? html`
          <a href="/leccion?m=${s.nextLesson.moduleId}&l=${s.nextLesson.lessonId}" class="quick-link">
            <span class="material-symbols-outlined">play_arrow</span>
            Continuar: ${s.nextLesson.lessonTitle}
          </a>
        ` : html`
          <a href="/cursos" class="quick-link">
            <span class="material-symbols-outlined">check_circle</span>
            Todos los cursos completados
          </a>
        `}
        <a href="/resultados" class="quick-link" style="background: #334155;">
          <span class="material-symbols-outlined">quiz</span>
          Mis quizzes
        </a>
        <a href="/cursos" class="quick-link" style="background: #334155;">
          <span class="material-symbols-outlined">menu_book</span>
          Ver temario
        </a>
      </div>
    `;
  }
}

customElements.define('student-dashboard-view', StudentDashboardView);
