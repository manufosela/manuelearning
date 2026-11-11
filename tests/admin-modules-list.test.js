import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  modulesApi, notifyApi, MODULES, resetModulesApi, settle,
  mountModulesList, $, $$, button, typeInto, submitForm,
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
vi.mock('../src/lib/firebase/user-notifications.js', async () => {
  const { notifyApi: api } = await import('./helpers/admin-modules-setup.js');
  return { notifyUsers: (...a) => api.notifyUsers(...a) };
});
vi.mock('../src/lib/auth-ready.js', () => ({ waitForAuth: vi.fn(() => Promise.resolve({ uid: 'admin' })) }));

await import('../src/components/admin-modules-list.js');

beforeEach(() => resetModulesApi());
afterEach(() => { document.body.innerHTML = ''; });

describe('admin-modules-list: modules', () => {
  it('shows the load error and the empty state', async () => {
    modulesApi.fetchAllModules.mockResolvedValueOnce({ success: false, error: 'Sin acceso' });
    expect($(await mountModulesList(), '.error-msg').textContent).toContain('Sin acceso');
    document.body.innerHTML = '';
    modulesApi.fetchAllModules.mockResolvedValueOnce({ success: true, modules: [] });
    expect($(await mountModulesList(), '.empty-state').textContent).toContain('No hay módulos');
  });

  it('filters by course and by search text', async () => {
    const el = await mountModulesList();
    expect($$(el, '.module-card')).toHaveLength(2);
    await typeInto(el, '.search-input', 'compose');
    expect($$(el, '.module-title').map((t) => t.textContent.trim())).toEqual([expect.stringContaining('Compose')]);
    await typeInto(el, '.search-input', 'zzz');
    expect($(el, '.no-results')).not.toBeNull();
    await typeInto(el, '.search-input', '');
    await typeInto(el, '#course-select', 'docker', 'change');
    await settle(el);
    expect(modulesApi.fetchModulesByCourse).toHaveBeenCalledWith('docker');
  });

  it('creates a module and notifies the students', async () => {
    const el = await mountModulesList();
    button(el.shadowRoot, 'add').click();
    await el.updateComplete;
    expect($(el, '#mod-order').value).toBe('3');
    await typeInto(el, '#mod-title', 'Redes');
    await typeInto(el, '#mod-order', 'x');
    const notify = $(el, '#notify-module');
    notify.checked = true;
    notify.dispatchEvent(new Event('change'));
    await submitForm(el);
    expect(modulesApi.createModule.mock.calls[0][0]).toMatchObject({ title: 'Redes', order: 0 });
    expect(notifyApi.notifyUsers).toHaveBeenCalledWith(['s1'], expect.objectContaining({ type: 'new_module' }));
    expect($(el, '.form-card')).toBeNull();
  });

  it('validates the module form and shows save errors', async () => {
    const el = await mountModulesList();
    button(el.shadowRoot, 'Editar').click();
    await el.updateComplete;
    await typeInto(el, '#mod-title', '');
    await submitForm(el);
    expect($(el, '.form-error')).not.toBeNull();
    await typeInto(el, '#mod-title', 'Docker avanzado');
    modulesApi.updateModule.mockResolvedValueOnce({ success: false, error: 'No se pudo guardar' });
    await submitForm(el);
    expect($(el, '.form-error').textContent).toContain('No se pudo guardar');
    await submitForm(el);
    expect(modulesApi.updateModule).toHaveBeenLastCalledWith('m1', expect.objectContaining({ title: 'Docker avanzado' }));
    expect($(el, '.form-card')).toBeNull();
  });

  it('reorders and deletes modules', async () => {
    const el = await mountModulesList();
    const [up, down] = $$(el, '.module-card')[0].querySelectorAll('.reorder-btn');
    expect(up.disabled).toBe(true);
    down.click();
    await settle(el);
    expect(modulesApi.reorderModule).toHaveBeenCalledWith(MODULES, 'm1', 'down');
    button(el.shadowRoot, 'Eliminar').click();
    await settle(el);
    expect(modulesApi.deleteModule).toHaveBeenCalledWith('m1');
  });
});
