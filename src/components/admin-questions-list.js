import { LitElement, html, css } from 'lit';
import { fetchAllQuestions, addAnswer, deleteQuestion } from '../lib/firebase/questions.js';
import { waitForAuth } from '../lib/auth-ready.js';

/**
 * @element admin-questions-list
 * Admin panel for managing Q&A questions and providing answers.
 */
export class AdminQuestionsList extends LitElement {
  static properties = {
    _questions: { type: Array, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
    _filter: { type: String, state: true },
    _answeringId: { type: String, state: true },
    _answerText: { type: String, state: true },
    _submitting: { type: Boolean, state: true },
  };

  static styles = css`
    :host { display: block; }

    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem; }
    .toolbar-count { font-size: 0.875rem; color: #64748b; }
    .filter-group { display: flex; gap: 0.375rem; }

    .btn { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; font-size: 0.813rem; font-weight: 600; font-family: inherit; cursor: pointer; transition: background-color 0.15s; }
    .btn--primary { background: #ec1313; color: #fff; }
    .btn--primary:hover { background: #d11111; }
    .btn--secondary { background: #f1f5f9; color: #334155; }
    .btn--secondary:hover { background: #e2e8f0; }
    .btn--danger { background: #fef2f2; color: #991b1b; }
    .btn--danger:hover { background: #fee2e2; }
    .btn--small { padding: 0.375rem 0.75rem; font-size: 0.75rem; }
    .btn--active { background: #0f172a; color: #fff; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .question-card { background: #fff; border-radius: 0.75rem; padding: 1.25rem; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); margin-bottom: 1rem; }
    .question-card--pending { border-left: 4px solid #f59e0b; }
    .question-card--answered { border-left: 4px solid #22c55e; }

    .question-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
    .question-text { font-size: 0.938rem; font-weight: 600; color: #0f172a; flex: 1; }
    .question-actions { display: flex; gap: 0.5rem; flex-shrink: 0; margin-left: 1rem; }

    .question-meta { font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.5rem; }
    .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.688rem; font-weight: 600; margin-left: 0.5rem; }
    .badge--pending { background: #fef3c7; color: #92400e; }
    .badge--answered { background: #dcfce7; color: #166534; }

    .answers-section { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #f1f5f9; }
    .answer-item { background: #f8fafc; padding: 0.75rem; border-radius: 0.375rem; margin-bottom: 0.5rem; }
    .answer-text { font-size: 0.875rem; color: #334155; }
    .answer-meta { font-size: 0.688rem; color: #94a3b8; margin-top: 0.25rem; }

    .answer-form { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
    .answer-form textarea { flex: 1; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.375rem; font-size: 0.875rem; font-family: inherit; resize: vertical; min-height: 2.5rem; }
    .answer-form textarea:focus { outline: none; border-color: #ec1313; box-shadow: 0 0 0 3px rgba(236,19,19,0.1); }

    .loading, .error-msg { text-align: center; padding: 3rem; color: #475569; }
    .error-msg { color: #991b1b; }
    .spinner { width: 1.5rem; height: 1.5rem; border: 3px solid #e2e8f0; border-top-color: #ec1313; border-radius: 50%; animation: spin 0.6s linear infinite; margin: 0 auto 0.75rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { text-align: center; padding: 3rem; color: #64748b; }
  `;

  constructor() {
    super();
    this._questions = [];
    this._loading = true;
    this._error = '';
    this._filter = 'all';
    this._answeringId = null;
    this._answerText = '';
    this._submitting = false;
  }

  connectedCallback() {
    super.connectedCallback();
    waitForAuth().then(() => this._loadQuestions());
  }

  async _loadQuestions() {
    this._loading = true;
    const result = await fetchAllQuestions();
    this._loading = false;
    if (result.success) {
      this._questions = result.questions;
    } else {
      this._error = result.error;
    }
  }

  _isPending(q) {
    return !q.answers || q.answers.length === 0;
  }

  get _filteredQuestions() {
    if (this._filter === 'pending') return this._questions.filter((q) => this._isPending(q));
    if (this._filter === 'answered') return this._questions.filter((q) => !this._isPending(q));
    return this._questions;
  }

  _toggleAnswer(id) {
    if (this._answeringId === id) {
      this._answeringId = null;
      this._answerText = '';
    } else {
      this._answeringId = id;
      this._answerText = '';
    }
  }

  async _submitAnswer(questionId) {
    if (!this._answerText.trim()) return;
    this._submitting = true;
    const result = await addAnswer(questionId, {
      text: this._answerText,
      userId: 'admin',
      userName: 'Administrador',
    });
    this._submitting = false;
    if (result.success) {
      this._answeringId = null;
      this._answerText = '';
      await this._loadQuestions();
    }
  }

  async _handleDelete(id) {
    const result = await deleteQuestion(id);
    if (result.success) await this._loadQuestions();
  }

  render() {
    if (this._loading) return html`<div class="loading"><div class="spinner"></div><p>Cargando preguntas...</p></div>`;
    if (this._error) return html`<div class="error-msg">${this._error}</div>`;

    const pending = this._questions.filter((q) => this._isPending(q)).length;
    const filtered = this._filteredQuestions;

    return html`
      <div class="toolbar">
        <span class="toolbar-count">${this._questions.length} preguntas · ${pending} pendientes</span>
        <div class="filter-group">
          <button class="btn btn--small ${this._filter === 'all' ? 'btn--active' : 'btn--secondary'}" @click=${() => { this._filter = 'all'; }}>Todas</button>
          <button class="btn btn--small ${this._filter === 'pending' ? 'btn--active' : 'btn--secondary'}" @click=${() => { this._filter = 'pending'; }}>Pendientes</button>
          <button class="btn btn--small ${this._filter === 'answered' ? 'btn--active' : 'btn--secondary'}" @click=${() => { this._filter = 'answered'; }}>Respondidas</button>
        </div>
      </div>

      ${filtered.length === 0
        ? html`<div class="empty-state"><p>No hay preguntas${this._filter !== 'all' ? ` ${this._filter === 'pending' ? 'pendientes' : 'respondidas'}` : ''}</p></div>`
        : filtered.map((q) => this._renderQuestion(q))}
    `;
  }

  _renderQuestion(q) {
    const pending = this._isPending(q);
    const isAnswering = this._answeringId === q.id;

    return html`
      <div class="question-card ${pending ? 'question-card--pending' : 'question-card--answered'}">
        <div class="question-header">
          <span class="question-text">${q.text}</span>
          <div class="question-actions">
            <button class="btn btn--primary btn--small" @click=${() => this._toggleAnswer(q.id)}>
              ${isAnswering ? 'Cancelar' : 'Responder'}
            </button>
            <button class="btn btn--danger btn--small" @click=${() => this._handleDelete(q.id)}>Eliminar</button>
          </div>
        </div>
        <div class="question-meta">
          ${q.userName || 'Anónimo'} · Módulo: ${q.moduleId} · Clase: ${q.lessonId}
          <span class="badge ${pending ? 'badge--pending' : 'badge--answered'}">
            ${pending ? 'Pendiente' : 'Respondida'}
          </span>
        </div>

        ${q.answers && q.answers.length > 0 ? html`
          <div class="answers-section">
            ${q.answers.map((a) => html`
              <div class="answer-item">
                <div class="answer-text">${a.text}</div>
                <div class="answer-meta">${a.userName || 'Admin'} · ${a.createdAt || ''}</div>
              </div>
            `)}
          </div>
        ` : ''}

        ${isAnswering ? html`
          <div class="answer-form">
            <textarea
              placeholder="Escribe tu respuesta..."
              .value=${this._answerText}
              @input=${(e) => { this._answerText = e.target.value; }}
              rows="2"
            ></textarea>
            <button class="btn btn--primary" ?disabled=${this._submitting || !this._answerText.trim()} @click=${() => this._submitAnswer(q.id)}>
              ${this._submitting ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('admin-questions-list', AdminQuestionsList);
