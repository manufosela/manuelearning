import { LitElement, html, css } from 'lit';
import { fetchAllModules, fetchLessons } from '../lib/firebase/modules.js';
import { buildLearningPath } from '../lib/learning-path.js';
import { waitForAuth } from '../lib/auth-ready.js';

/**
 * @element learning-path-view
 * Displays the course learning path with modules and lessons.
 */
export class LearningPathView extends LitElement {
  static properties = {
    _path: { type: Array, state: true },
    _modules: { type: Array, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
  };

  static styles = css`
    :host {
      display: block;
    }

    .path-header {
      margin-bottom: 2rem;
    }

    .path-header h1 {
      font-size: 1.5rem;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 0.25rem;
    }

    .path-header p {
      color: #64748b;
      font-size: 0.938rem;
    }

    .module-group {
      margin-bottom: 1.5rem;
    }

    .module-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .module-number {
      width: 2rem;
      height: 2rem;
      border-radius: 0.375rem;
      background: #84cc16;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .module-name {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
    }

    .lesson-list {
      list-style: none;
      padding: 0;
      margin: 0 0 0 1rem;
      border-left: 2px solid #e2e8f0;
    }

    .lesson-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      margin-left: 1rem;
      border-radius: 0.5rem;
      text-decoration: none;
      color: #334155;
      font-size: 0.875rem;
      transition: background 0.15s;
    }

    .lesson-link:hover {
      background: #f1f5f9;
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

    .lesson-name {
      font-weight: 500;
    }

    .loading {
      text-align: center;
      padding: 3rem;
      color: #475569;
    }

    .spinner {
      width: 1.5rem;
      height: 1.5rem;
      border: 3px solid #e2e8f0;
      border-top-color: #84cc16;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin: 0 auto 0.75rem;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .error-msg {
      text-align: center;
      padding: 3rem;
      color: #991b1b;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #64748b;
    }
  `;

  constructor() {
    super();
    this._path = [];
    this._modules = [];
    this._loading = true;
    this._error = '';
  }

  connectedCallback() {
    super.connectedCallback();
    waitForAuth().then(() => this._loadPath());
  }

  async _loadPath() {
    this._loading = true;
    const result = await fetchAllModules();

    if (!result.success) {
      this._loading = false;
      this._error = result.error;
      return;
    }

    this._modules = result.modules;
    const lessonsByModule = {};

    for (const mod of result.modules) {
      const lessonsResult = await fetchLessons(mod.id);
      lessonsByModule[mod.id] = lessonsResult.success ? lessonsResult.lessons : [];
    }

    this._path = buildLearningPath(result.modules, lessonsByModule);
    this._loading = false;
  }

  render() {
    if (this._loading) {
      return html`<div class="loading"><div class="spinner"></div><p>Cargando temario...</p></div>`;
    }

    if (this._error) {
      return html`<div class="error-msg">${this._error}</div>`;
    }

    if (this._path.length === 0) {
      return html`<div class="empty-state"><p>No hay contenido disponible</p></div>`;
    }

    const grouped = this._groupByModule();

    return html`
      <div class="path-header">
        <h1>Temario del curso</h1>
        <p>${this._path.length} clases en ${this._modules.length} módulos</p>
      </div>

      ${grouped.map(
        (group, i) => html`
          <div class="module-group">
            <div class="module-title">
              <div class="module-number">${i + 1}</div>
              <div class="module-name">${group.moduleTitle}</div>
            </div>
            <ul class="lesson-list">
              ${group.lessons.map(
                (item) => html`
                  <li>
                    <a href="/leccion?m=${item.moduleId}&l=${item.lessonId}" class="lesson-link">
                      <div class="lesson-order">${item.index + 1}</div>
                      <span class="lesson-name">${item.lessonTitle}</span>
                    </a>
                  </li>
                `
              )}
            </ul>
          </div>
        `
      )}
    `;
  }

  _groupByModule() {
    const groups = [];
    let current = null;

    for (const item of this._path) {
      if (!current || current.moduleId !== item.moduleId) {
        current = { moduleId: item.moduleId, moduleTitle: item.moduleTitle, lessons: [] };
        groups.push(current);
      }
      current.lessons.push(item);
    }

    return groups;
  }
}

customElements.define('learning-path-view', LearningPathView);
