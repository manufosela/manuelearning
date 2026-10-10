import { describe, it, expect } from 'vitest';
import {
  normalizeQuestion,
  isAnswered,
  buildAnswers,
  restoreAnswers,
  scoreSummary,
} from '../src/lib/lesson-quiz-utils.js';

const multiple = normalizeQuestion({ text: '¿2+2?', type: 'multiple', options: ['3', '4'], correctAnswer: 1, explanation: 'Suma' });
const open = normalizeQuestion({ text: 'Explica el falso verde', type: 'open', explanation: 'Afirma sin probar' });

describe('normalizeQuestion', () => {
  it('maps a multiple-choice question', () => {
    expect(multiple).toEqual({ question: '¿2+2?', type: 'multiple', options: ['3', '4'], correctIndex: 1, explanation: 'Suma' });
  });

  it('maps an open question without options nor correct index', () => {
    expect(open).toEqual({ question: 'Explica el falso verde', type: 'open', options: [], correctIndex: null, explanation: 'Afirma sin probar' });
  });

  it('treats legacy questions without type as multiple choice', () => {
    const legacy = normalizeQuestion({ question: 'Antigua', options: ['a', 'b'], correctIndex: 0 });
    expect(legacy).toMatchObject({ question: 'Antigua', type: 'multiple', correctIndex: 0, explanation: '' });
  });

  it('treats a typeless question without options as open', () => {
    expect(normalizeQuestion({ text: 'Sin opciones' }).type).toBe('open');
  });
});

describe('isAnswered', () => {
  it('needs a selected option for multiple choice', () => {
    expect(isAnswered(multiple, null)).toBe(false);
    expect(isAnswered(multiple, 0)).toBe(true);
  });

  it('needs non-blank text for open questions', () => {
    expect(isAnswered(open, null)).toBe(false);
    expect(isAnswered(open, '   ')).toBe(false);
    expect(isAnswered(open, 'Mi respuesta')).toBe(true);
  });
});

describe('buildAnswers', () => {
  it('grades multiple choice and stores open answers as trimmed text without isCorrect', () => {
    expect(buildAnswers([multiple, open], [1, '  Afirma sin ejecutar los tests  '])).toEqual([
      { selectedIndex: 1, isCorrect: true },
      { text: 'Afirma sin ejecutar los tests' },
    ]);
  });

  it('marks a wrong option as incorrect', () => {
    expect(buildAnswers([multiple], [0])).toEqual([{ selectedIndex: 0, isCorrect: false }]);
  });
});

describe('restoreAnswers', () => {
  it('restores selected indexes and written text from a saved response', () => {
    expect(restoreAnswers([multiple, open], [{ selectedIndex: 1, isCorrect: true }, { text: 'Escrito' }])).toEqual([1, 'Escrito']);
  });

  it('fills missing answers with null', () => {
    expect(restoreAnswers([multiple, open], [])).toEqual([null, null]);
  });
});

describe('scoreSummary', () => {
  it('counts only multiple-choice questions', () => {
    expect(scoreSummary([multiple, open, multiple], [1, 'texto', 0])).toEqual({ correct: 1, gradable: 2, open: 1 });
  });
});
