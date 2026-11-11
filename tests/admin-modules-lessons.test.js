import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  modulesApi, quizApi, usersApi, resetModulesApi, settle,
  mountModulesList, expandFirstModule, $, $$, button, typeInto, submitForm,
} from './helpers/admin-modules-setup.js';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));
vi.mock('../src/lib/firebase/modules.js', async (importOriginal) => {
  const { modulesApi: api } = await import('./helpers/admin-modules-setup.js');
  const actual = await importOriginal();
  return { ...actual, ...Object.fromEntries(Object.keys(api).map((k) => [k, (...a) => api[k](...a)])) };
});
vi.mock('../src/lib/firebase/quizzes.js', async (importOriginal) => {
  const { quizApi: api } = await import('./helpers/admin-modules-setup.js');
  return { validateQuiz: (await importOriginal()).validateQuiz, ...Object.fromEntries(Object.keys(api).map((k) => [k, (...a) => api[k](...a)])) };
});
vi.mock('../src/lib/firebase/users.js', async () => {
  const { usersApi: api } = await import('./helpers/admin-modules-setup.js');
  return { fetchAllUsers: (...a) => api.fetchAllUsers(...a) };
});
vi.mock('../src/lib/firebase/user-notifications.js', () => ({ notifyUsers: vi.fn() }));
vi.mock('../src/lib/auth-ready.js', () => ({ waitForAuth: vi.fn(() => Promise.resolve({ uid: 'admin' })) }));

await import('../src/components/admin-modules-list.js');

beforeEach(() => resetModulesApi());
afterEach(() => { document.body.innerHTML = ''; });

describe('admin-modules-list: lessons', () => {
  it('expands a module with its lessons and collapses it again', async () => {
    const el = await mountModulesList();
    await expandFirstModule(el);
    expect($$(el, '.lesson-item')).toHaveLength(2);
    expect($(el, '.lesson-badge--instructor').textContent).toBe('Formador');
    expect($$(el, '.lesson-badge--empty')).toHaveLength(2);
    await expandFirstModule(el);
    expect($(el, '.lessons-panel')).toBeNull();
  });

  it('creates a lesson with a markdown preview', async () => {
    const el = await mountModulesList();
    await expandFirstModule(el);
    button($(el, '.lessons-header'), 'add').click();
    await el.updateComplete;
    expect($(el, '#les-order').value).toBe('3');
    await typeInto(el, '#les-title', 'Volúmenes');
    await typeInto(el, '#les-docs', '# Volúmenes');
    button(el.shadowRoot, 'Vista previa').click();
    await el.updateComplete;
    expect($(el, '.md-preview h1').textContent).toBe('Volúmenes');
    await submitForm(el);
    expect(modulesApi.createLesson).toHaveBeenCalledWith('m1', expect.objectContaining({ title: 'Volúmenes', order: 3 }));
  });

  it('edits, reorders and deletes lessons, and reports save errors', async () => {
    const el = await mountModulesList();
    await expandFirstModule(el);
    button($$(el, '.lesson-item')[1], 'Editar').click();
    await el.updateComplete;
    expect($(el, '#les-audience').value).toBe('instructor');
    modulesApi.updateLesson.mockResolvedValueOnce({ success: false, error: 'Fallo' });
    await submitForm(el);
    expect($(el, '.form-error').textContent).toContain('Fallo');
    await typeInto(el, '#les-title', '');
    await submitForm(el);
    expect(modulesApi.updateLesson).toHaveBeenCalledTimes(1);
    button(el.shadowRoot, 'Cancelar').click();
    await el.updateComplete;

    $$(el, '.lesson-item')[0].querySelectorAll('.reorder-btn')[1].click();
    await settle(el);
    expect(modulesApi.reorderLesson).toHaveBeenCalledWith('m1', expect.any(Array), 'l1', 'down');
    button($$(el, '.lesson-item')[0], 'Eliminar').click();
    await settle(el);
    expect(modulesApi.deleteLesson).toHaveBeenCalledWith('m1', 'l1');
    expect(quizApi.createQuiz).not.toHaveBeenCalled();
    expect(usersApi.fetchAllUsers).not.toHaveBeenCalled();
  });
});

describe('admin-modules-list: lesson quiz', () => {
  async function openQuiz() {
    const el = await mountModulesList();
    await expandFirstModule(el);
    button($$(el, '.lesson-item')[0], 'quiz').click();
    await settle(el);
    return el;
  }
  const fieldsets = (el) => $$(el, 'fieldset');
  const typeIn = async (el, node, value) => {
    node.value = value;
    node.dispatchEvent(new Event('input'));
    await el.updateComplete;
  };

  it('validates each question before creating the quiz', async () => {
    const el = await openQuiz();
    await submitForm(el);
    expect($(el, '.form-error').textContent).toContain('Pregunta 1: el texto es obligatorio');
    await typeIn(el, fieldsets(el)[0].querySelector('textarea'), '¿Qué es una imagen?');
    await submitForm(el);
    expect($(el, '.form-error').textContent).toContain('la respuesta correcta no puede estar vacía');

    const options = [...fieldsets(el)[0].querySelectorAll('input[type="text"]')];
    await typeIn(el, options[0], 'Una plantilla');
    await submitForm(el);
    expect($(el, '.form-error').textContent).toContain('al menos 3 opciones');
    await typeIn(el, options[1], 'Un contenedor');
    await typeIn(el, options[2], 'Un volumen');
    await typeIn(el, fieldsets(el)[0].querySelectorAll('textarea')[1], 'Las imágenes son plantillas');
    await submitForm(el);
    expect(quizApi.createQuiz.mock.calls[0][0]).toEqual({
      title: 'Quiz: Contenedores', moduleId: 'm1', lessonId: 'l1',
      questions: [{ text: '¿Qué es una imagen?', type: 'multiple', options: ['Una plantilla', 'Un contenedor', 'Un volumen'], correctAnswer: 0, explanation: 'Las imágenes son plantillas' }],
    });
    expect($(el, 'fieldset')).toBeNull();
  });

  it('edits an existing quiz: questions, options and the correct answer', async () => {
    quizApi.fetchQuizByLesson.mockResolvedValueOnce({
      success: true,
      quiz: { id: 'qz1', questions: [{ text: 'P1', options: ['a', 'b', 'c', 'd'], correctAnswer: 3 }, { text: 'P2' }] },
    });
    const el = await openQuiz();
    expect(fieldsets(el)).toHaveLength(2);
    button(fieldsets(el)[1], 'Eliminar').click();
    await el.updateComplete;
    fieldsets(el)[0].querySelectorAll('.remove-option')[0].click();
    await el.updateComplete;
    fieldsets(el)[0].querySelectorAll('input[type="radio"]')[1].dispatchEvent(new Event('change'));
    await el.updateComplete;
    button(el.shadowRoot, '+ Añadir opción').click();
    await el.updateComplete;
    button($(el, 'form'), 'add').click();
    await el.updateComplete;
    button($(el, 'form'), 'add').click();
    await el.updateComplete;
    expect(el.shadowRoot.textContent).toContain('Máximo 3 preguntas');
    button(fieldsets(el)[2], 'Eliminar').click();
    button(fieldsets(el)[1], 'Eliminar').click();
    await el.updateComplete;
    await submitForm(el);
    expect(quizApi.updateQuiz.mock.calls[0][0]).toBe('qz1');
    expect(quizApi.updateQuiz.mock.calls[0][1].questions[0]).toMatchObject({ options: ['b', 'c', 'd'], correctAnswer: 1 });
  });

  it('reports load and save errors and closes on cancel', async () => {
    quizApi.fetchQuizByLesson.mockResolvedValueOnce({ success: false, error: 'No se pudo cargar' });
    let el = await openQuiz();
    expect($(el, '.form-error').textContent).toContain('No se pudo cargar');
    button(el.shadowRoot, 'Cancelar').click();
    await el.updateComplete;
    expect($(el, 'fieldset')).toBeNull();
    document.body.innerHTML = '';

    quizApi.fetchQuizByLesson.mockRejectedValueOnce(new Error('x'));
    el = await openQuiz();
    expect($(el, '.form-error').textContent).toContain('Error inesperado');
  });
});
