import { LitElement, html, css } from 'lit';
import { fetchQuestionsByLesson, createQuestion } from '../lib/firebase/questions.js';
import { waitForAuth } from '../lib/auth-ready.js';
import { stateStyles } from '../lib/shared-styles.js';
import { materialIconsLink } from './shared/material-icons.js';

/**
 * @element lesson-qa
 * Q&A section for a lesson, allowing students to ask questions.
 */
export class LessonQA extends LitElement {
  static properties = {
    lessonId: { type: String },
    moduleId: { type: String },
    userId: { type: String },
    userName: { type: String },
    _questions: { type: Array, state: true },
    _loading: { type: Boolean, state: true },
    _newQuestion: { type: String, state: true },
    _submitting: { type: Boolean, state: true },
    _error: { type: String, state: true },
  };

  static styles = [stateStyles, css`
    :host { display: block; margin-top: 2rem; }

    h3 { font-size: 1.125rem; font-weight: 700; color: #0f172a; margin: 0 0 1rem; }

    .qa-form { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
    .qa-form textarea {
      flex: 1;
      padding: 0.625rem 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-family: inherit;
      resize: vertical;
      min-height: 2.5rem;
    }
    .qa-form textarea:focus { outline: none; border-color: #84cc16; box-shadow: 0 0 0 3px rgba(132,204,22,0.1); }

    .btn { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; font-size: 0.813rem; font-weight: 600; font-family: inherit; cursor: pointer; transition: background-color 0.15s; }
    .btn--primary { background: linear-gradient(to right, #84cc16, #fb923c); color: #0f172a; align-self: flex-end; }
    .btn--primary:hover { background: #d11111; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .question-item {
      background: #fff;
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 0.75rem;
      box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
      border-left: 3px solid #84cc16;
    }

    .question-text { font-size: 0.938rem; color: #0f172a; margin-bottom: 0.375rem; }
    .question-meta { font-size: 0.75rem; color: #94a3b8; }
    .privacy-badge { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.688rem; color: #64748b; background: #f1f5f9; padding: 0.125rem 0.5rem; border-radius: 9999px; margin-left: 0.5rem; }
    .privacy-badge .material-symbols-outlined { font-size: 0.75rem; }

    .answer-list { margin-top: 0.5rem; padding-left: 1rem; border-left: 2px solid #e2e8f0; }
    .answer-item { padding: 0.5rem 0; }
    .answer-text { font-size: 0.875rem; color: #334155; }
    .answer-meta { font-size: 0.688rem; color: #94a3b8; margin-top: 0.125rem; }

    .empty-state { text-align: center; padding: 2rem; color: #94a3b8; font-size: 0.875rem; }
    .loading { text-align: center; padding: 1rem; color: #94a3b8; font-size: 0.875rem; }
  `];

  constructor() {
    super();
    this.lessonId = '';
    this.moduleId = '';
    this.userId = '';
    this.userName = '';
    this._questions = [];
    this._loading = true;
    this._newQuestion = '';
    this._submitting = false;
    this._error = '';
  }

  connectedCallback() {
    super.connectedCallback();
    waitForAuth().then(() => {
      if (this.lessonId) this._loadQuestions();
    });
  }

  async _loadQuestions() {
    this._loading = true;
    this._error = '';
    const result = await fetchQuestionsByLesson(this.lessonId, this.userId);
    this._loading = false;
    if (result.success) {
      this._questions = result.questions;
    } else {
      this._error = result.error || 'Error al cargar las preguntas';
    }
  }

  async _handleSubmit(e) {
    e.preventDefault();
    if (!this._newQuestion.trim() || !this.userId) return;

    this._submitting = true;
    const result = await createQuestion({
      text: this._newQuestion,
      userId: this.userId,
      userName: this.userName,
      lessonId: this.lessonId,
      moduleId: this.moduleId,
    });
    this._submitting = false;

    if (result.success) {
      this._newQuestion = '';
      await this._loadQuestions();
    }
  }

  render() {
    return html`
      ${materialIconsLink}
      <h3>Preguntas y respuestas</h3>

      ${this.userId ? html`
        <form class="qa-form" @submit=${this._handleSubmit}>
          <textarea
            placeholder="Escribe tu pregunta sobre esta clase..."
            .value=${this._newQuestion}
            @input=${(e) => { this._newQuestion = e.target.value; }}
            rows="2"
          ></textarea>
          <button type="submit" class="btn btn--primary" ?disabled=${this._submitting || !this._newQuestion.trim()}>
            ${this._submitting ? 'Enviando...' : 'Preguntar'}
          </button>
        </form>
      ` : ''}

      ${this._loading ? html`<div class="loading">Cargando preguntas...</div>` : ''}

      ${!this._loading && this._error ? html`
        <div class="state-error">
          <p>${this._error}</p>
          <button class="state-retry-btn" @click=${this._loadQuestions}>
            <span class="material-symbols-outlined">refresh</span>
            Reintentar
          </button>
        </div>
      ` : ''}

      ${!this._loading && !this._error && this._questions.length === 0
        ? html`<div class="empty-state">No hay preguntas aún. Sé el primero en preguntar.</div>`
        : ''}

      ${this._questions.map((q) => html`
        <div class="question-item">
          <div class="question-text">${q.text}</div>
          <div class="question-meta">
            ${q.userName || 'Anónimo'} · ${this._formatDate(q.createdAt)}
            ${q.userId === this.userId && q.public !== true ? html`
              <span class="privacy-badge">
                <span class="material-symbols-outlined">lock</span>Solo tú y el profesor
              </span>
            ` : ''}
          </div>
          ${q.answers && q.answers.length > 0 ? html`
            <div class="answer-list">
              ${q.answers.map((a) => html`
                <div class="answer-item">
                  <div class="answer-text">${a.text}</div>
                  <div class="answer-meta">${a.userName || 'Admin'} · ${a.createdAt || ''}</div>
                </div>
              `)}
            </div>
          ` : ''}
        </div>
      `)}
    `;
  }

  _formatDate(ts) {
    if (!ts) return '';
    if (ts.toDate) return ts.toDate().toLocaleDateString('es-ES');
    if (typeof ts === 'string') return new Date(ts).toLocaleDateString('es-ES');
    return '';
  }
}

customElements.define('lesson-qa', LessonQA);
