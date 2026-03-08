import { LitElement, html, css } from 'lit';
import { fetchQuiz, submitQuizResponse, getUserQuizResponse } from '../lib/firebase/quizzes.js';
import { waitForAuth } from '../lib/auth-ready.js';
import { materialIconsLink } from './shared/material-icons.js';

/**
 * @element quiz-player
 * Loads a quiz by ID, displays questions with multiple choice or open answers,
 * tracks user answers, shows results, and saves responses to Firestore.
 */
export class QuizPlayer extends LitElement {
  static properties = {
    quizId: { type: String, attribute: 'data-quiz-id' },
    _quiz: { type: Object, state: true },
    _answers: { type: Array, state: true },
    _currentQuestion: { type: Number, state: true },
    _loading: { type: Boolean, state: true },
    _submitting: { type: Boolean, state: true },
    _submitted: { type: Boolean, state: true },
    _error: { type: String, state: true },
    _user: { type: Object, state: true },
    _previousResponse: { type: Object, state: true },
  };

  static styles = css`
    :host {
      display: block;
    }

    .loading, .error-container {
      text-align: center;
      padding: 3rem 2rem;
    }

    .spinner {
      width: 2rem;
      height: 2rem;
      border: 3px solid #e2e8f0;
      border-top-color: #84cc16;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin: 0 auto 0.75rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading p {
      color: #475569;
      font-size: 0.938rem;
    }

    .error-container {
      background: #fef2f2;
      color: #991b1b;
      border-radius: 0.75rem;
      border: 1px solid #fecaca;
      font-size: 0.875rem;
    }

    .error-container a {
      color: #1e40af;
      text-decoration: underline;
    }

    /* Quiz header */
    .quiz-header {
      margin-bottom: 2rem;
    }

    .quiz-header h1 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.5rem;
    }

    .quiz-progress {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.813rem;
      color: #64748b;
    }

    .progress-bar {
      flex: 1;
      height: 0.375rem;
      background: #e2e8f0;
      border-radius: 9999px;
      overflow: hidden;
    }

    .progress-bar__fill {
      height: 100%;
      background: #84cc16;
      border-radius: 9999px;
      transition: width 0.3s ease;
    }

    /* Question card */
    .question-card {
      background: #fff;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .question-number {
      font-size: 0.75rem;
      font-weight: 600;
      color: #84cc16;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .question-text {
      font-size: 1.125rem;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 1.25rem;
      line-height: 1.5;
    }

    /* Options */
    .options-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .option-btn {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.875rem 1rem;
      border: 2px solid #e2e8f0;
      border-radius: 0.5rem;
      background: #fff;
      color: #334155;
      font-size: 0.938rem;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s;
    }

    .option-btn:hover {
      border-color: #cbd5e1;
      background: #f8fafc;
    }

    .option-btn--selected {
      border-color: #84cc16;
      background: #f7fee7;
      color: #365314;
      font-weight: 600;
    }

    .option-indicator {
      width: 1.25rem;
      height: 1.25rem;
      border-radius: 50%;
      border: 2px solid #cbd5e1;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }

    .option-btn--selected .option-indicator {
      border-color: #84cc16;
      background: #84cc16;
    }

    .option-indicator__check {
      display: none;
      color: #fff;
      font-size: 0.875rem;
    }

    .option-btn--selected .option-indicator__check {
      display: block;
    }

    /* Open text answer */
    .open-answer {
      width: 100%;
      min-height: 100px;
      padding: 0.75rem 1rem;
      border: 2px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 0.938rem;
      color: #334155;
      resize: vertical;
      font-family: inherit;
      transition: border-color 0.15s;
    }

    .open-answer:focus {
      outline: none;
      border-color: #84cc16;
    }

    /* Navigation */
    .nav-buttons {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      border: none;
    }

    .btn--secondary {
      background: #f1f5f9;
      color: #475569;
    }

    .btn--secondary:hover {
      background: #e2e8f0;
    }

    .btn--primary {
      background: #84cc16;
      color: #fff;
    }

    .btn--primary:hover {
      background: #65a30d;
    }

    .btn--primary:disabled {
      background: #d4d4d8;
      cursor: not-allowed;
    }

    .btn .material-symbols-outlined {
      font-size: 1.125rem;
    }

    /* Results */
    .results-card {
      background: #fff;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      padding: 2rem;
      text-align: center;
    }

    .results-icon {
      font-size: 3rem;
      color: #84cc16;
      margin-bottom: 1rem;
    }

    .results-card h2 {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.5rem;
    }

    .results-card p {
      color: #64748b;
      font-size: 0.938rem;
      margin-bottom: 1.5rem;
    }

    .results-summary {
      display: flex;
      gap: 1.5rem;
      justify-content: center;
      margin-bottom: 2rem;
    }

    .results-stat {
      text-align: center;
    }

    .results-stat__value {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
    }

    .results-stat__label {
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .results-answers {
      text-align: left;
      margin-top: 1.5rem;
      border-top: 1px solid #f1f5f9;
      padding-top: 1.5rem;
    }

    .results-answers h3 {
      font-size: 0.938rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 1rem;
    }

    .result-question {
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .result-question:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }

    .result-question__text {
      font-size: 0.875rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.375rem;
    }

    .result-question__answer {
      font-size: 0.813rem;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .result-question__answer .material-symbols-outlined {
      font-size: 1rem;
      color: #84cc16;
    }

    .results-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 1.5rem;
    }

    /* Previously completed */
    .already-completed {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 0.75rem;
      padding: 1.5rem;
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .already-completed .material-symbols-outlined {
      font-size: 2.5rem;
      color: #15803d;
      display: block;
      margin-bottom: 0.5rem;
    }

    .already-completed h3 {
      color: #15803d;
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .already-completed p {
      color: #166534;
      font-size: 0.875rem;
    }
  `;

  constructor() {
    super();
    this.quizId = '';
    this._quiz = null;
    this._answers = [];
    this._currentQuestion = 0;
    this._loading = true;
    this._submitting = false;
    this._submitted = false;
    this._error = '';
    this._user = null;
    this._previousResponse = null;
    this._initialized = false;
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has('quizId') && !this._initialized) {
      this._initialized = true;
      this._init();
    }
  }

  async _init() {
    try {
      this._user = await waitForAuth();
    } catch {
      this._error = 'Debes iniciar sesión para acceder al quiz.';
      this._loading = false;
      return;
    }

    if (!this.quizId) {
      this._error = 'No se proporcionó un ID de quiz válido.';
      this._loading = false;
      return;
    }

    const result = await fetchQuiz(this.quizId);
    if (!result.success) {
      this._error = result.error;
      this._loading = false;
      return;
    }

    this._quiz = result.quiz;
    this._answers = new Array(this._quiz.questions.length).fill('');

    // Check if user already completed this quiz
    const prevResult = await getUserQuizResponse(this._user.uid, this.quizId);
    if (prevResult.success && prevResult.response) {
      this._previousResponse = prevResult.response;
      this._answers = [...(prevResult.response.answers || [])];
      this._submitted = true;
    }

    this._loading = false;
  }

  render() {
    if (this._loading) {
      return html`
        ${materialIconsLink}
        <div class="loading">
          <div class="spinner"></div>
          <p>Cargando quiz...</p>
        </div>
      `;
    }

    if (this._error) {
      return html`
        ${materialIconsLink}
        <div class="error-container">
          <span class="material-symbols-outlined" style="font-size:2rem;display:block;margin-bottom:0.5rem;">error</span>
          <p>${this._error}</p>
          <p style="margin-top:0.75rem;"><a href="/cursos">Volver a cursos</a></p>
        </div>
      `;
    }

    if (this._submitted) {
      return this._renderResults();
    }

    return this._renderQuestion();
  }

  _renderQuestion() {
    const q = this._quiz.questions[this._currentQuestion];
    const total = this._quiz.questions.length;
    const progress = ((this._currentQuestion + 1) / total) * 100;
    const isLast = this._currentQuestion === total - 1;
    const hasAnswer = this._answers[this._currentQuestion] !== '';

    return html`
      ${materialIconsLink}
      <div class="quiz-header">
        <h1>${this._quiz.title}</h1>
        <div class="quiz-progress">
          <span>Pregunta ${this._currentQuestion + 1} de ${total}</span>
          <div class="progress-bar">
            <div class="progress-bar__fill" style="width: ${progress}%"></div>
          </div>
        </div>
      </div>

      <div class="question-card">
        <div class="question-number">Pregunta ${this._currentQuestion + 1}</div>
        <div class="question-text">${q.text}</div>

        ${q.type === 'multiple' && q.options
          ? html`
              <div class="options-list">
                ${q.options.map(
                  (opt) => html`
                    <button
                      class="option-btn ${this._answers[this._currentQuestion] === opt ? 'option-btn--selected' : ''}"
                      @click=${() => this._selectOption(opt)}
                    >
                      <span class="option-indicator">
                        <span class="material-symbols-outlined option-indicator__check">check</span>
                      </span>
                      ${opt}
                    </button>
                  `,
                )}
              </div>
            `
          : html`
              <textarea
                class="open-answer"
                placeholder="Escribe tu respuesta aquí..."
                .value=${this._answers[this._currentQuestion]}
                @input=${(e) => this._setOpenAnswer(e.target.value)}
              ></textarea>
            `}
      </div>

      <div class="nav-buttons">
        <button
          class="btn btn--secondary"
          ?hidden=${this._currentQuestion === 0}
          @click=${this._prevQuestion}
        >
          <span class="material-symbols-outlined">arrow_back</span>
          Anterior
        </button>
        <span></span>
        ${isLast
          ? html`
              <button
                class="btn btn--primary"
                ?disabled=${!this._allAnswered() || this._submitting}
                @click=${this._submit}
              >
                ${this._submitting
                  ? 'Enviando...'
                  : html`Enviar respuestas <span class="material-symbols-outlined">send</span>`}
              </button>
            `
          : html`
              <button
                class="btn btn--primary"
                ?disabled=${!hasAnswer}
                @click=${this._nextQuestion}
              >
                Siguiente
                <span class="material-symbols-outlined">arrow_forward</span>
              </button>
            `}
      </div>
    `;
  }

  _renderResults() {
    const questions = this._quiz.questions;

    return html`
      ${materialIconsLink}
      <div class="quiz-header">
        <h1>${this._quiz.title}</h1>
      </div>

      ${this._previousResponse
        ? html`
            <div class="already-completed">
              <span class="material-symbols-outlined">task_alt</span>
              <h3>Quiz completado anteriormente</h3>
              <p>Estas son las respuestas que enviaste.</p>
            </div>
          `
        : ''}

      <div class="results-card">
        <span class="material-symbols-outlined results-icon">emoji_events</span>
        <h2>¡Quiz completado!</h2>
        <p>Has respondido ${questions.length} pregunta${questions.length !== 1 ? 's' : ''}.</p>

        <div class="results-summary">
          <div class="results-stat">
            <div class="results-stat__value">${questions.length}</div>
            <div class="results-stat__label">Preguntas</div>
          </div>
          <div class="results-stat">
            <div class="results-stat__value">${this._answers.filter((a) => a !== '').length}</div>
            <div class="results-stat__label">Respondidas</div>
          </div>
        </div>

        <div class="results-answers">
          <h3>Resumen de respuestas</h3>
          ${questions.map((q, i) => html`
            <div class="result-question">
              <div class="result-question__text">${i + 1}. ${q.text}</div>
              <div class="result-question__answer">
                <span class="material-symbols-outlined">check_circle</span>
                ${this._answers[i] || '(sin respuesta)'}
              </div>
            </div>
          `)}
        </div>

        <div class="results-actions">
          <a href="/cursos" class="btn btn--secondary">
            <span class="material-symbols-outlined">arrow_back</span>
            Volver a cursos
          </a>
          <a href="/resultados" class="btn btn--primary">
            <span class="material-symbols-outlined">bar_chart</span>
            Ver todos mis resultados
          </a>
        </div>
      </div>
    `;
  }

  _selectOption(option) {
    const updated = [...this._answers];
    updated[this._currentQuestion] = option;
    this._answers = updated;
  }

  _setOpenAnswer(value) {
    const updated = [...this._answers];
    updated[this._currentQuestion] = value;
    this._answers = updated;
  }

  _nextQuestion() {
    if (this._currentQuestion < this._quiz.questions.length - 1) {
      this._currentQuestion++;
    }
  }

  _prevQuestion() {
    if (this._currentQuestion > 0) {
      this._currentQuestion--;
    }
  }

  _allAnswered() {
    return this._answers.every((a) => a !== '');
  }

  async _submit() {
    if (this._submitting) return;
    this._submitting = true;

    const result = await submitQuizResponse(
      this._user.uid,
      this._quiz.id,
      this._answers,
    );

    if (result.success) {
      this._submitted = true;
    } else {
      this._error = result.error;
    }

    this._submitting = false;
  }
}

customElements.define('quiz-player', QuizPlayer);
