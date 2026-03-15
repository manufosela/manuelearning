import { LitElement, html, css } from 'lit';
import { computeRetentionStats } from '../lib/retention.js';
import { fetchAllUsers } from '../lib/firebase/users.js';
import { getUserProgress } from '../lib/firebase/progress.js';
import { fetchAllModules, fetchLessons } from '../lib/firebase/modules.js';
import { getRetentionConfig, saveRetentionConfig, DEFAULT_RETENTION_CONFIG } from '../lib/firebase/settings.js';
import { fetchAllProgressRecords, fetchAllQuizResponseRecords, fetchAllQuizDefinitions } from '../lib/firebase/admin-stats.js';
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
    _heatmapData: { type: Array, state: true },
    _selectedLesson: { type: Object, state: true },
    _allModules: { type: Array, state: true },
  };

  static styles = css`
    :host { display: block; }

    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .summary-card { background: var(--color-bg-white, #fff); border-radius: 0.75rem; padding: 1.25rem; text-align: center; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); }
    .summary-card__value { font-size: 2rem; font-weight: 900; }
    .summary-card__label { font-size: 0.75rem; color: var(--color-text-muted, #64748b); margin-top: 0.25rem; }
    .summary-card--green .summary-card__value { color: #16a34a; }
    .summary-card--yellow .summary-card__value { color: #ca8a04; }
    .summary-card--red .summary-card__value { color: #dc2626; }

    .filter-group { display: flex; gap: 0.375rem; margin-bottom: 1.5rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; font-size: 0.813rem; font-weight: 600; font-family: inherit; cursor: pointer; transition: background-color 0.15s; }
    .btn--secondary { background: var(--color-bg-slate-100, #f1f5f9); color: var(--color-text-body, #334155); }
    .btn--secondary:hover { background: var(--color-border, #e2e8f0); }
    .btn--active { background: var(--color-text-primary, #0f172a); color: var(--color-bg-white, #fff); }
    .btn--small { padding: 0.375rem 0.75rem; font-size: 0.75rem; }

    table { width: 100%; border-collapse: collapse; background: var(--color-bg-white, #fff); border-radius: 0.75rem; overflow: hidden; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); }
    th { text-align: left; padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted, #64748b); background: var(--color-bg-slate-50, #f8fafc); text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 0.75rem 1rem; font-size: 0.875rem; color: var(--color-text-body, #334155); border-top: 1px solid var(--color-bg-slate-100, #f1f5f9); }

    .status-dot { display: inline-block; width: 0.625rem; height: 0.625rem; border-radius: 50%; margin-right: 0.5rem; }
    .status-dot--green { background: #16a34a; }
    .status-dot--yellow { background: #ca8a04; }
    .status-dot--red { background: #dc2626; }

    .progress-bar { width: 80px; height: 6px; background: var(--color-border, #e2e8f0); border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle; margin-right: 0.5rem; }
    .progress-bar__fill { height: 100%; background: #84cc16; border-radius: 3px; }

    .engagement-section { margin-bottom: 2rem; }
    .engagement-section h3 { font-size: 0.875rem; font-weight: 700; color: var(--color-text-primary, #0f172a); margin-bottom: 0.75rem; }
    .engagement-bar { display: flex; height: 1.5rem; border-radius: 0.5rem; overflow: hidden; background: var(--color-bg-slate-100, #f1f5f9); }
    .engagement-bar__segment { display: flex; align-items: center; justify-content: center; font-size: 0.688rem; font-weight: 700; color: var(--color-bg-white, #fff); transition: width 0.3s; }
    .engagement-bar__segment--low { background: #16a34a; }
    .engagement-bar__segment--medium { background: #ca8a04; }
    .engagement-bar__segment--high { background: #ea580c; }
    .engagement-bar__segment--critical { background: #dc2626; }
    .engagement-legend { display: flex; gap: 1rem; margin-top: 0.5rem; flex-wrap: wrap; }
    .engagement-legend span { font-size: 0.75rem; color: var(--color-text-secondary, #475569); display: flex; align-items: center; gap: 0.25rem; }
    .legend-dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; display: inline-block; }

    .score-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 2rem; padding: 0.125rem 0.375rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 700; }
    .score-badge--low { background: #dcfce7; color: var(--color-success-text, #166534); }
    .score-badge--medium { background: #fef9c3; color: #854d0e; }
    .score-badge--high { background: #ffedd5; color: #9a3412; }
    .score-badge--critical { background: #fee2e2; color: var(--color-error-text, #991b1b); }

    .churn-tag { font-size: 0.688rem; font-weight: 600; padding: 0.125rem 0.5rem; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.03em; }
    .churn-tag--low { background: #dcfce7; color: var(--color-success-text, #166534); }
    .churn-tag--medium { background: #fef9c3; color: #854d0e; }
    .churn-tag--high { background: #ffedd5; color: #9a3412; }
    .churn-tag--critical { background: #fee2e2; color: var(--color-error-text, #991b1b); }

    .factors { display: flex; gap: 0.25rem; }
    .factor-mini { width: 2rem; height: 0.375rem; border-radius: 2px; background: var(--color-border, #e2e8f0); overflow: hidden; }
    .factor-mini__fill { height: 100%; border-radius: 2px; }
    .factor-mini__fill--recency { background: #3b82f6; }
    .factor-mini__fill--progress { background: #84cc16; }
    .factor-mini__fill--velocity { background: #f59e0b; }
    .factor-mini__fill--consistency { background: #8b5cf6; }

    .config-toggle { margin-bottom: 1.5rem; }

    .config-panel { background: var(--color-bg-white, #fff); border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); margin-bottom: 2rem; }
    .config-panel h3 { font-size: 1rem; font-weight: 700; color: var(--color-text-primary, #0f172a); margin-bottom: 1rem; }
    .config-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; }
    .config-group { margin-bottom: 0.25rem; }
    .config-group h4 { font-size: 0.813rem; font-weight: 600; color: var(--color-text-secondary, #475569); margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }

    .config-field { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.625rem; }
    .config-field label { font-size: 0.813rem; color: var(--color-text-body, #334155); min-width: 120px; flex-shrink: 0; }
    .config-field input[type="number"] { width: 70px; padding: 0.375rem 0.5rem; border: 1px solid var(--color-border, #e2e8f0); border-radius: 0.375rem; font-size: 0.813rem; font-family: inherit; text-align: center; }
    .config-field input[type="number"]:focus { outline: none; border-color: #84cc16; box-shadow: 0 0 0 2px rgb(132 204 22 / 0.15); }
    .config-field .unit { font-size: 0.75rem; color: var(--color-text-muted, #94a3b8); }

    .config-weight-bar { display: flex; align-items: center; gap: 0.5rem; }
    .config-weight-bar input[type="range"] { flex: 1; accent-color: #84cc16; }
    .config-weight-bar .weight-value { font-size: 0.75rem; font-weight: 700; color: var(--color-text-body, #334155); min-width: 2rem; text-align: right; }
    .weight-total { font-size: 0.75rem; margin-top: 0.5rem; padding: 0.25rem 0.5rem; border-radius: 0.25rem; }
    .weight-total--ok { background: #dcfce7; color: var(--color-success-text, #166534); }
    .weight-total--error { background: #fee2e2; color: var(--color-error-text, #991b1b); }

    .config-actions { display: flex; gap: 0.5rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--color-bg-slate-100, #f1f5f9); }
    .btn--primary { background: #84cc16; color: var(--color-bg-white, #fff); }
    .btn--primary:hover { background: #65a30d; }
    .btn--primary:disabled { opacity: 0.5; cursor: default; }
    .btn--ghost { background: transparent; color: var(--color-text-muted, #64748b); }
    .btn--ghost:hover { background: var(--color-bg-slate-100, #f1f5f9); }

    .loading, .error-msg { text-align: center; padding: 3rem; color: var(--color-text-secondary, #475569); }
    .error-msg { color: var(--color-error-text, #991b1b); }
    .spinner { width: 1.5rem; height: 1.5rem; border: 3px solid var(--color-border, #e2e8f0); border-top-color: #84cc16; border-radius: 50%; animation: spin 0.6s linear infinite; margin: 0 auto 0.75rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { text-align: center; padding: 3rem; color: var(--color-text-muted, #64748b); }

    /* Heatmap Section */
    .heatmap-section { margin-bottom: 2rem; }
    .heatmap-section h3 { font-size: 0.875rem; font-weight: 700; color: var(--color-text-primary, #0f172a); margin-bottom: 0.75rem; }
    .heatmap-module { margin-bottom: 1.25rem; }
    .heatmap-module__title { font-size: 0.75rem; font-weight: 600; color: var(--color-text-secondary, #475569); margin-bottom: 0.375rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .heatmap-grid { display: flex; gap: 0.375rem; flex-wrap: wrap; }
    .heatmap-cell { width: 3.5rem; height: 3.5rem; border-radius: 0.375rem; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; position: relative; border: 2px solid transparent; }
    .heatmap-cell:hover { transform: scale(1.1); box-shadow: 0 2px 8px rgb(0 0 0 / 0.15); z-index: 1; }
    .heatmap-cell--selected { border-color: var(--color-text-primary, #0f172a); }
    .heatmap-cell__label { font-size: 0.563rem; font-weight: 700; color: rgba(255,255,255,0.9); line-height: 1; }
    .heatmap-cell__value { font-size: 0.688rem; font-weight: 800; color: #fff; line-height: 1.2; }

    .heatmap-legend { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem; font-size: 0.75rem; color: var(--color-text-secondary, #475569); }
    .heatmap-legend__bar { display: flex; height: 0.5rem; border-radius: 0.25rem; overflow: hidden; width: 8rem; }
    .heatmap-legend__bar span { flex: 1; }

    .heatmap-toggle { display: flex; gap: 0.375rem; margin-bottom: 0.75rem; }

    /* Detail Panel */
    .detail-panel { background: var(--color-bg-white, #fff); border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); margin-bottom: 2rem; }
    .detail-panel__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .detail-panel__title { font-size: 1rem; font-weight: 700; color: var(--color-text-primary, #0f172a); }
    .detail-panel__close { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--color-text-muted, #64748b); padding: 0.25rem; }
    .detail-panel__close:hover { color: var(--color-text-primary, #0f172a); }
    .detail-panel__stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem; }
    .detail-stat { background: var(--color-bg-slate-50, #f8fafc); border-radius: 0.5rem; padding: 0.75rem; text-align: center; }
    .detail-stat__value { font-size: 1.25rem; font-weight: 800; }
    .detail-stat__label { font-size: 0.688rem; color: var(--color-text-muted, #64748b); margin-top: 0.125rem; }
    .detail-stat--red .detail-stat__value { color: #dc2626; }
    .detail-stat--amber .detail-stat__value { color: #ca8a04; }
    .detail-stat--green .detail-stat__value { color: #16a34a; }

    .detail-section { margin-bottom: 1rem; }
    .detail-section h4 { font-size: 0.813rem; font-weight: 600; color: var(--color-text-secondary, #475569); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .detail-list { list-style: none; padding: 0; margin: 0; }
    .detail-list li { padding: 0.375rem 0; border-bottom: 1px solid var(--color-bg-slate-100, #f1f5f9); font-size: 0.813rem; color: var(--color-text-body, #334155); display: flex; align-items: center; gap: 0.5rem; }
    .detail-list li:last-child { border-bottom: none; }
    .detail-list__name { font-weight: 600; }
    .detail-list__meta { font-size: 0.75rem; color: var(--color-text-muted, #94a3b8); }
    .detail-question { padding: 0.5rem 0; border-bottom: 1px solid var(--color-bg-slate-100, #f1f5f9); }
    .detail-question:last-child { border-bottom: none; }
    .detail-question__text { font-size: 0.813rem; color: var(--color-text-body, #334155); }
    .detail-question__rate { font-size: 0.75rem; font-weight: 700; color: #dc2626; margin-top: 0.125rem; }
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
    this._heatmapData = [];
    this._selectedLesson = null;
    this._allModules = [];
    this._heatmapMode = 'dropout';
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

    // Build total lesson count and gather all lessons per module
    let totalLessons = 0;
    const modulesWithLessons = [];
    if (modulesResult.success) {
      for (const mod of modulesResult.modules) {
        const res = await fetchLessons(mod.id);
        if (res.success) {
          totalLessons += res.lessons.length;
          modulesWithLessons.push({ ...mod, lessons: res.lessons });
        }
      }
    }
    this._allModules = modulesWithLessons;

    // Enrich each user with progress data
    this._students = await Promise.all(
      usersResult.users.map(async (u) => {
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

    // Build heatmap data
    await this._buildHeatmapData(usersResult.users);

    this._loading = false;
  }

  async _buildHeatmapData(users) {
    const [progressResult, responsesResult, quizzesResult] = await Promise.all([
      fetchAllProgressRecords(),
      fetchAllQuizResponseRecords(),
      fetchAllQuizDefinitions(),
    ]);

    if (!progressResult.success) return;

    const totalStudents = users.length;
    const progressRecords = progressResult.records || [];
    const quizResponses = responsesResult.success ? (responsesResult.records || []) : [];
    const quizDefs = quizzesResult.success ? (quizzesResult.records || []) : [];

    // Map: userId → Set of completed lessonIds (as moduleId_lessonId keys)
    const userCompletedMap = new Map();
    for (const rec of progressRecords) {
      const key = `${rec.moduleId}_${rec.lessonId}`;
      if (!userCompletedMap.has(rec.userId)) userCompletedMap.set(rec.userId, new Set());
      userCompletedMap.get(rec.userId).add(key);
    }

    // Build ordered lesson list to determine "last completed lesson" for dropout
    const orderedLessons = [];
    for (const mod of this._allModules) {
      for (const lesson of mod.lessons) {
        orderedLessons.push({ moduleId: mod.id, lessonId: lesson.id, key: `${mod.id}_${lesson.id}` });
      }
    }

    // For each user, find the index of their last completed lesson
    const userLastLessonIdx = new Map();
    for (const [userId, completedSet] of userCompletedMap) {
      let lastIdx = -1;
      for (let i = 0; i < orderedLessons.length; i++) {
        if (completedSet.has(orderedLessons[i].key)) lastIdx = i;
      }
      if (lastIdx >= 0 && lastIdx < orderedLessons.length - 1) {
        // Student stopped here (didn't finish all lessons)
        userLastLessonIdx.set(userId, lastIdx);
      }
    }

    // Map quizId → lessonId and quizId → questions
    const quizToLesson = new Map();
    const quizQuestions = new Map();
    for (const q of quizDefs) {
      if (q.lessonId) quizToLesson.set(q.id, q.lessonId);
      if (q.questions) quizQuestions.set(q.id, q.questions);
    }

    // Build per-lesson quiz failure data
    // lessonKey → { totalAttempts, failedAttempts, questionFailures: Map<qIdx, {text, fails, total}> }
    const lessonQuizData = new Map();
    for (const resp of quizResponses) {
      const lessonId = resp.lessonId || quizToLesson.get(resp.quizId);
      if (!lessonId) continue;

      // Find the moduleId for this lessonId
      let moduleId = null;
      for (const mod of this._allModules) {
        if (mod.lessons.some((l) => l.id === lessonId)) { moduleId = mod.id; break; }
      }
      if (!moduleId) continue;

      const key = `${moduleId}_${lessonId}`;
      if (!lessonQuizData.has(key)) {
        lessonQuizData.set(key, { totalAttempts: 0, failedAttempts: 0, questionFailures: new Map() });
      }
      const data = lessonQuizData.get(key);
      data.totalAttempts++;

      const answers = resp.answers || [];
      let hasFailure = false;

      const questions = quizQuestions.get(resp.quizId) || [];
      for (let i = 0; i < answers.length; i++) {
        const ans = answers[i];
        let correct;
        if (typeof ans === 'object' && ans !== null && 'isCorrect' in ans) {
          // New format: { selectedIndex, isCorrect }
          correct = ans.isCorrect;
        } else {
          // Old format: plain string/index — compare against quiz definition
          const qDef = questions[i];
          if (qDef && qDef.correctAnswer !== undefined) {
            const selected = typeof ans === 'string' ? parseInt(ans, 10) : ans;
            correct = !isNaN(selected) && selected === qDef.correctAnswer;
          } else {
            correct = undefined; // Can't determine — skip
          }
        }
        if (correct === false) hasFailure = true;

        if (!data.questionFailures.has(i)) {
          const qText = questions[i]?.text || `Pregunta ${i + 1}`;
          data.questionFailures.set(i, { text: qText, fails: 0, total: 0 });
        }
        const qf = data.questionFailures.get(i);
        if (correct !== undefined) {
          qf.total++;
          if (correct === false) qf.fails++;
        }
      }
      if (hasFailure) data.failedAttempts++;
    }

    // Users lookup for detail panel
    const usersById = new Map();
    for (const u of users) {
      usersById.set(u.uid, u);
    }

    // Build heatmap data per module
    const heatmap = [];
    for (const mod of this._allModules) {
      const lessons = [];
      for (const lesson of mod.lessons) {
        const key = `${mod.id}_${lesson.id}`;
        const lessonIdx = orderedLessons.findIndex((l) => l.key === key);

        // Dropout: students whose last completed lesson is this one
        const droppedUsers = [];
        for (const [userId, lastIdx] of userLastLessonIdx) {
          if (lastIdx === lessonIdx) {
            const user = usersById.get(userId);
            droppedUsers.push({
              uid: userId,
              displayName: user?.displayName || user?.email || userId,
              email: user?.email || '',
            });
          }
        }
        const dropoutRate = totalStudents > 0 ? Math.round((droppedUsers.length / totalStudents) * 100) : 0;

        // Quiz failure rate
        const qd = lessonQuizData.get(key);
        const quizFailRate = qd && qd.totalAttempts > 0
          ? Math.round((qd.failedAttempts / qd.totalAttempts) * 100)
          : 0;

        // Most failed questions
        const failedQuestions = [];
        if (qd) {
          for (const [, qf] of qd.questionFailures) {
            if (qf.total > 0) {
              failedQuestions.push({ text: qf.text, failRate: Math.round((qf.fails / qf.total) * 100) });
            }
          }
          failedQuestions.sort((a, b) => b.failRate - a.failRate);
        }

        lessons.push({
          id: lesson.id,
          title: lesson.title,
          moduleId: mod.id,
          moduleTitle: mod.title,
          key,
          dropoutRate,
          dropoutCount: droppedUsers.length,
          droppedUsers,
          quizFailRate,
          failedQuestions,
        });
      }
      heatmap.push({ moduleId: mod.id, title: mod.title, lessons });
    }
    this._heatmapData = heatmap;
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

  _getHeatmapColor(value) {
    if (value === 0) return '#e2e8f0';
    if (value <= 10) return '#fef9c3';
    if (value <= 25) return '#fed7aa';
    if (value <= 50) return '#fca5a5';
    return '#ef4444';
  }

  _selectLesson(lesson) {
    this._selectedLesson = this._selectedLesson?.key === lesson.key ? null : lesson;
  }

  _renderHeatmap() {
    if (!this._heatmapData.length) return '';

    const mode = this._heatmapMode || 'dropout';

    return html`
      <div class="heatmap-section">
        <h3>Mapa de dificultad por lección</h3>

        <div class="heatmap-toggle">
          <button class="btn btn--small ${mode === 'dropout' ? 'btn--active' : 'btn--secondary'}"
            @click=${() => { this._heatmapMode = 'dropout'; this.requestUpdate(); }}>Tasa de abandono</button>
          <button class="btn btn--small ${mode === 'quizFail' ? 'btn--active' : 'btn--secondary'}"
            @click=${() => { this._heatmapMode = 'quizFail'; this.requestUpdate(); }}>Fallos en quiz</button>
        </div>

        ${this._heatmapData.map((mod) => html`
          <div class="heatmap-module">
            <div class="heatmap-module__title">${mod.title}</div>
            <div class="heatmap-grid">
              ${mod.lessons.map((lesson) => {
                const val = mode === 'dropout' ? lesson.dropoutRate : lesson.quizFailRate;
                const bg = this._getHeatmapColor(val);
                const isSelected = this._selectedLesson?.key === lesson.key;
                return html`
                  <div class="heatmap-cell ${isSelected ? 'heatmap-cell--selected' : ''}"
                    style="background: ${bg}"
                    title="${lesson.title}: ${val}%"
                    @click=${() => this._selectLesson(lesson)}>
                    <span class="heatmap-cell__value">${val}%</span>
                    <span class="heatmap-cell__label">${lesson.title.length > 8 ? lesson.title.slice(0, 7) + '…' : lesson.title}</span>
                  </div>
                `;
              })}
            </div>
          </div>
        `)}

        <div class="heatmap-legend">
          <span>0%</span>
          <div class="heatmap-legend__bar">
            <span style="background: #e2e8f0"></span>
            <span style="background: #fef9c3"></span>
            <span style="background: #fed7aa"></span>
            <span style="background: #fca5a5"></span>
            <span style="background: #ef4444"></span>
          </div>
          <span>50%+</span>
        </div>
      </div>

      ${this._selectedLesson ? this._renderDetailPanel() : ''}
    `;
  }

  _renderDetailPanel() {
    const l = this._selectedLesson;
    if (!l) return '';

    return html`
      <div class="detail-panel">
        <div class="detail-panel__header">
          <div class="detail-panel__title">${l.moduleTitle} — ${l.title}</div>
          <button class="detail-panel__close" @click=${() => { this._selectedLesson = null; }}>&times;</button>
        </div>

        <div class="detail-panel__stats">
          <div class="detail-stat ${l.dropoutRate > 25 ? 'detail-stat--red' : l.dropoutRate > 10 ? 'detail-stat--amber' : 'detail-stat--green'}">
            <div class="detail-stat__value">${l.dropoutRate}%</div>
            <div class="detail-stat__label">Tasa de abandono</div>
          </div>
          <div class="detail-stat">
            <div class="detail-stat__value">${l.dropoutCount}</div>
            <div class="detail-stat__label">Abandonos</div>
          </div>
          <div class="detail-stat ${l.quizFailRate > 50 ? 'detail-stat--red' : l.quizFailRate > 25 ? 'detail-stat--amber' : 'detail-stat--green'}">
            <div class="detail-stat__value">${l.quizFailRate}%</div>
            <div class="detail-stat__label">Fallos en quiz</div>
          </div>
        </div>

        ${l.droppedUsers.length > 0 ? html`
          <div class="detail-section">
            <h4>Estudiantes que abandonaron aquí</h4>
            <ul class="detail-list">
              ${l.droppedUsers.map((u) => html`
                <li>
                  <span class="status-dot status-dot--red"></span>
                  <span class="detail-list__name">${u.displayName}</span>
                  <span class="detail-list__meta">${u.email}</span>
                </li>
              `)}
            </ul>
          </div>
        ` : html`<div class="detail-section"><h4>Estudiantes que abandonaron aquí</h4><p style="font-size: 0.813rem; color: var(--color-text-muted, #94a3b8);">Ningún abandono en esta lección</p></div>`}

        ${l.failedQuestions.length > 0 ? html`
          <div class="detail-section">
            <h4>Preguntas con más fallos</h4>
            <div class="detail-list">
              ${l.failedQuestions.slice(0, 5).map((q) => html`
                <div class="detail-question">
                  <div class="detail-question__text">${q.text}</div>
                  <div class="detail-question__rate">${q.failRate}% de fallos</div>
                </div>
              `)}
            </div>
          </div>
        ` : html`<div class="detail-section"><h4>Preguntas con más fallos</h4><p style="font-size: 0.813rem; color: var(--color-text-muted, #94a3b8);">Sin datos de quiz para esta lección</p></div>`}
      </div>
    `;
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

      ${this._renderHeatmap()}

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
