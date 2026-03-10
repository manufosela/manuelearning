import { LitElement, html, css } from 'lit';
import { fetchAllModules, fetchLessons } from '../lib/firebase/modules.js';
import { trackActivity } from '../lib/firebase/users.js';
import { getUserProgress } from '../lib/firebase/progress.js';
import { getStreak, getStreakBadges } from '../lib/firebase/streaks.js';
import { fetchUser } from '../lib/firebase/users.js';
import { fetchCohort } from '../lib/firebase/cohorts.js';
import { isCohortExpired } from '../lib/cohort-utils.js';
import { waitForAuth } from '../lib/auth-ready.js';
import { computeDashboardStats } from '../lib/dashboard-stats.js';
import { getUserQuizResults } from '../lib/firebase/quizzes.js';
import { computeWeeklyCompletions, computeQuizPerformance, estimateCompletionDate } from '../lib/analytics-utils.js';
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
    _streak: { type: Object, state: true },
    _analytics: { type: Object, state: true },
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

    .streak-card {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .streak-icon {
      font-size: 2.5rem;
      color: #f59e0b;
    }

    .streak-info {
      flex: 1;
    }

    .streak-current {
      font-size: 1.5rem;
      font-weight: 900;
      color: #0f172a;
    }

    .streak-current span {
      color: #f59e0b;
    }

    .streak-best {
      font-size: 0.813rem;
      color: #64748b;
      margin-top: 0.125rem;
    }

    .streak-badges {
      display: flex;
      gap: 0.5rem;
    }

    .streak-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      background: #fef3c7;
      color: #92400e;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .streak-badge .material-symbols-outlined {
      font-size: 0.875rem;
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
      margin-bottom: 1rem;
    }

    .course-details {
      background: #fff;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
      overflow: hidden;
    }

    .course-details summary {
      cursor: pointer;
      list-style: none;
      padding: 1rem 1.25rem;
      transition: background 0.15s;
    }

    .course-details summary::-webkit-details-marker { display: none; }

    .course-details summary:hover {
      background: #f8fafc;
    }

    .course-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .course-summary-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .course-toggle-icon {
      font-size: 1.25rem;
      color: #94a3b8;
      transition: transform 0.2s;
    }

    .course-details[open] .course-toggle-icon {
      transform: rotate(90deg);
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
    }

    .course-progress-bar .progress-bar {
      height: 100%;
    }

    .course-details-content {
      padding: 0 1.25rem 1rem;
    }

    .module-progress--pending {
      opacity: 0.45;
    }

    .module-progress--active {
      border: 2px solid #84cc16;
      cursor: pointer;
      transition: box-shadow 0.15s;
    }

    .module-progress--active:hover {
      box-shadow: 0 2px 8px rgb(132 204 22 / 0.25);
    }

    .module-progress-link {
      text-decoration: none;
      color: inherit;
      display: block;
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

    /* ── Analytics Section ──────────────────────────────── */

    .analytics-section {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
      margin-bottom: 2rem;
    }

    .analytics-section h2 {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 1.25rem;
    }

    .analytics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    @media (max-width: 640px) {
      .analytics-grid {
        grid-template-columns: 1fr;
      }
    }

    .analytics-card {
      background: #f8fafc;
      border-radius: 0.5rem;
      padding: 1rem;
    }

    .analytics-card h3 {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
    }

    /* Weekly chart */

    .weekly-chart {
      display: flex;
      align-items: flex-end;
      gap: 0.5rem;
      height: 100px;
    }

    .chart-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      height: 100%;
      justify-content: flex-end;
    }

    .chart-bar {
      width: 100%;
      border-radius: 0.25rem 0.25rem 0 0;
      background: linear-gradient(180deg, #84cc16, #65a30d);
      min-height: 4px;
      transition: height 0.4s ease;
    }

    .chart-bar-value {
      font-size: 0.688rem;
      font-weight: 700;
      color: #0f172a;
    }

    .chart-bar-label {
      font-size: 0.625rem;
      color: #94a3b8;
      white-space: nowrap;
    }

    /* Quiz stats */

    .quiz-rate {
      font-size: 2rem;
      font-weight: 900;
      color: #84cc16;
      margin-bottom: 0.25rem;
    }

    .quiz-detail {
      font-size: 0.75rem;
      color: #64748b;
    }

    /* Completion estimate */

    .estimate-value {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.25rem;
    }

    .estimate-detail {
      font-size: 0.75rem;
      color: #64748b;
    }

    /* Module performance bars */

    .module-perf-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .module-perf-row:last-child {
      margin-bottom: 0;
    }

    .module-perf-name {
      font-size: 0.75rem;
      color: #334155;
      min-width: 80px;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .module-perf-bar-bg {
      flex: 1;
      background: #e2e8f0;
      border-radius: 9999px;
      height: 0.5rem;
      overflow: hidden;
    }

    .module-perf-bar {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.4s ease;
    }

    .module-perf-percent {
      font-size: 0.75rem;
      font-weight: 700;
      color: #334155;
      min-width: 32px;
      text-align: right;
    }
  `;

  constructor() {
    super();
    this._stats = null;
    this._loading = true;
    this._error = '';
    this._cohortExpired = false;
    this._streak = null;
    this._analytics = null;
  }

  connectedCallback() {
    super.connectedCallback();
    waitForAuth().then((user) => this._loadDashboard(user));
  }

  async _loadDashboard(user) {
    this._loading = true;
    trackActivity(user.uid);

    const userResult = await fetchUser(user.uid);
    if (userResult.success && userResult.user.cohortId && !userResult.user.lifetimeAccess) {
      const cohortResult = await fetchCohort(userResult.user.cohortId);
      if (cohortResult.success && isCohortExpired(cohortResult.cohort)) {
        this._cohortExpired = true;
        this._loading = false;
        return;
      }
    }

    const [modulesResult, progressResult, streakResult] = await Promise.all([
      fetchAllModules(),
      getUserProgress(user.uid),
      getStreak(user.uid),
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

    if (streakResult.success && streakResult.streak) {
      this._streak = streakResult.streak;
    }

    // Compute analytics (non-blocking — dashboard renders even if quiz fetch fails)
    try {
      const quizResult = await getUserQuizResults(user.uid);
      const weeklyCompletions = computeWeeklyCompletions(progressResult.completedLessons);
      const quizPerformance = quizResult.success
        ? computeQuizPerformance(quizResult.results, this._stats.moduleStats)
        : { successRate: 0, totalAnswered: 0, totalCorrect: 0, byModule: [] };
      const completion = estimateCompletionDate(progressResult.completedLessons, this._stats.totalLessons);
      this._analytics = { weeklyCompletions, quizPerformance, completion };
    } catch {
      this._analytics = null;
    }

    this._loading = false;
  }

  /** @private */
  _renderAnalytics() {
    if (!this._analytics) return '';

    const { weeklyCompletions, quizPerformance, completion } = this._analytics;
    const maxCount = Math.max(...weeklyCompletions.map((w) => w.count), 1);

    const perfBarColor = (pct) => {
      if (pct >= 80) return '#16a34a';
      if (pct >= 60) return '#84cc16';
      if (pct >= 40) return '#eab308';
      return '#ef4444';
    };

    return html`
      <div class="analytics-section">
        <h2>Mi rendimiento</h2>
        <div class="analytics-grid">

          <div class="analytics-card">
            <h3>Clases por semana</h3>
            <div class="weekly-chart">
              ${weeklyCompletions.map((w) => html`
                <div class="chart-col">
                  <span class="chart-bar-value">${w.count}</span>
                  <div class="chart-bar" style="height: ${Math.max((w.count / maxCount) * 100, 5)}%"></div>
                  <span class="chart-bar-label">${w.weekLabel}</span>
                </div>
              `)}
            </div>
          </div>

          <div class="analytics-card">
            <h3>Acierto en quizzes</h3>
            ${quizPerformance.totalAnswered > 0 ? html`
              <div class="quiz-rate">${quizPerformance.successRate}%</div>
              <div class="quiz-detail">${quizPerformance.totalCorrect} de ${quizPerformance.totalAnswered} respuestas correctas</div>
            ` : html`
              <div class="quiz-detail">Aún no has completado quizzes</div>
            `}
          </div>

          <div class="analytics-card">
            <h3>Estimación de finalización</h3>
            ${completion.weeksRemaining === 0 ? html`
              <div class="estimate-value">Completado</div>
              <div class="estimate-detail">Has terminado todas las clases</div>
            ` : completion.estimatedDate ? html`
              <div class="estimate-value">${completion.estimatedDate}</div>
              <div class="estimate-detail">~${completion.weeksRemaining} ${completion.weeksRemaining === 1 ? 'semana' : 'semanas'} restantes (${completion.lessonsPerWeek} clases/sem)</div>
            ` : html`
              <div class="estimate-detail">Completa más clases para calcular una estimación</div>
            `}
          </div>

          ${quizPerformance.byModule.length > 0 ? html`
            <div class="analytics-card">
              <h3>Rendimiento por módulo</h3>
              ${quizPerformance.byModule.map((m) => html`
                <div class="module-perf-row">
                  <span class="module-perf-name" title="${m.moduleTitle}">${m.moduleTitle}</span>
                  <div class="module-perf-bar-bg">
                    <div class="module-perf-bar" style="width: ${m.percent}%; background: ${perfBarColor(m.percent)}"></div>
                  </div>
                  <span class="module-perf-percent">${m.percent}%</span>
                </div>
              `)}
            </div>
          ` : ''}

        </div>
      </div>
    `;
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
          <h2>Tu convocatoria ha expirado</h2>
          <p>
            El periodo de acceso a los contenidos del curso ha finalizado.
            Contacta al administrador si necesitas una extensión o acceso a una nueva convocatoria.
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

      ${this._streak ? html`
        <div class="streak-card">
          <span class="material-symbols-outlined streak-icon">local_fire_department</span>
          <div class="streak-info">
            <div class="streak-current"><span>${this._streak.current}</span> ${this._streak.current === 1 ? 'día' : 'días'} de racha</div>
            <div class="streak-best">Mejor racha: ${this._streak.longest} ${this._streak.longest === 1 ? 'día' : 'días'}</div>
          </div>
          ${getStreakBadges(this._streak.longest).length > 0 ? html`
            <div class="streak-badges">
              ${getStreakBadges(this._streak.longest).map((b) => html`
                <span class="streak-badge">
                  <span class="material-symbols-outlined">${b.icon}</span>
                  ${b.label}
                </span>
              `)}
            </div>
          ` : ''}
        </div>
      ` : ''}

      ${this._renderAnalytics()}

      <div class="global-progress">
        <h2>Progreso general</h2>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${s.globalPercent}%"></div>
        </div>
        <div class="progress-text">${s.completedCount} de ${s.totalLessons} clases completadas</div>
      </div>

      ${s.courseGroups.map(
        (group) => {
          const firstPendingModule = group.modules.find((m) => m.percent < 100 && m.firstIncompleteLesson);
          return html`
            <div class="course-section">
              <details class="course-details" open>
                <summary>
                  <div class="course-section-header">
                    <div class="course-summary-left">
                      <span class="material-symbols-outlined course-toggle-icon">chevron_right</span>
                      <a href="/curso?c=${encodeURIComponent(group.course)}" class="course-section-title-link" @click=${(e) => e.stopPropagation()}>
                        <span class="course-section-title">${group.course}</span>
                        <span class="material-symbols-outlined course-section-arrow">arrow_forward</span>
                      </a>
                    </div>
                    <span class="course-section-percent">${group.percent}% — ${group.completedCount}/${group.totalLessons} clases</span>
                  </div>
                  <div class="course-progress-bar">
                    <div class="progress-bar" style="width: ${group.percent}%"></div>
                  </div>
                </summary>
                <div class="course-details-content">
                  <div class="modules-section">
                    ${group.modules.map(
                      (mod) => {
                        const isActive = firstPendingModule && mod.moduleId === firstPendingModule.moduleId;
                        const isPending = mod.percent === 0 && !isActive;
                        const modClass = `module-progress ${isActive ? 'module-progress--active' : ''} ${isPending ? 'module-progress--pending' : ''}`;

                        const content = html`
                          <div class="module-progress-header">
                            <span class="module-progress-title">${mod.moduleTitle}</span>
                            <span class="module-progress-percent">${mod.percent}%</span>
                          </div>
                          <div class="progress-bar-sm">
                            <div class="progress-bar" style="width: ${mod.percent}%"></div>
                          </div>
                        `;

                        return isActive && mod.firstIncompleteLesson
                          ? html`<a href="/leccion?m=${mod.moduleId}&l=${mod.firstIncompleteLesson.lessonId}" class="module-progress-link"><div class=${modClass}>${content}</div></a>`
                          : html`<div class=${modClass}>${content}</div>`;
                      }
                    )}
                  </div>
                </div>
              </details>
            </div>
          `;
        }
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
