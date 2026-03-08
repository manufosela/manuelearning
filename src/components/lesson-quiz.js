import { LitElement, html, css } from 'lit';
import { getLessonQuiz } from '../services/quiz-service.js';
import { submitLessonQuizResponse, getStudentQuizResponse } from '../lib/firebase/quizzes.js';
import { waitForAuth } from '../lib/auth-ready.js';
import { stateStyles } from '../lib/shared-styles.js';
import { materialIconsLink } from './shared/material-icons.js';

/**
 * @element lesson-quiz
 * Displays quiz questions at the end of a lesson.
 * Takes a lessonId attribute and loads the associated quiz from Firestore.
 */
export class LessonQuiz extends LitElement {
  static properties = {
    lessonId: { type: String },
    lessonTitle: { type: String },
    _quiz: { type: Object, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
    _answers: { type: Array, state: true },
    _submitted: { type: Boolean, state: true },
    _submitting: { type: Boolean, state: true },
    _previousResponse: { type: Object, state: true },
    _currentQuestion: { type: Number, state: true },
    _confirmedQuestions: { type: Array, state: true },
  };

  static styles = [
    stateStyles,
    css`
      :host {
        display: block;
        margin-top: 2rem;
      }

      .quiz-container {
        background: #fff;
        border-radius: 0.75rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        overflow: hidden;
      }

      .quiz-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid #f1f5f9;
        background: #f8fafc;
      }

      .quiz-header .material-symbols-outlined {
        font-size: 1.5rem;
        color: #84cc16;
      }

      .quiz-header h3 {
        font-size: 1.063rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
      }

      .quiz-body {
        padding: 1.5rem;
      }

      .question-block {
        margin-bottom: 1.5rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid #f1f5f9;
      }

      .question-block:last-child {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
      }

      .question-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.025em;
        margin-bottom: 0.375rem;
      }

      .question-text {
        font-size: 0.938rem;
        font-weight: 600;
        color: #0f172a;
        margin-bottom: 0.75rem;
      }

      .options-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .option-label {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.625rem 0.875rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        cursor: pointer;
        transition: all 0.15s;
        font-size: 0.875rem;
        color: #334155;
      }

      .option-label:hover {
        border-color: #cbd5e1;
        background: #f8fafc;
      }

      .option-label--selected {
        border-color: #84cc16;
        background: #f7fee7;
      }

      .option-label--correct {
        border-color: #22c55e;
        background: #f0fdf4;
        color: #166534;
      }

      .option-label--incorrect {
        border-color: #ef4444;
        background: #fef2f2;
        color: #991b1b;
      }

      .option-label--disabled {
        cursor: default;
        opacity: 0.85;
      }

      .option-label input[type="radio"] {
        accent-color: #84cc16;
      }

      .open-answer {
        width: 100%;
        padding: 0.625rem 0.875rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-family: inherit;
        resize: vertical;
        min-height: 4rem;
        transition: border-color 0.15s;
        box-sizing: border-box;
      }

      .open-answer:focus {
        outline: none;
        border-color: #84cc16;
        box-shadow: 0 0 0 3px rgba(132, 204, 22, 0.1);
      }

      .open-answer:disabled {
        background: #f8fafc;
        cursor: default;
      }

      .explanation {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        margin-top: 0.625rem;
        padding: 0.625rem 0.875rem;
        background: #eff6ff;
        border-radius: 0.5rem;
        font-size: 0.813rem;
        color: #1e40af;
      }

      .explanation .material-symbols-outlined {
        font-size: 1rem;
        margin-top: 0.1rem;
        flex-shrink: 0;
      }

      .feedback-icon {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        margin-top: 0.5rem;
        font-size: 0.813rem;
        font-weight: 600;
      }

      .feedback-icon--correct {
        color: #15803d;
      }

      .feedback-icon--incorrect {
        color: #991b1b;
      }

      .feedback-icon .material-symbols-outlined {
        font-size: 1rem;
      }

      .quiz-actions {
        padding: 1rem 1.5rem;
        border-top: 1px solid #f1f5f9;
        display: flex;
        justify-content: flex-end;
      }

      .submit-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1.25rem;
        background: #84cc16;
        color: #fff;
        border: none;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 700;
        font-family: inherit;
        cursor: pointer;
        transition: background-color 0.15s;
      }

      .submit-btn:hover:not(:disabled) {
        background: #65a30d;
      }

      .submit-btn:disabled {
        background: #cbd5e1;
        cursor: default;
      }

      .progress-text {
        margin-left: auto;
        font-size: 0.75rem;
        font-weight: 600;
        color: #94a3b8;
      }

      .completed-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.75rem;
        background: #f0fdf4;
        color: #166534;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 700;
      }

      .completed-badge .material-symbols-outlined {
        font-size: 0.938rem;
      }
    `,
  ];

  constructor() {
    super();
    this.lessonId = '';
    this.lessonTitle = '';
    this._quiz = null;
    this._loading = true;
    this._error = '';
    this._answers = [];
    this._submitted = false;
    this._submitting = false;
    this._previousResponse = null;
    this._currentQuestion = 0;
    this._confirmedQuestions = [];
    this._userId = null;
    this._userEmail = '';
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.lessonId) {
      waitForAuth().then((user) => {
        this._userId = user.uid;
        this._userEmail = user.email || '';
        this._loadQuiz();
      });
    } else {
      this._loading = false;
    }
  }

  async _loadQuiz() {
    this._loading = true;
    this._error = '';

    const result = await getLessonQuiz(this.lessonId);

    if (!result.success) {
      this._error = result.error;
      this._loading = false;
      return;
    }

    if (!result.quiz) {
      this._quiz = null;
      this._loading = false;
      return;
    }

    this._quiz = result.quiz;
    this._answers = new Array(this._quiz.questions.length).fill(null);
    this._currentQuestion = 0;
    this._confirmedQuestions = new Array(this._quiz.questions.length).fill(false);

    if (this._userId) {
      const responseResult = await getStudentQuizResponse(this._userId, this.lessonId, this.lessonId);
      if (responseResult.success && responseResult.response) {
        this._previousResponse = responseResult.response;
        this._answers = (responseResult.response.answers || []).map((a) => a.selectedIndex);
        this._submitted = true;
        this._confirmedQuestions = new Array(this._quiz.questions.length).fill(true);
        this._currentQuestion = this._quiz.questions.length - 1;
      }
    }

    this._loading = false;
  }

  _selectOption(questionIndex, optionIndex) {
    if (this._submitted || this._confirmedQuestions[questionIndex]) return;
    const updated = [...this._answers];
    updated[questionIndex] = optionIndex;
    this._answers = updated;
  }

  _confirmAnswer() {
    if (this._submitted) return;
    const currentIdx = this._currentQuestion;
    if (this._answers[currentIdx] === null) {
      this._error = 'Selecciona una respuesta antes de continuar.';
      return;
    }
    this._error = '';

    // Step 1: Confirm the answer and show feedback
    if (!this._confirmedQuestions[currentIdx]) {
      const updated = [...this._confirmedQuestions];
      updated[currentIdx] = true;
      this._confirmedQuestions = updated;
      return;
    }

    // Step 2: Advance to next question or submit
    if (currentIdx < this._quiz.questions.length - 1) {
      this._currentQuestion = currentIdx + 1;
    } else {
      this._submitQuiz();
    }
  }

  async _submitQuiz() {
    if (this._submitting || this._submitted) return;

    this._submitting = true;
    this._error = '';

    const answers = this._quiz.questions.map((q, i) => ({
      selectedIndex: this._answers[i],
      isCorrect: this._answers[i] === q.correctIndex,
    }));

    const result = await submitLessonQuizResponse({
      lessonId: this.lessonId,
      lessonTitle: this.lessonTitle || '',
      quizId: this.lessonId,
      studentId: this._userId,
      studentEmail: this._userEmail,
      answers,
    });

    if (result.success) {
      this._submitted = true;
    } else {
      this._error = result.error;
    }

    this._submitting = false;
  }

  _getOptionClass(question, optionIndex, questionIndex) {
    const selected = this._answers[questionIndex] === optionIndex;
    const showFeedback = this._submitted || this._confirmedQuestions[questionIndex];

    if (!showFeedback) {
      return selected ? 'option-label option-label--selected' : 'option-label';
    }

    const classes = ['option-label', 'option-label--disabled'];

    if (optionIndex === question.correctIndex) {
      classes.push('option-label--correct');
    } else if (selected) {
      classes.push('option-label--incorrect');
    }

    return classes.join(' ');
  }

  _isAnswerCorrect(question, questionIndex) {
    return this._answers[questionIndex] === question.correctIndex;
  }

  render() {
    if (this._loading) {
      return html`<div class="state-loading"><div class="state-spinner"></div><p>Cargando quiz...</p></div>`;
    }

    if (!this._quiz) return '';

    const totalQuestions = this._quiz.questions.length;
    const progressText = totalQuestions > 1
      ? `Pregunta ${Math.min(this._currentQuestion + 1, totalQuestions)} de ${totalQuestions}`
      : '';

    return html`
      ${materialIconsLink}
      <div class="quiz-container">
        <div class="quiz-header">
          <span class="material-symbols-outlined">quiz</span>
          <h3>Comprobación de comprensión</h3>
          ${progressText ? html`<span class="progress-text">${progressText}</span>` : ''}
          ${this._submitted
            ? html`<span class="completed-badge">
                <span class="material-symbols-outlined">check_circle</span>
                Completado
              </span>`
            : ''}
        </div>

        <div class="quiz-body">
          ${this._error && !this._submitted
            ? html`<div class="state-error" style="margin-bottom: 1rem"><p>${this._error}</p></div>`
            : ''}
          ${this._submitted
            ? this._quiz.questions.map((q, i) => this._renderQuestion(q, i))
            : this._renderQuestion(this._quiz.questions[this._currentQuestion], this._currentQuestion)}
        </div>

        ${!this._submitted
          ? html`
              <div class="quiz-actions">
                <button
                  class="submit-btn"
                  @click=${this._confirmAnswer}
                  ?disabled=${this._submitting || this._answers[this._currentQuestion] === null}
                >
                  ${this._submitting
                    ? 'Enviando...'
                    : !this._confirmedQuestions[this._currentQuestion]
                      ? 'Confirmar'
                      : this._currentQuestion < totalQuestions - 1
                        ? 'Siguiente'
                        : 'Enviar respuestas'}
                </button>
              </div>
            `
          : ''}
      </div>
    `;
  }

  _renderQuestion(question, index) {
    const showFeedback = this._submitted || this._confirmedQuestions[index];
    const isCorrect = showFeedback ? this._isAnswerCorrect(question, index) : null;
    const isDisabled = showFeedback || (index !== this._currentQuestion && !this._submitted);

    return html`
      <div class="question-block">
        <div class="question-label">Pregunta ${index + 1}</div>
        <div class="question-text">${question.question}</div>

        <div class="options-list">
          ${question.options.map(
            (opt, optIdx) => html`
              <label class=${this._getOptionClass(question, optIdx, index)}>
                <input
                  type="radio"
                  name="q-${index}"
                  .checked=${this._answers[index] === optIdx}
                  ?disabled=${isDisabled}
                  @change=${() => this._selectOption(index, optIdx)}
                />
                ${opt}
              </label>
            `,
          )}
        </div>

        ${showFeedback && isCorrect !== null
          ? html`
              <div class="feedback-icon ${isCorrect ? 'feedback-icon--correct' : 'feedback-icon--incorrect'}">
                <span class="material-symbols-outlined">${isCorrect ? 'check_circle' : 'cancel'}</span>
                ${isCorrect ? '¡Correcto!' : `Incorrecto — La respuesta correcta es: ${question.options[question.correctIndex]}`}
              </div>
            `
          : ''}

        ${showFeedback && question.explanation
          ? html`
              <div class="explanation">
                <span class="material-symbols-outlined">info</span>
                <span>${question.explanation}</span>
              </div>
            `
          : ''}
      </div>
    `;
  }
}

customElements.define('lesson-quiz', LessonQuiz);
