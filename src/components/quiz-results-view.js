import { LitElement, html, css } from 'lit';
import { getUserQuizResults } from '../lib/firebase/quizzes.js';
import { waitForAuth } from '../lib/auth-ready.js';
import { materialIconsLink } from './shared/material-icons.js';

/**
 * @element quiz-results-view
 * Shows a student's completed quizzes with expandable detail per quiz.
 */
export class QuizResultsView extends LitElement {
  static properties = {
    _results: { type: Array, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
    _expandedQuiz: { type: String, state: true },
  };

  static styles = css`
    :host {
      display: block;
    }

    .results-header {
      margin-bottom: 1.5rem;
    }

    .results-header h2 {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--color-text-primary, #0f172a);
      margin-bottom: 0.25rem;
    }

    .results-header p {
      color: var(--color-text-muted, #64748b);
      font-size: 0.875rem;
    }

    .quiz-card {
      background: var(--color-bg-white, #fff);
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      margin-bottom: 0.75rem;
      overflow: hidden;
    }

    .quiz-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      cursor: pointer;
      transition: background-color 0.15s;
    }

    .quiz-card__header:hover {
      background-color: var(--color-bg-slate-50, #f8fafc);
    }

    .quiz-card__title {
      font-weight: 600;
      color: var(--color-text-primary, #0f172a);
      font-size: 0.938rem;
    }

    .quiz-card__meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .quiz-card__date {
      font-size: 0.75rem;
      color: var(--color-text-muted, #94a3b8);
    }

    .quiz-card__toggle {
      font-size: 1.25rem;
      color: var(--color-text-muted, #94a3b8);
      transition: transform 0.2s;
    }

    .quiz-card__toggle--open {
      transform: rotate(180deg);
    }

    .quiz-detail {
      border-top: 1px solid var(--color-bg-slate-100, #f1f5f9);
      padding: 1rem 1.25rem;
    }

    .question-block {
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-bg-slate-100, #f1f5f9);
    }

    .question-block:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }

    .question-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-muted, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.025em;
      margin-bottom: 0.25rem;
    }

    .question-text {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-primary, #0f172a);
      margin-bottom: 0.5rem;
    }

    .answer-row {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.813rem;
      padding: 0.25rem 0;
    }

    .answer-row .material-symbols-outlined {
      font-size: 1rem;
      margin-top: 0.1rem;
    }

    .answer--user {
      color: var(--color-text-body, #334155);
    }

    .answer--correct {
      color: #15803d;
    }

    .answer--correct .material-symbols-outlined {
      color: #15803d;
    }

    .option-item {
      font-size: 0.813rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      margin-bottom: 0.25rem;
    }

    .option-item--selected {
      background: #eff6ff;
      color: #1e40af;
      font-weight: 600;
    }

    .option-item--correct {
      background: var(--color-success-bg, #f0fdf4);
      color: #15803d;
      font-weight: 600;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 2rem;
      color: var(--color-text-muted, #94a3b8);
    }

    .empty-state .material-symbols-outlined {
      font-size: 3rem;
      display: block;
      margin-bottom: 0.75rem;
    }

    .empty-state p {
      font-size: 0.938rem;
    }

    .loading {
      text-align: center;
      padding: 3rem;
      color: var(--color-text-secondary, #475569);
    }

    .spinner {
      width: 1.5rem;
      height: 1.5rem;
      border: 3px solid var(--color-border, #e2e8f0);
      border-top-color: #84cc16;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin: 0 auto 0.75rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-msg {
      background: var(--color-error-bg, #fef2f2);
      color: var(--color-error-text, #991b1b);
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      border: 1px solid var(--color-error-border, #fecaca);
    }

    .badge {
      font-size: 0.688rem;
      font-weight: 700;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      background: var(--color-success-bg, #f0fdf4);
      color: #15803d;
    }

    @media (max-width: 640px) {
      .quiz-card { padding: 1rem; }
      .quiz-card__header { flex-direction: column; gap: 0.5rem; }
    }

    /* Focus indicators */
    button:focus-visible,
    a:focus-visible,
    select:focus-visible,
    input:focus-visible,
    textarea:focus-visible {
      outline: 3px solid var(--color-primary, #84cc16);
      outline-offset: 2px;
    }
  `;

  constructor() {
    super();
    this._results = [];
    this._loading = true;
    this._error = '';
    this._expandedQuiz = null;
  }

  connectedCallback() {
    super.connectedCallback();
    waitForAuth().then((user) => this._loadResults(user));
  }

  async _loadResults(user) {
    this._loading = true;
    this._error = '';

    const result = await getUserQuizResults(user.uid);

    if (result.success) {
      this._results = result.results;
    } else {
      this._error = result.error;
    }

    this._loading = false;
  }

  render() {
    if (this._loading) {
      return html`<div class="loading" role="status"><div class="spinner"></div><p>Cargando resultados...</p></div>`;
    }

    if (this._error) {
      return html`<div class="error-msg">${this._error}</div>`;
    }

    return html`
      ${materialIconsLink}
      <div class="results-header">
        <h2>Mis resultados de quizzes</h2>
        <p>${this._results.length > 0
          ? `Has completado ${this._results.length} quiz${this._results.length !== 1 ? 'zes' : ''}`
          : ''}</p>
      </div>

      ${this._results.length === 0
        ? html`
            <div class="empty-state">
              <span class="material-symbols-outlined">quiz</span>
              <p>Aún no has completado ningún quiz.</p>
              <p>Completa las lecciones del curso para desbloquear quizzes.</p>
            </div>
          `
        : html`<div role="list" aria-label="Resultados de quizzes">${this._results.map((r) => this._renderQuizCard(r))}</div>`}
    `;
  }

  _renderQuizCard(result) {
    const isExpanded = this._expandedQuiz === result.responseId;

    return html`
      <div class="quiz-card">
        <div
          class="quiz-card__header"
          @click=${() => this._toggleQuiz(result.responseId)}
        >
          <span class="quiz-card__title">${result.quizTitle}</span>
          <div class="quiz-card__meta">
            <span class="badge">Completado</span>
            <span class="quiz-card__date">${this._formatDate(result.completedAt)}</span>
            <span class="material-symbols-outlined quiz-card__toggle ${isExpanded ? 'quiz-card__toggle--open' : ''}">
              expand_more
            </span>
          </div>
        </div>

        ${isExpanded
          ? html`
              <div class="quiz-detail">
                ${result.questions.map((q, i) =>
                  this._renderQuestionDetail(q, result.userAnswers[i], i + 1),
                )}
              </div>
            `
          : ''}
      </div>
    `;
  }

  _renderQuestionDetail(question, userAnswer, number) {
    return html`
      <div class="question-block">
        <div class="question-label">Pregunta ${number}</div>
        <div class="question-text">${question.text}</div>

        ${question.type === 'multiple' && question.options
          ? html`
              ${question.options.map(
                (opt) => html`
                  <div
                    class="option-item ${opt === userAnswer ? 'option-item--selected' : ''}"
                  >
                    ${opt === userAnswer ? '▸ ' : ''}${opt}
                  </div>
                `,
              )}
            `
          : html`
              <div class="answer-row answer--user">
                <span class="material-symbols-outlined">edit</span>
                <span><strong>Tu respuesta:</strong> ${userAnswer || '(sin respuesta)'}</span>
              </div>
            `}
      </div>
    `;
  }

  _toggleQuiz(responseId) {
    this._expandedQuiz = this._expandedQuiz === responseId ? null : responseId;
  }

  _formatDate(ts) {
    if (!ts) return '';
    if (ts.toDate) return ts.toDate().toLocaleDateString('es-ES');
    if (typeof ts === 'string') return new Date(ts).toLocaleDateString('es-ES');
    return '';
  }
}

customElements.define('quiz-results-view', QuizResultsView);
