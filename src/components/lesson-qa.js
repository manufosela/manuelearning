import { LitElement, html, css } from 'lit';
import { fetchQuestionsByLesson, createQuestion, addReply, toggleVote } from '../lib/firebase/questions.js';
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
    _replyingId: { type: String, state: true },
    _replyText: { type: String, state: true },
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

    .pending-badge { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.688rem; color: #b45309; background: #fffbeb; padding: 0.125rem 0.5rem; border-radius: 9999px; margin-left: 0.5rem; }
    .pending-badge .material-symbols-outlined { font-size: 0.75rem; }
    .answered-badge { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.688rem; color: #166534; background: #f0fdf4; padding: 0.125rem 0.5rem; border-radius: 9999px; margin-left: 0.5rem; }
    .answered-badge .material-symbols-outlined { font-size: 0.75rem; }
    .question-item--pending { border-left-color: #f59e0b; }

    .answer-list { margin-top: 0.5rem; padding-left: 1rem; border-left: 2px solid #e2e8f0; }
    .answer-item { padding: 0.5rem 0; display: flex; gap: 0.5rem; align-items: flex-start; }
    .answer-content { flex: 1; }
    .answer-text { font-size: 0.875rem; color: #334155; }
    .answer-meta { font-size: 0.688rem; color: #94a3b8; margin-top: 0.125rem; }

    .profesor-badge { display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.625rem; font-weight: 700; color: #1e40af; background: #dbeafe; padding: 0.125rem 0.5rem; border-radius: 9999px; margin-left: 0.375rem; }
    .profesor-badge .material-symbols-outlined { font-size: 0.75rem; }

    .vote-btn { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; border: 1px solid #e2e8f0; border-radius: 0.375rem; background: #fff; color: #64748b; font-size: 0.688rem; font-family: inherit; cursor: pointer; transition: all 0.15s; flex-shrink: 0; margin-top: 0.25rem; }
    .vote-btn:hover { background: #f0fdf4; border-color: #84cc16; color: #166534; }
    .vote-btn.voted { background: #f0fdf4; border-color: #84cc16; color: #166534; }
    .vote-btn .material-symbols-outlined { font-size: 0.875rem; }

    .reply-btn { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.625rem; border: none; border-radius: 0.375rem; background: #f1f5f9; color: #64748b; font-size: 0.688rem; font-family: inherit; cursor: pointer; margin-top: 0.5rem; }
    .reply-btn:hover { background: #e2e8f0; color: #334155; }
    .reply-btn .material-symbols-outlined { font-size: 0.875rem; }

    .reply-form { display: flex; gap: 0.5rem; margin-top: 0.5rem; padding-left: 1rem; }
    .reply-form textarea { flex: 1; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.375rem; font-size: 0.813rem; font-family: inherit; resize: vertical; min-height: 2rem; }
    .reply-form textarea:focus { outline: none; border-color: #84cc16; box-shadow: 0 0 0 3px rgba(132,204,22,0.1); }
    .reply-form .btn { font-size: 0.75rem; padding: 0.375rem 0.75rem; align-self: flex-end; }

    .replies-section { margin-top: 0.25rem; padding-left: 1rem; border-left: 2px solid #f1f5f9; }
    .replies-section .answer-item { padding: 0.375rem 0; }

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
    this._replyingId = null;
    this._replyText = '';
  }

  connectedCallback() {
    super.connectedCallback();
    waitForAuth().then((user) => {
      this.userId = user.uid;
      this.userName = user.displayName || user.email || '';
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

      ${this._questions.map((q) => {
        const hasPendingAnswer = !q.answers || q.answers.length === 0;
        const votes = q.votes || {};
        const sortedAnswers = [...(q.answers || [])].sort((a, b) => {
          const aVotes = (votes[a.id] || []).length;
          const bVotes = (votes[b.id] || []).length;
          return bVotes - aVotes;
        });
        const replies = [...(q.replies || [])].sort((a, b) => {
          const aVotes = (votes[a.id] || []).length;
          const bVotes = (votes[b.id] || []).length;
          return bVotes - aVotes;
        });
        const isReplying = this._replyingId === q.id;
        return html`
          <div class="question-item ${hasPendingAnswer ? 'question-item--pending' : ''}">
            <div class="question-text">${q.text}</div>
            <div class="question-meta">
              ${q.userName || 'Anónimo'} · ${this._formatDate(q.createdAt)}
              ${q.userId === this.userId && q.public !== true ? html`
                <span class="privacy-badge">
                  <span class="material-symbols-outlined">lock</span>Solo tú y el profesor
                </span>
              ` : ''}
              ${hasPendingAnswer ? html`
                <span class="pending-badge">
                  <span class="material-symbols-outlined">schedule</span>Pendiente de respuesta
                </span>
              ` : html`
                <span class="answered-badge">
                  <span class="material-symbols-outlined">check_circle</span>Respondida
                </span>
              `}
            </div>
            ${sortedAnswers.length > 0 ? html`
              <div class="answer-list">
                ${sortedAnswers.map((a) => {
                  const itemVotes = a.id ? (votes[a.id] || []) : [];
                  const hasVoted = itemVotes.includes(this.userId);
                  return html`
                    <div class="answer-item">
                      ${a.id ? html`
                        <button class="vote-btn ${hasVoted ? 'voted' : ''}" @click=${() => this._handleVote(q.id, a.id)} title="Marcar como útil">
                          <span class="material-symbols-outlined">${hasVoted ? 'thumb_up' : 'thumb_up_off_alt'}</span>
                          ${itemVotes.length || ''}
                        </button>
                      ` : ''}
                      <div class="answer-content">
                        <div class="answer-text">${a.text}</div>
                        <div class="answer-meta">
                          ${a.userName || 'Admin'}
                          ${a.isAdmin ? html`<span class="profesor-badge"><span class="material-symbols-outlined">school</span>Profesor</span>` : ''}
                          · ${a.createdAt || ''}
                        </div>
                      </div>
                    </div>
                  `;
                })}
              </div>
            ` : ''}
            ${replies.length > 0 ? html`
              <div class="replies-section">
                ${replies.map((r) => {
                  const itemVotes = r.id ? (votes[r.id] || []) : [];
                  const hasVoted = itemVotes.includes(this.userId);
                  return html`
                    <div class="answer-item">
                      ${r.id ? html`
                        <button class="vote-btn ${hasVoted ? 'voted' : ''}" @click=${() => this._handleVote(q.id, r.id)} title="Marcar como útil">
                          <span class="material-symbols-outlined">${hasVoted ? 'thumb_up' : 'thumb_up_off_alt'}</span>
                          ${itemVotes.length || ''}
                        </button>
                      ` : ''}
                      <div class="answer-content">
                        <div class="answer-text">${r.text}</div>
                        <div class="answer-meta">
                          ${r.userName || 'Anónimo'}
                          ${r.isAdmin ? html`<span class="profesor-badge"><span class="material-symbols-outlined">school</span>Profesor</span>` : ''}
                          · ${r.createdAt || ''}
                        </div>
                      </div>
                    </div>
                  `;
                })}
              </div>
            ` : ''}
            ${this.userId ? html`
              <button class="reply-btn" @click=${() => this._toggleReply(q.id)}>
                <span class="material-symbols-outlined">${isReplying ? 'close' : 'reply'}</span>
                ${isReplying ? 'Cancelar' : 'Responder'}
              </button>
            ` : ''}
            ${isReplying ? html`
              <div class="reply-form">
                <textarea
                  placeholder="Escribe tu respuesta..."
                  .value=${this._replyText}
                  @input=${(e) => { this._replyText = e.target.value; }}
                  rows="2"
                ></textarea>
                <button class="btn btn--primary" ?disabled=${this._submitting || !this._replyText.trim()} @click=${() => this._submitReply(q.id)}>
                  ${this._submitting ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            ` : ''}
          </div>
        `;
      })}
    `;
  }

  _toggleReply(questionId) {
    if (this._replyingId === questionId) {
      this._replyingId = null;
      this._replyText = '';
    } else {
      this._replyingId = questionId;
      this._replyText = '';
    }
  }

  async _submitReply(questionId) {
    if (!this._replyText.trim() || !this.userId) return;
    this._submitting = true;
    const result = await addReply(questionId, {
      text: this._replyText,
      userId: this.userId,
      userName: this.userName,
    });
    this._submitting = false;
    if (result.success) {
      this._replyingId = null;
      this._replyText = '';
      await this._loadQuestions();
    }
  }

  async _handleVote(questionId, itemId) {
    if (!this.userId) return;
    await toggleVote(questionId, itemId, this.userId);
    await this._loadQuestions();
  }

  _formatDate(ts) {
    if (!ts) return '';
    if (ts.toDate) return ts.toDate().toLocaleDateString('es-ES');
    if (typeof ts === 'string') return new Date(ts).toLocaleDateString('es-ES');
    return '';
  }
}

customElements.define('lesson-qa', LessonQA);
