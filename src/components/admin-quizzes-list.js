import { LitElement, html, css } from 'lit';
import {
  fetchAllQuizzes,
  createQuiz,
  deleteQuiz,
  getQuizResponses,
  validateQuiz,
} from '../lib/firebase/quizzes.js';
import { waitForAuth } from '../lib/auth-ready.js';
import { exportCsv } from '../lib/csv-export.js';

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
    _formData: { type: Object, state: true },
    _formError: { type: String, state: true },
    _saving: { type: Boolean, state: true },
    _viewingResponses: { type: String, state: true },
    _responses: { type: Array, state: true },
  };

  static styles = css`
    :host { display: block; }

    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; font-size: 0.813rem; font-weight: 600; font-family: inherit; cursor: pointer; transition: background-color 0.15s; }
    .btn--primary { background: #84cc16; color: #0f172a; }
    .btn--primary:hover { background: #d11111; }
    .btn--secondary { background: #f1f5f9; color: #334155; }
    .btn--secondary:hover { background: #e2e8f0; }
    .btn--danger { background: #fef2f2; color: #991b1b; }
    .btn--danger:hover { background: #fee2e2; }
    .btn--small { padding: 0.375rem 0.75rem; font-size: 0.75rem; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .quiz-card { background: #fff; border-radius: 0.75rem; padding: 1.25rem; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); margin-bottom: 1rem; }
    .quiz-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .quiz-title { font-size: 1rem; font-weight: 700; color: #0f172a; }
    .quiz-meta { font-size: 0.813rem; color: #64748b; }
    .quiz-actions { display: flex; gap: 0.5rem; }

    .responses-panel { border-top: 1px solid #f1f5f9; margin-top: 1rem; padding-top: 1rem; }
    .response-item { background: #f8fafc; padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 0.5rem; font-size: 0.875rem; }
    .response-user { font-weight: 600; color: #0f172a; margin-bottom: 0.25rem; }
    .response-answer { color: #334155; }

    .form-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .form-card { background: #fff; border-radius: 0.75rem; padding: 2rem; width: 100%; max-width: 560px; box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25); max-height: 90vh; overflow-y: auto; }
    .form-card h3 { margin: 0 0 1.5rem; font-size: 1.125rem; font-weight: 700; color: #0f172a; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.813rem; font-weight: 600; color: #334155; margin-bottom: 0.375rem; }
    .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.375rem; font-size: 0.875rem; font-family: inherit; box-sizing: border-box; }
    .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #84cc16; box-shadow: 0 0 0 3px rgba(132,204,22,0.1); }
    .form-error { color: #991b1b; font-size: 0.813rem; margin-bottom: 1rem; }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; }

    .question-block { background: #f8fafc; padding: 1rem; border-radius: 0.5rem; margin-bottom: 0.75rem; border: 1px solid #e2e8f0; }
    .question-block-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .question-number { font-size: 0.75rem; font-weight: 700; color: #475569; }

    .loading, .error-msg { text-align: center; padding: 3rem; color: #475569; }
    .error-msg { color: #991b1b; }
    .spinner { width: 1.5rem; height: 1.5rem; border: 3px solid #e2e8f0; border-top-color: #84cc16; border-radius: 50%; animation: spin 0.6s linear infinite; margin: 0 auto 0.75rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { text-align: center; padding: 3rem; color: #64748b; }
  `;

  constructor() {
    super();
    this._quizzes = [];
    this._loading = true;
    this._error = '';
    this._showForm = false;
    this._formData = this._emptyForm();
    this._formError = '';
    this._saving = false;
    this._viewingResponses = null;
    this._responses = [];
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
      questions: [{ text: '', type: 'open', options: [] }],
    };
  }

  async _loadQuizzes() {
    this._loading = true;
    const result = await fetchAllQuizzes();
    this._loading = false;
    if (result.success) { this._quizzes = result.quizzes; } else { this._error = result.error; }
  }

  _openCreate() {
    this._formData = this._emptyForm();
    this._formError = '';
    this._showForm = true;
  }

  _closeForm() { this._showForm = false; this._formError = ''; }

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
    this._formData = {
      ...this._formData,
      questions: [...this._formData.questions, { text: '', type: 'open', options: [] }],
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
    const result = await createQuiz(this._formData);
    this._saving = false;
    if (result.success) { this._closeForm(); await this._loadQuizzes(); } else { this._formError = result.error; }
  }

  async _handleDelete(quizId) {
    const result = await deleteQuiz(quizId);
    if (result.success) await this._loadQuizzes();
  }

  _exportResponses(quiz) {
    const questionCount = quiz.questions?.length || 0;
    const headers = ['Usuario', ...Array.from({ length: questionCount }, (_, i) => `Pregunta ${i + 1}`)];
    const rows = this._responses.map((r) => [
      r.userId,
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

  render() {
    if (this._loading) return html`<div class="loading"><div class="spinner"></div><p>Cargando quizzes...</p></div>`;
    if (this._error) return html`<div class="error-msg">${this._error}</div>`;

    return html`
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
    `;
  }

  _renderQuiz(q) {
    const isViewing = this._viewingResponses === q.id;
    return html`
      <div class="quiz-card">
        <div class="quiz-header">
          <span class="quiz-title">${q.title}</span>
          <div class="quiz-actions">
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
          <h3>Nuevo quiz</h3>
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

            <h4 style="margin: 1rem 0 0.75rem; font-size: 0.875rem; color: #0f172a;">Preguntas</h4>
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
                ` : ''}
              </div>
            `)}

            <button type="button" class="btn btn--secondary" @click=${this._addQuestion} style="margin-bottom: 1rem;">
              + Añadir pregunta
            </button>

            ${this._formError ? html`<div class="form-error">${this._formError}</div>` : ''}
            <div class="form-actions">
              <button type="button" class="btn btn--secondary" @click=${this._closeForm}>Cancelar</button>
              <button type="submit" class="btn btn--primary" ?disabled=${this._saving}>${this._saving ? 'Guardando...' : 'Crear'}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
}

customElements.define('admin-quizzes-list', AdminQuizzesList);
