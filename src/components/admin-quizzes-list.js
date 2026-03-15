import { LitElement, html, css } from 'lit';
import {
  fetchAllQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizResponses,
  validateQuiz,
} from '../lib/firebase/quizzes.js';
import { fetchAllUsers } from '../lib/firebase/users.js';
import { waitForAuth } from '../lib/auth-ready.js';
import { exportCsv } from '../lib/csv-export.js';
import { materialIconsLink } from './shared/material-icons.js';

/**
 * @element admin-quizzes-list
 * Admin panel for managing quizzes and viewing responses.
 */
export class AdminQuizzesList extends LitElement {
  static properties = {
    _quizzes: { type: Array, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
    _showForm: { type: Boolean, state: true },
    _editingId: { type: String, state: true },
    _formData: { type: Object, state: true },
    _formError: { type: String, state: true },
    _saving: { type: Boolean, state: true },
    _viewingResponses: { type: String, state: true },
    _responses: { type: Array, state: true },
    _showStats: { type: Object, state: true },
    _statsLoading: { type: Boolean, state: true },
    _statsData: { type: Object, state: true },
    _usersMap: { type: Object, state: true },
  };

  static styles = css`
    :host { display: block; }

    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; font-size: 0.813rem; font-weight: 600; font-family: inherit; cursor: pointer; transition: background-color 0.15s; }
    .btn--primary { background: linear-gradient(to right, #84cc16, #fb923c); color: #0f172a; }
    .btn--primary:hover { background: #d11111; }
    .btn--secondary { background: var(--color-bg-slate-100, #f1f5f9); color: var(--color-text-body, #334155); }
    .btn--secondary:hover { background: var(--color-border, #e2e8f0); }
    .btn--danger { background: var(--color-error-bg, #fef2f2); color: var(--color-error-text, #991b1b); }
    .btn--danger:hover { background: #fee2e2; }
    .btn--small { padding: 0.375rem 0.75rem; font-size: 0.75rem; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .quiz-card { background: var(--color-bg-white, #fff); border-radius: 0.75rem; padding: 1.25rem; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); margin-bottom: 1rem; }
    .quiz-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .quiz-title { font-size: 1rem; font-weight: 700; color: var(--color-text-primary, #0f172a); }
    .quiz-meta { font-size: 0.813rem; color: var(--color-text-muted, #64748b); }
    .quiz-actions { display: flex; gap: 0.5rem; }

    .responses-panel { border-top: 1px solid var(--color-bg-slate-100, #f1f5f9); margin-top: 1rem; padding-top: 1rem; }
    .response-item { background: var(--color-bg-slate-50, #f8fafc); padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 0.5rem; font-size: 0.875rem; }
    .response-user { font-weight: 600; color: var(--color-text-primary, #0f172a); margin-bottom: 0.25rem; }
    .response-answer { color: var(--color-text-body, #334155); }

    .form-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .form-card { background: var(--color-bg-white, #fff); border-radius: 0.75rem; padding: 2rem; width: 100%; max-width: 560px; box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25); max-height: 90vh; overflow-y: auto; }
    .form-card h3 { margin: 0 0 1.5rem; font-size: 1.125rem; font-weight: 700; color: var(--color-text-primary, #0f172a); }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.813rem; font-weight: 600; color: var(--color-text-body, #334155); margin-bottom: 0.375rem; }
    .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid var(--color-border, #e2e8f0); border-radius: 0.375rem; font-size: 0.875rem; font-family: inherit; box-sizing: border-box; }
    .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #84cc16; box-shadow: 0 0 0 3px rgba(132,204,22,0.1); }
    .form-error { color: var(--color-error-text, #991b1b); font-size: 0.813rem; margin-bottom: 1rem; }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; }

    .question-block { background: var(--color-bg-slate-50, #f8fafc); padding: 1rem; border-radius: 0.5rem; margin-bottom: 0.75rem; border: 1px solid var(--color-border, #e2e8f0); }
    .question-block-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .question-number { font-size: 0.75rem; font-weight: 700; color: var(--color-text-secondary, #475569); }

    .stats-summary { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .stats-card { background: var(--color-bg-slate-50, #f8fafc); border: 1px solid var(--color-border, #e2e8f0); border-radius: 0.5rem; padding: 1rem 1.25rem; flex: 1; min-width: 120px; text-align: center; }
    .stats-card__value { font-size: 1.5rem; font-weight: 800; color: var(--color-text-primary, #0f172a); }
    .stats-card__label { font-size: 0.75rem; color: var(--color-text-muted, #64748b); margin-top: 0.25rem; }

    .stats-question { margin-bottom: 1.25rem; }
    .stats-question__title { font-size: 0.875rem; font-weight: 700; color: var(--color-text-primary, #0f172a); margin-bottom: 0.5rem; }
    .stats-question__type { font-size: 0.75rem; color: var(--color-text-muted, #64748b); font-weight: 400; }
    .stats-bar { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.375rem; }
    .stats-bar__label { font-size: 0.813rem; color: var(--color-text-body, #334155); min-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .stats-bar__track { flex: 1; height: 1.25rem; background: var(--color-border, #e2e8f0); border-radius: 0.25rem; overflow: hidden; }
    .stats-bar__fill { height: 100%; background: linear-gradient(to right, #84cc16, #a3e635); border-radius: 0.25rem; transition: width 0.3s; }
    .stats-bar__count { font-size: 0.75rem; color: var(--color-text-muted, #64748b); min-width: 2.5rem; text-align: right; }

    .stats-students { margin-top: 1.5rem; }
    .stats-students__title { font-size: 0.938rem; font-weight: 700; color: var(--color-text-primary, #0f172a); margin-bottom: 0.75rem; }
    .stats-student { background: var(--color-bg-slate-50, #f8fafc); padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 0.5rem; border: 1px solid var(--color-border, #e2e8f0); }
    .stats-student__name { font-weight: 600; color: var(--color-text-primary, #0f172a); font-size: 0.875rem; margin-bottom: 0.375rem; }
    .stats-student__date { font-size: 0.75rem; color: var(--color-text-muted, #94a3b8); }
    .stats-student__answers { font-size: 0.813rem; color: var(--color-text-body, #334155); }
    .stats-student__answers div { margin-top: 0.25rem; }
    .stats-student__answer--correct { color: #15803d; }
    .stats-student__answer--incorrect { color: var(--color-error-text, #991b1b); }
    .stats-card--correct { border-color: #86efac; background: var(--color-success-bg, #f0fdf4); }
    .stats-card--correct .stats-card__value { color: #15803d; }
    .stats-card--incorrect { border-color: #fca5a5; background: var(--color-error-bg, #fef2f2); }
    .stats-card--incorrect .stats-card__value { color: var(--color-error-text, #991b1b); }
    .stats-bar__fill--correct { background: linear-gradient(to right, #22c55e, #86efac); }
    .stats-bar__fill--incorrect { background: linear-gradient(to right, #ef4444, #fca5a5); }

    .loading, .error-msg { text-align: center; padding: 3rem; color: var(--color-text-secondary, #475569); }
    .error-msg { color: var(--color-error-text, #991b1b); }
    .spinner { width: 1.5rem; height: 1.5rem; border: 3px solid var(--color-border, #e2e8f0); border-top-color: #84cc16; border-radius: 50%; animation: spin 0.6s linear infinite; margin: 0 auto 0.75rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { text-align: center; padding: 3rem; color: var(--color-text-muted, #64748b); }
  `;

  constructor() {
    super();
    this._quizzes = [];
    this._loading = true;
    this._error = '';
    this._showForm = false;
    this._editingId = null;
    this._formData = this._emptyForm();
    this._formError = '';
    this._saving = false;
    this._viewingResponses = null;
    this._responses = [];
    this._showStats = null;
    this._statsLoading = false;
    this._statsData = null;
    this._usersMap = {};
  }

  connectedCallback() {
    super.connectedCallback();
    waitForAuth().then(() => this._loadQuizzes());
  }

  _emptyForm() {
    return {
      title: '',
      moduleId: '',
      lessonId: '',
      questions: [{ text: '', type: 'open', options: [], explanation: '' }],
    };
  }

  async _loadQuizzes() {
    this._loading = true;
    const result = await fetchAllQuizzes();
    this._loading = false;
    if (result.success) { this._quizzes = result.quizzes; } else { this._error = result.error; }
  }

  _openCreate() {
    this._editingId = null;
    this._formData = this._emptyForm();
    this._formError = '';
    this._showForm = true;
  }

  _openEdit(quiz) {
    this._editingId = quiz.id;
    this._formData = {
      title: quiz.title || '',
      moduleId: quiz.moduleId || '',
      lessonId: quiz.lessonId || '',
      questions: (quiz.questions || []).map((q) => ({ ...q, options: q.options || [], explanation: q.explanation || '' })),
    };
    this._formError = '';
    this._showForm = true;
  }

  _closeForm() { this._showForm = false; this._editingId = null; this._formError = ''; }

  _handleInput(e) {
    const input = /** @type {HTMLInputElement} */ (e.target);
    this._formData = { ...this._formData, [input.name]: input.value };
  }

  _handleQuestionInput(index, field, value) {
    const questions = [...this._formData.questions];
    questions[index] = { ...questions[index], [field]: value };
    this._formData = { ...this._formData, questions };
  }

  _addQuestion() {
    if (this._formData.questions.length >= 3) return;
    this._formData = {
      ...this._formData,
      questions: [...this._formData.questions, { text: '', type: 'open', options: [], explanation: '' }],
    };
  }

  _removeQuestion(index) {
    const questions = this._formData.questions.filter((_, i) => i !== index);
    this._formData = { ...this._formData, questions };
  }

  async _handleSubmit(e) {
    e.preventDefault();
    this._formError = '';
    const validation = validateQuiz(this._formData);
    if (!validation.valid) { this._formError = validation.error; return; }

    this._saving = true;
    let result;
    if (this._editingId) {
      result = await updateQuiz(this._editingId, {
        title: this._formData.title.trim(),
        moduleId: this._formData.moduleId,
        lessonId: this._formData.lessonId || '',
        questions: this._formData.questions,
      });
    } else {
      result = await createQuiz(this._formData);
    }
    this._saving = false;
    if (result.success) { this._closeForm(); await this._loadQuizzes(); } else { this._formError = result.error; }
  }

  async _handleDelete(quizId) {
    const result = await deleteQuiz(quizId);
    if (result.success) await this._loadQuizzes();
  }

  _exportResponses(quiz) {
    const responses = this._statsData?.responses || this._responses;
    const questionCount = quiz.questions?.length || 0;
    const headers = ['Usuario', 'Fecha', ...Array.from({ length: questionCount }, (_, i) => `Pregunta ${i + 1}`)];
    const rows = responses.map((r) => [
      this._getUserName(r.userId),
      this._formatDate(r.completedAt),
      ...Array.from({ length: questionCount }, (_, i) => r.answers[i] || ''),
    ]);
    const safeName = quiz.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    exportCsv(headers, rows, `quiz_${safeName}.csv`);
  }

  async _toggleResponses(quizId) {
    if (this._viewingResponses === quizId) { this._viewingResponses = null; return; }
    this._viewingResponses = quizId;
    const result = await getQuizResponses(quizId);
    this._responses = result.success ? result.responses : [];
  }

  async _openStats(quiz) {
    this._showStats = quiz;
    this._statsLoading = true;
    this._statsData = null;

    try {
      const [responsesResult, usersResult] = await Promise.all([
        getQuizResponses(quiz.id),
        Object.keys(this._usersMap).length === 0 ? fetchAllUsers() : Promise.resolve(null),
      ]);

      if (usersResult?.success) {
        const map = {};
        for (const u of usersResult.users) { map[u.uid] = u.displayName || u.email; }
        this._usersMap = map;
      }

      if (responsesResult.success) {
        const responses = responsesResult.responses;
        const questions = quiz.questions || [];
        let totalCorrect = 0;
        let totalGraded = 0;

        const questionStats = questions.map((q, i) => {
          const answers = responses.map((r) => (r.answers || [])[i] || '').filter(Boolean);
          if (q.type === 'multiple') {
            const counts = {};
            for (const opt of q.options || []) { counts[opt] = 0; }
            let qCorrect = 0;
            for (const a of answers) {
              counts[a] = (counts[a] || 0) + 1;
              if (q.correctAnswer && a === q.correctAnswer) qCorrect++;
            }
            if (q.correctAnswer) {
              totalCorrect += qCorrect;
              totalGraded += answers.length;
            }
            return { ...q, index: i, distribution: counts, totalAnswered: answers.length, correctCount: qCorrect, incorrectCount: answers.length - qCorrect };
          }
          return { ...q, index: i, openAnswers: answers, totalAnswered: answers.length };
        });

        const totalIncorrect = totalGraded - totalCorrect;
        const correctPct = totalGraded > 0 ? Math.round((totalCorrect / totalGraded) * 100) : 0;
        const incorrectPct = totalGraded > 0 ? 100 - correctPct : 0;

        this._statsData = { totalResponses: responses.length, questionStats, responses, totalCorrect, totalIncorrect, totalGraded, correctPct, incorrectPct };
      }
    } catch {
      this._statsData = null;
    } finally {
      this._statsLoading = false;
    }
  }

  _closeStats() { this._showStats = null; this._statsData = null; }

  _formatDate(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  _getUserName(userId) {
    return this._usersMap[userId] || userId;
  }

  render() {
    if (this._loading) return html`<div class="loading"><div class="spinner"></div><p>Cargando quizzes...</p></div>`;
    if (this._error) return html`<div class="error-msg">${this._error}</div>`;

    return html`
      ${materialIconsLink}
      <div class="toolbar">
        <span>${this._quizzes.length} quiz${this._quizzes.length !== 1 ? 'zes' : ''}</span>
        <button class="btn btn--primary" @click=${this._openCreate}>
          <span class="material-symbols-outlined">add</span> Nuevo quiz
        </button>
      </div>

      ${this._quizzes.length === 0
        ? html`<div class="empty-state"><p>No hay quizzes creados</p></div>`
        : this._quizzes.map((q) => this._renderQuiz(q))}

      ${this._showForm ? this._renderForm() : ''}
      ${this._showStats ? this._renderStatsModal() : ''}
    `;
  }

  _renderStatsModal() {
    const quiz = this._showStats;
    return html`
      <div class="form-overlay" @click=${this._closeStats}>
        <div class="form-card" @click=${(e) => e.stopPropagation()} style="max-width: 700px;">
          <h3>Estadísticas: ${quiz.title}</h3>

          ${this._statsLoading ? html`
            <div class="loading"><div class="spinner"></div><p>Cargando estadísticas...</p></div>
          ` : !this._statsData ? html`
            <div class="error-msg">Error al cargar las estadísticas</div>
          ` : this._statsData.totalResponses === 0 ? html`
            <div class="empty-state"><p>Aún no hay respuestas para este quiz</p></div>
          ` : html`
            <div class="stats-summary">
              <div class="stats-card">
                <div class="stats-card__value">${this._statsData.totalResponses}</div>
                <div class="stats-card__label">Respuestas totales</div>
              </div>
              <div class="stats-card">
                <div class="stats-card__value">${quiz.questions?.length || 0}</div>
                <div class="stats-card__label">Preguntas</div>
              </div>
              ${this._statsData.totalGraded > 0 ? html`
                <div class="stats-card stats-card--correct">
                  <div class="stats-card__value">${this._statsData.totalCorrect} (${this._statsData.correctPct}%)</div>
                  <div class="stats-card__label">Correctas</div>
                </div>
                <div class="stats-card stats-card--incorrect">
                  <div class="stats-card__value">${this._statsData.totalIncorrect} (${this._statsData.incorrectPct}%)</div>
                  <div class="stats-card__label">Incorrectas</div>
                </div>
              ` : ''}
            </div>

            ${this._statsData.questionStats.map((qs) => this._renderQuestionStats(qs))}

            <div class="stats-students">
              <div class="stats-students__title">Respuestas por estudiante (${this._statsData.totalResponses})</div>
              ${this._statsData.responses.map((r) => html`
                <div class="stats-student">
                  <div class="stats-student__name">
                    ${this._getUserName(r.userId)}
                    <span class="stats-student__date">${this._formatDate(r.completedAt)}</span>
                  </div>
                  <div class="stats-student__answers">
                    ${(r.answers || []).map((a, i) => {
                      const q = (this._showStats.questions || [])[i];
                      const hasCorrect = q?.type === 'multiple' && q?.correctAnswer;
                      const isCorrect = hasCorrect && a === q.correctAnswer;
                      const cssClass = hasCorrect ? (isCorrect ? 'stats-student__answer--correct' : 'stats-student__answer--incorrect') : '';
                      return html`
                        <div class="${cssClass}"><strong>P${i + 1}:</strong> ${a} ${hasCorrect ? (isCorrect ? '✓' : '✗') : ''}</div>
                      `;
                    })}
                  </div>
                </div>
              `)}
            </div>
          `}

          <div class="form-actions">
            <button class="btn btn--secondary" @click=${this._closeStats}>Cerrar</button>
            ${this._statsData?.totalResponses > 0 ? html`
              <button class="btn btn--primary" @click=${() => this._exportResponses(quiz)}>
                <span class="material-symbols-outlined" style="font-size: 0.875rem;">download</span> Exportar CSV
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  _renderQuestionStats(qs) {
    const total = qs.totalAnswered;
    return html`
      <div class="stats-question">
        <div class="stats-question__title">
          P${qs.index + 1}: ${qs.text}
          <span class="stats-question__type">(${qs.type === 'multiple' ? 'Selección múltiple' : 'Respuesta abierta'})</span>
        </div>
        ${qs.type === 'multiple' && qs.distribution ? html`
          ${qs.correctAnswer && total > 0 ? html`
            <div style="font-size: 0.813rem; color: var(--color-text-muted, #64748b); margin-bottom: 0.5rem;">
              Correctas: <strong style="color: #15803d;">${qs.correctCount}/${total} (${Math.round((qs.correctCount / total) * 100)}%)</strong>
              · Incorrectas: <strong style="color: var(--color-error-text, #991b1b);">${qs.incorrectCount}/${total} (${Math.round((qs.incorrectCount / total) * 100)}%)</strong>
            </div>
          ` : ''}
          ${Object.entries(qs.distribution).map(([option, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const isCorrect = qs.correctAnswer === option;
            return html`
              <div class="stats-bar">
                <span class="stats-bar__label" title="${option}">${option} ${isCorrect ? '✓' : ''}</span>
                <div class="stats-bar__track">
                  <div class="stats-bar__fill ${isCorrect ? 'stats-bar__fill--correct' : qs.correctAnswer ? 'stats-bar__fill--incorrect' : ''}" style="width: ${pct}%"></div>
                </div>
                <span class="stats-bar__count">${count} (${pct}%)</span>
              </div>
            `;
          })}
        ` : html`
          <div style="font-size: 0.813rem; color: var(--color-text-muted, #64748b);">${total} respuesta${total !== 1 ? 's' : ''} recibida${total !== 1 ? 's' : ''}</div>
        `}
      </div>
    `;
  }

  _renderQuiz(q) {
    const isViewing = this._viewingResponses === q.id;
    return html`
      <div class="quiz-card">
        <div class="quiz-header">
          <span class="quiz-title">${q.title}</span>
          <div class="quiz-actions">
            <button class="btn btn--secondary btn--small" @click=${() => this._openEdit(q)}>Editar</button>
            <button class="btn btn--secondary btn--small" @click=${() => this._openStats(q)}>
              <span class="material-symbols-outlined" style="font-size: 0.875rem;">bar_chart</span> Estadísticas
            </button>
            <button class="btn btn--secondary btn--small" @click=${() => this._toggleResponses(q.id)}>
              ${isViewing ? 'Ocultar' : 'Respuestas'}
            </button>
            <button class="btn btn--danger btn--small" @click=${() => this._handleDelete(q.id)}>Eliminar</button>
          </div>
        </div>
        <div class="quiz-meta">${q.questions?.length || 0} preguntas · Módulo: ${q.moduleId}</div>

        ${isViewing ? html`
          <div class="responses-panel">
            ${this._responses.length > 0 ? html`
              <div style="margin-bottom: 0.75rem;">
                <button class="btn btn--secondary btn--small" @click=${() => this._exportResponses(q)}>
                  <span class="material-symbols-outlined" style="font-size: 0.875rem;">download</span>
                  Exportar resultados
                </button>
              </div>
            ` : ''}
            ${this._responses.length === 0
              ? html`<p class="quiz-meta">Sin respuestas aún</p>`
              : this._responses.map((r) => html`
                  <div class="response-item">
                    <div class="response-user">${r.userId}</div>
                    ${r.answers.map((a, i) => html`<div class="response-answer"><strong>P${i + 1}:</strong> ${a}</div>`)}
                  </div>
                `)}
          </div>
        ` : ''}
      </div>
    `;
  }

  _renderForm() {
    return html`
      <div class="form-overlay" @click=${this._closeForm}>
        <div class="form-card" @click=${(e) => e.stopPropagation()}>
          <h3>${this._editingId ? 'Editar quiz' : 'Nuevo quiz'}</h3>
          <form @submit=${this._handleSubmit}>
            <div class="form-group">
              <label for="quiz-title">Título</label>
              <input id="quiz-title" name="title" type="text" .value=${this._formData.title} @input=${this._handleInput} required />
            </div>
            <div class="form-group">
              <label for="quiz-module">ID del Módulo</label>
              <input id="quiz-module" name="moduleId" type="text" .value=${this._formData.moduleId} @input=${this._handleInput} required />
            </div>
            <div class="form-group">
              <label for="quiz-lesson">ID de la Clase (opcional)</label>
              <input id="quiz-lesson" name="lessonId" type="text" .value=${this._formData.lessonId} @input=${this._handleInput} />
            </div>

            <h4 style="margin: 1rem 0 0.75rem; font-size: 0.875rem; color: var(--color-text-primary, #0f172a);">Preguntas</h4>
            ${this._formData.questions.map((q, i) => html`
              <div class="question-block">
                <div class="question-block-header">
                  <span class="question-number">Pregunta ${i + 1}</span>
                  ${this._formData.questions.length > 1 ? html`
                    <button type="button" class="btn btn--danger btn--small" @click=${() => this._removeQuestion(i)}>Quitar</button>
                  ` : ''}
                </div>
                <div class="form-group">
                  <input type="text" .value=${q.text} @input=${(e) => this._handleQuestionInput(i, 'text', e.target.value)} placeholder="Texto de la pregunta" required />
                </div>
                <div class="form-group">
                  <select .value=${q.type} @change=${(e) => this._handleQuestionInput(i, 'type', e.target.value)}>
                    <option value="open">Respuesta abierta</option>
                    <option value="multiple">Selección múltiple</option>
                  </select>
                </div>
                ${q.type === 'multiple' ? html`
                  <div class="form-group">
                    <label>Opciones (una por línea)</label>
                    <textarea
                      .value=${(q.options || []).join('\n')}
                      @input=${(e) => this._handleQuestionInput(i, 'options', e.target.value.split('\n').filter(Boolean))}
                      placeholder="Opción A\nOpción B\nOpción C"
                      rows="3"
                    ></textarea>
                  </div>
                  <div class="form-group">
                    <label>Respuesta correcta</label>
                    <select .value=${q.correctAnswer || ''} @change=${(e) => this._handleQuestionInput(i, 'correctAnswer', e.target.value)}>
                      <option value="">-- Seleccionar --</option>
                      ${(q.options || []).map((opt) => html`<option value=${opt} ?selected=${q.correctAnswer === opt}>${opt}</option>`)}
                    </select>
                  </div>
                ` : ''}
                <div class="form-group">
                  <label>Explicación (opcional)</label>
                  <textarea
                    .value=${q.explanation || ''}
                    @input=${(e) => this._handleQuestionInput(i, 'explanation', e.target.value)}
                    placeholder="Explicación que se mostrará al alumno tras responder"
                    rows="2"
                  ></textarea>
                </div>
              </div>
            `)}

            ${this._formData.questions.length < 3 ? html`
              <button type="button" class="btn btn--secondary" @click=${this._addQuestion} style="margin-bottom: 1rem;">
                + Añadir pregunta
              </button>
            ` : html`
              <p style="font-size: 0.813rem; color: var(--color-text-muted, #94a3b8); margin-bottom: 1rem;">Máximo 3 preguntas por quiz</p>
            `}

            ${this._formError ? html`<div class="form-error">${this._formError}</div>` : ''}
            <div class="form-actions">
              <button type="button" class="btn btn--secondary" @click=${this._closeForm}>Cancelar</button>
              <button type="submit" class="btn btn--primary" ?disabled=${this._saving}>${this._saving ? 'Guardando...' : this._editingId ? 'Guardar' : 'Crear'}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
}

customElements.define('admin-quizzes-list', AdminQuizzesList);
