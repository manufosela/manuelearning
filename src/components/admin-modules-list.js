import { LitElement, html, css } from 'lit';
import {
  fetchAllModules,
  createModule,
  updateModule,
  deleteModule,
  fetchLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  validateModule,
  validateLesson,
} from '../lib/firebase/modules.js';
import { waitForAuth } from '../lib/auth-ready.js';

/**
 * @element admin-modules-list
 * Admin panel for managing course modules and their lessons.
 */
export class AdminModulesList extends LitElement {
  static properties = {
    _modules: { type: Array, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
    _expandedModule: { type: String, state: true },
    _moduleLessons: { type: Object, state: true },
    _showModuleForm: { type: Boolean, state: true },
    _editingModuleId: { type: String, state: true },
    _moduleFormData: { type: Object, state: true },
    _moduleFormError: { type: String, state: true },
    _showLessonForm: { type: Boolean, state: true },
    _editingLessonId: { type: String, state: true },
    _lessonFormModuleId: { type: String, state: true },
    _lessonFormData: { type: Object, state: true },
    _lessonFormError: { type: String, state: true },
    _saving: { type: Boolean, state: true },
  };

  static styles = css`
    :host { display: block; }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.813rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background-color 0.15s;
    }

    .btn--primary { background: #ec1313; color: #fff; }
    .btn--primary:hover { background: #d11111; }
    .btn--secondary { background: #f1f5f9; color: #334155; }
    .btn--secondary:hover { background: #e2e8f0; }
    .btn--danger { background: #fef2f2; color: #991b1b; }
    .btn--danger:hover { background: #fee2e2; }
    .btn--small { padding: 0.375rem 0.75rem; font-size: 0.75rem; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .module-card {
      background: #fff;
      border-radius: 0.75rem;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      margin-bottom: 1rem;
      overflow: hidden;
    }

    .module-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      cursor: pointer;
      transition: background 0.15s;
    }

    .module-header:hover { background: #f8fafc; }

    .module-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .module-order {
      width: 2rem;
      height: 2rem;
      border-radius: 0.375rem;
      background: #ec1313;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .module-title {
      font-weight: 700;
      color: #0f172a;
      font-size: 0.938rem;
    }

    .module-desc {
      font-size: 0.813rem;
      color: #64748b;
      margin-top: 0.125rem;
    }

    .module-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .lessons-panel {
      border-top: 1px solid #f1f5f9;
      padding: 1rem 1.25rem;
      background: #fafbfc;
    }

    .lessons-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .lessons-header h4 {
      font-size: 0.813rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .lesson-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.625rem 0.75rem;
      background: #fff;
      border-radius: 0.5rem;
      margin-bottom: 0.5rem;
      border: 1px solid #e2e8f0;
    }

    .lesson-info {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }

    .lesson-order {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50%;
      background: #f1f5f9;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.688rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .lesson-title {
      font-size: 0.875rem;
      color: #0f172a;
      font-weight: 500;
    }

    .lesson-meta {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .lesson-badge {
      font-size: 0.688rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      background: #f0fdf4;
      color: #166534;
      font-weight: 600;
    }

    .lesson-badge--empty {
      background: #fef2f2;
      color: #991b1b;
    }

    /* Form overlay */
    .form-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .form-card {
      background: #fff;
      border-radius: 0.75rem;
      padding: 2rem;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
      max-height: 90vh;
      overflow-y: auto;
    }

    .form-card h3 {
      margin: 0 0 1.5rem;
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      font-size: 0.813rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.375rem;
    }

    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-family: inherit;
      box-sizing: border-box;
    }

    .form-group textarea {
      min-height: 100px;
      resize: vertical;
    }

    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #ec1313;
      box-shadow: 0 0 0 3px rgba(236, 19, 19, 0.1);
    }

    .form-error {
      color: #991b1b;
      font-size: 0.813rem;
      margin-bottom: 1rem;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1.5rem;
    }

    .loading, .error-msg {
      text-align: center;
      padding: 3rem;
      color: #475569;
    }

    .error-msg { color: #991b1b; }

    .spinner {
      width: 1.5rem;
      height: 1.5rem;
      border: 3px solid #e2e8f0;
      border-top-color: #ec1313;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin: 0 auto 0.75rem;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #64748b;
    }

    .empty-state .material-symbols-outlined {
      font-size: 3rem;
      color: #cbd5e1;
      margin-bottom: 0.75rem;
    }

    .no-lessons {
      text-align: center;
      padding: 1.5rem;
      color: #94a3b8;
      font-size: 0.813rem;
    }
  `;

  constructor() {
    super();
    this._modules = [];
    this._loading = true;
    this._error = '';
    this._expandedModule = null;
    this._moduleLessons = {};
    this._showModuleForm = false;
    this._editingModuleId = null;
    this._moduleFormData = this._emptyModuleForm();
    this._moduleFormError = '';
    this._showLessonForm = false;
    this._editingLessonId = null;
    this._lessonFormModuleId = null;
    this._lessonFormData = this._emptyLessonForm();
    this._lessonFormError = '';
    this._saving = false;
  }

  connectedCallback() {
    super.connectedCallback();
    waitForAuth().then(() => this._loadModules());
  }

  _emptyModuleForm() {
    return { title: '', description: '', order: 0 };
  }

  _emptyLessonForm() {
    return { title: '', description: '', order: 0, videoUrl: '', documentation: '' };
  }

  async _loadModules() {
    this._loading = true;
    this._error = '';
    const result = await fetchAllModules();
    this._loading = false;
    if (result.success) {
      this._modules = result.modules;
    } else {
      this._error = result.error;
    }
  }

  async _toggleExpand(moduleId) {
    if (this._expandedModule === moduleId) {
      this._expandedModule = null;
      return;
    }
    this._expandedModule = moduleId;
    if (!this._moduleLessons[moduleId]) {
      const result = await fetchLessons(moduleId);
      if (result.success) {
        this._moduleLessons = { ...this._moduleLessons, [moduleId]: result.lessons };
      }
    }
  }

  /* ── Module form ───── */

  _openCreateModule() {
    this._editingModuleId = null;
    this._moduleFormData = { ...this._emptyModuleForm(), order: this._modules.length + 1 };
    this._moduleFormError = '';
    this._showModuleForm = true;
  }

  _openEditModule(mod) {
    this._editingModuleId = mod.id;
    this._moduleFormData = { title: mod.title, description: mod.description || '', order: mod.order };
    this._moduleFormError = '';
    this._showModuleForm = true;
  }

  _closeModuleForm() {
    this._showModuleForm = false;
    this._editingModuleId = null;
    this._moduleFormError = '';
  }

  _handleModuleInput(e) {
    const input = /** @type {HTMLInputElement} */ (e.target);
    const value = input.name === 'order' ? parseInt(input.value, 10) || 0 : input.value;
    this._moduleFormData = { ...this._moduleFormData, [input.name]: value };
  }

  async _handleModuleSubmit(e) {
    e.preventDefault();
    this._moduleFormError = '';

    const validation = validateModule(this._moduleFormData);
    if (!validation.valid) {
      this._moduleFormError = validation.error;
      return;
    }

    this._saving = true;

    if (this._editingModuleId) {
      const result = await updateModule(this._editingModuleId, this._moduleFormData);
      this._saving = false;
      if (result.success) {
        this._closeModuleForm();
        await this._loadModules();
      } else {
        this._moduleFormError = result.error;
      }
    } else {
      const result = await createModule(this._moduleFormData);
      this._saving = false;
      if (result.success) {
        this._closeModuleForm();
        await this._loadModules();
      } else {
        this._moduleFormError = result.error;
      }
    }
  }

  async _handleDeleteModule(mod) {
    const result = await deleteModule(mod.id);
    if (result.success) {
      await this._loadModules();
      if (this._expandedModule === mod.id) this._expandedModule = null;
    }
  }

  /* ── Lesson form ───── */

  _openCreateLesson(moduleId) {
    this._lessonFormModuleId = moduleId;
    this._editingLessonId = null;
    const lessons = this._moduleLessons[moduleId] || [];
    this._lessonFormData = { ...this._emptyLessonForm(), order: lessons.length + 1 };
    this._lessonFormError = '';
    this._showLessonForm = true;
  }

  _openEditLesson(moduleId, lesson) {
    this._lessonFormModuleId = moduleId;
    this._editingLessonId = lesson.id;
    this._lessonFormData = {
      title: lesson.title,
      description: lesson.description || '',
      order: lesson.order,
      videoUrl: lesson.videoUrl || '',
      documentation: lesson.documentation || '',
    };
    this._lessonFormError = '';
    this._showLessonForm = true;
  }

  _closeLessonForm() {
    this._showLessonForm = false;
    this._editingLessonId = null;
    this._lessonFormModuleId = null;
    this._lessonFormError = '';
  }

  _handleLessonInput(e) {
    const input = /** @type {HTMLInputElement|HTMLTextAreaElement} */ (e.target);
    const value = input.name === 'order' ? parseInt(input.value, 10) || 0 : input.value;
    this._lessonFormData = { ...this._lessonFormData, [input.name]: value };
  }

  async _handleLessonSubmit(e) {
    e.preventDefault();
    this._lessonFormError = '';

    const validation = validateLesson(this._lessonFormData);
    if (!validation.valid) {
      this._lessonFormError = validation.error;
      return;
    }

    this._saving = true;
    const mid = this._lessonFormModuleId;

    if (this._editingLessonId) {
      const result = await updateLesson(mid, this._editingLessonId, this._lessonFormData);
      this._saving = false;
      if (result.success) {
        this._closeLessonForm();
        const res = await fetchLessons(mid);
        if (res.success) this._moduleLessons = { ...this._moduleLessons, [mid]: res.lessons };
      } else {
        this._lessonFormError = result.error;
      }
    } else {
      const result = await createLesson(mid, this._lessonFormData);
      this._saving = false;
      if (result.success) {
        this._closeLessonForm();
        const res = await fetchLessons(mid);
        if (res.success) this._moduleLessons = { ...this._moduleLessons, [mid]: res.lessons };
      } else {
        this._lessonFormError = result.error;
      }
    }
  }

  async _handleDeleteLesson(moduleId, lessonId) {
    const result = await deleteLesson(moduleId, lessonId);
    if (result.success) {
      const res = await fetchLessons(moduleId);
      if (res.success) this._moduleLessons = { ...this._moduleLessons, [moduleId]: res.lessons };
    }
  }

  /* ── Render ───── */

  render() {
    if (this._loading) {
      return html`<div class="loading"><div class="spinner"></div><p>Cargando módulos...</p></div>`;
    }

    if (this._error) {
      return html`<div class="error-msg">${this._error}</div>`;
    }

    return html`
      <div class="toolbar">
        <span>${this._modules.length} módulo${this._modules.length !== 1 ? 's' : ''}</span>
        <button class="btn btn--primary" @click=${this._openCreateModule}>
          <span class="material-symbols-outlined">add</span>
          Nuevo módulo
        </button>
      </div>

      ${this._modules.length === 0
        ? html`<div class="empty-state"><span class="material-symbols-outlined">menu_book</span><p>No hay módulos creados</p></div>`
        : this._modules.map((mod) => this._renderModule(mod))}

      ${this._showModuleForm ? this._renderModuleForm() : ''}
      ${this._showLessonForm ? this._renderLessonForm() : ''}
    `;
  }

  _renderModule(mod) {
    const isExpanded = this._expandedModule === mod.id;
    const lessons = this._moduleLessons[mod.id] || [];

    return html`
      <div class="module-card">
        <div class="module-header" @click=${() => this._toggleExpand(mod.id)}>
          <div class="module-info">
            <div class="module-order">${mod.order}</div>
            <div>
              <div class="module-title">${mod.title}</div>
              ${mod.description ? html`<div class="module-desc">${mod.description}</div>` : ''}
            </div>
          </div>
          <div class="module-actions">
            <button class="btn btn--secondary btn--small" @click=${(e) => { e.stopPropagation(); this._openEditModule(mod); }}>Editar</button>
            <button class="btn btn--danger btn--small" @click=${(e) => { e.stopPropagation(); this._handleDeleteModule(mod); }}>Eliminar</button>
            <span class="material-symbols-outlined">${isExpanded ? 'expand_less' : 'expand_more'}</span>
          </div>
        </div>

        ${isExpanded ? html`
          <div class="lessons-panel">
            <div class="lessons-header">
              <h4>Clases (${lessons.length})</h4>
              <button class="btn btn--primary btn--small" @click=${() => this._openCreateLesson(mod.id)}>
                <span class="material-symbols-outlined">add</span> Clase
              </button>
            </div>

            ${lessons.length === 0
              ? html`<div class="no-lessons">No hay clases en este módulo</div>`
              : lessons.map((lesson) => html`
                  <div class="lesson-item">
                    <div class="lesson-info">
                      <div class="lesson-order">${lesson.order}</div>
                      <div class="lesson-title">${lesson.title}</div>
                    </div>
                    <div class="lesson-meta">
                      <span class="lesson-badge ${lesson.videoUrl ? '' : 'lesson-badge--empty'}">
                        ${lesson.videoUrl ? 'Video' : 'Sin video'}
                      </span>
                      <span class="lesson-badge ${lesson.documentation ? '' : 'lesson-badge--empty'}">
                        ${lesson.documentation ? 'Docs' : 'Sin docs'}
                      </span>
                      <button class="btn btn--secondary btn--small" @click=${() => this._openEditLesson(mod.id, lesson)}>Editar</button>
                      <button class="btn btn--danger btn--small" @click=${() => this._handleDeleteLesson(mod.id, lesson.id)}>Eliminar</button>
                    </div>
                  </div>
                `)}
          </div>
        ` : ''}
      </div>
    `;
  }

  _renderModuleForm() {
    const title = this._editingModuleId ? 'Editar módulo' : 'Nuevo módulo';
    return html`
      <div class="form-overlay" @click=${this._closeModuleForm}>
        <div class="form-card" @click=${(e) => e.stopPropagation()}>
          <h3>${title}</h3>
          <form @submit=${this._handleModuleSubmit}>
            <div class="form-group">
              <label for="mod-title">Título</label>
              <input id="mod-title" name="title" type="text" .value=${this._moduleFormData.title} @input=${this._handleModuleInput} required />
            </div>
            <div class="form-group">
              <label for="mod-desc">Descripción</label>
              <input id="mod-desc" name="description" type="text" .value=${this._moduleFormData.description} @input=${this._handleModuleInput} />
            </div>
            <div class="form-group">
              <label for="mod-order">Orden</label>
              <input id="mod-order" name="order" type="number" min="0" .value=${String(this._moduleFormData.order)} @input=${this._handleModuleInput} required />
            </div>
            ${this._moduleFormError ? html`<div class="form-error">${this._moduleFormError}</div>` : ''}
            <div class="form-actions">
              <button type="button" class="btn btn--secondary" @click=${this._closeModuleForm}>Cancelar</button>
              <button type="submit" class="btn btn--primary" ?disabled=${this._saving}>
                ${this._saving ? 'Guardando...' : this._editingModuleId ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  _renderLessonForm() {
    const title = this._editingLessonId ? 'Editar clase' : 'Nueva clase';
    return html`
      <div class="form-overlay" @click=${this._closeLessonForm}>
        <div class="form-card" @click=${(e) => e.stopPropagation()}>
          <h3>${title}</h3>
          <form @submit=${this._handleLessonSubmit}>
            <div class="form-group">
              <label for="les-title">Título</label>
              <input id="les-title" name="title" type="text" .value=${this._lessonFormData.title} @input=${this._handleLessonInput} required />
            </div>
            <div class="form-group">
              <label for="les-desc">Descripción</label>
              <input id="les-desc" name="description" type="text" .value=${this._lessonFormData.description} @input=${this._handleLessonInput} />
            </div>
            <div class="form-group">
              <label for="les-order">Orden</label>
              <input id="les-order" name="order" type="number" min="0" .value=${String(this._lessonFormData.order)} @input=${this._handleLessonInput} required />
            </div>
            <div class="form-group">
              <label for="les-video">URL de Video (YouTube)</label>
              <input id="les-video" name="videoUrl" type="url" .value=${this._lessonFormData.videoUrl} @input=${this._handleLessonInput} placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div class="form-group">
              <label for="les-docs">Documentación (Markdown)</label>
              <textarea id="les-docs" name="documentation" .value=${this._lessonFormData.documentation} @input=${this._handleLessonInput} placeholder="# Título de la clase..."></textarea>
            </div>
            ${this._lessonFormError ? html`<div class="form-error">${this._lessonFormError}</div>` : ''}
            <div class="form-actions">
              <button type="button" class="btn btn--secondary" @click=${this._closeLessonForm}>Cancelar</button>
              <button type="submit" class="btn btn--primary" ?disabled=${this._saving}>
                ${this._saving ? 'Guardando...' : this._editingLessonId ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
}

customElements.define('admin-modules-list', AdminModulesList);
