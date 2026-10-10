/**
 * Pure helpers for the lesson quiz: multiple-choice questions are graded,
 * open questions (written case studies) are stored as text and never graded.
 */

/**
 * @typedef {Object} QuizQuestionView
 * @property {string} question
 * @property {'multiple'|'open'} type
 * @property {string[]} options
 * @property {number|null} correctIndex
 * @property {string} explanation
 */

/**
 * Normalize a stored question (current and legacy shapes) for the quiz view.
 * A question without `type` is multiple choice when it has options.
 * @param {Object} raw
 * @returns {QuizQuestionView}
 */
export function normalizeQuestion(raw) {
  const options = Array.isArray(raw.options) ? raw.options : [];
  const type = raw.type ?? (options.length > 0 ? 'multiple' : 'open');
  return {
    question: raw.text || raw.question || '',
    type,
    options: type === 'open' ? [] : options,
    correctIndex: type === 'open' ? null : (raw.correctAnswer ?? raw.correctIndex ?? 0),
    explanation: raw.explanation || '',
  };
}

/**
 * @param {QuizQuestionView} question
 * @param {number|string|null} answer
 * @returns {boolean}
 */
export function isAnswered(question, answer) {
  if (question.type === 'open') return typeof answer === 'string' && answer.trim().length > 0;
  return typeof answer === 'number';
}

/**
 * Build the answers payload to store.
 * @param {QuizQuestionView[]} questions
 * @param {Array<number|string|null>} answers
 * @returns {Array<{selectedIndex: number, isCorrect: boolean}|{text: string}>}
 */
export function buildAnswers(questions, answers) {
  return questions.map((q, i) =>
    q.type === 'open'
      ? { text: String(answers[i] ?? '').trim() }
      : { selectedIndex: answers[i], isCorrect: answers[i] === q.correctIndex }
  );
}

/**
 * Restore the in-progress answers from a saved response.
 * @param {QuizQuestionView[]} questions
 * @param {Array<Object>} saved
 * @returns {Array<number|string|null>}
 */
export function restoreAnswers(questions, saved) {
  return questions.map((q, i) => {
    const answer = saved[i];
    if (!answer) return null;
    return q.type === 'open' ? (answer.text ?? null) : (answer.selectedIndex ?? null);
  });
}

/**
 * Score only the gradable (multiple-choice) questions.
 * @param {QuizQuestionView[]} questions
 * @param {Array<number|string|null>} answers
 * @returns {{ correct: number, gradable: number, open: number }}
 */
export function scoreSummary(questions, answers) {
  const gradable = questions.filter((q) => q.type !== 'open');
  return {
    correct: questions.filter((q, i) => q.type !== 'open' && answers[i] === q.correctIndex).length,
    gradable: gradable.length,
    open: questions.length - gradable.length,
  };
}
