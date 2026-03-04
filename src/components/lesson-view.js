import { LitElement, html, css } from 'lit';
import { fetchLesson, fetchAllModules, fetchLessons } from '../lib/firebase/modules.js';
import { getNextLesson, getPrevLesson } from '../lib/learning-path.js';
import { waitForAuth } from '../lib/auth-ready.js';
import './video-player.js';
import './markdown-content.js';
import './lesson-nav.js';
import './lesson-qa.js';

/**
 * @element lesson-view
 * Displays a lesson with embedded video and documentation.
 *
 * Uses data-module-id and data-lesson-id attributes.
 */
export class LessonView extends LitElement {
  static properties = {
    _lesson: { type: Object, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
    _prevRef: { type: Object, state: true },
    _nextRef: { type: Object, state: true },
  };

  static styles = css`
    :host {
      display: block;
    }

    .lesson-header {
      margin-bottom: 1.5rem;
    }

    .lesson-header h1 {
      font-size: 1.5rem;
      font-weight: 900;
      color: var(--color-text-primary, #0f172a);
      margin-bottom: 0.25rem;
    }

    .lesson-header p {
      color: var(--color-text-secondary, #64748b);
      font-size: 0.938rem;
    }

    .video-section {
      margin-bottom: 2rem;
    }

    .docs-section {
      background: #fff;
      padding: 2rem;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
      line-height: 1.7;
      color: #334155;
    }

    .docs-section h2 {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 1rem;
    }

    .docs-content {
      white-space: pre-wrap;
      font-size: 0.938rem;
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
      border-top-color: #ec1313;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin: 0 auto 0.75rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-msg {
      text-align: center;
      padding: 3rem;
      color: #991b1b;
    }
  `;

  constructor() {
    super();
    this._lesson = null;
    this._loading = true;
    this._error = '';
    this._prevRef = null;
    this._nextRef = null;
  }

  connectedCallback() {
    super.connectedCallback();
    const params = new URLSearchParams(window.location.search);
    this._moduleId = this.dataset.moduleId || params.get('m');
    this._lessonId = this.dataset.lessonId || params.get('l');
    if (this._moduleId && this._lessonId) {
      waitForAuth().then(() => this._loadLesson(this._moduleId, this._lessonId));
    } else {
      this._loading = false;
      this._error = 'No se encontró la clase';
    }
  }

  async _loadLesson(moduleId, lessonId) {
    this._loading = true;
    const result = await fetchLesson(moduleId, lessonId);

    if (result.success) {
      this._lesson = result.lesson;
      await this._loadNavigation(moduleId, lessonId);
    } else {
      this._error = result.error;
    }

    this._loading = false;
  }

  async _loadNavigation(moduleId, lessonId) {
    const modulesResult = await fetchAllModules();
    if (!modulesResult.success) return;

    const lessonsByModule = {};
    for (const mod of modulesResult.modules) {
      const res = await fetchLessons(mod.id);
      lessonsByModule[mod.id] = res.success ? res.lessons : [];
    }

    this._prevRef = getPrevLesson(modulesResult.modules, lessonsByModule, moduleId, lessonId);
    this._nextRef = getNextLesson(modulesResult.modules, lessonsByModule, moduleId, lessonId);
  }

  render() {
    if (this._loading) {
      return html`<div class="loading"><div class="spinner"></div><p>Cargando clase...</p></div>`;
    }

    if (this._error) {
      return html`<div class="error-msg">${this._error}</div>`;
    }

    return html`
      <div class="lesson-header">
        <h1>${this._lesson.title}</h1>
        ${this._lesson.description ? html`<p>${this._lesson.description}</p>` : ''}
      </div>

      <div class="video-section">
        <video-player url=${this._lesson.videoUrl || ''}></video-player>
      </div>

      ${this._lesson.documentation ? html`
        <div class="docs-section">
          <h2>Documentación</h2>
          <markdown-content .content=${this._lesson.documentation}></markdown-content>
        </div>
      ` : ''}

      <lesson-qa
        lessonId=${this._lessonId || ''}
        moduleId=${this._moduleId || ''}
      ></lesson-qa>

      <lesson-nav
        prev-module=${this._prevRef?.moduleId || ''}
        prev-lesson=${this._prevRef?.lessonId || ''}
        next-module=${this._nextRef?.moduleId || ''}
        next-lesson=${this._nextRef?.lessonId || ''}
      ></lesson-nav>
    `;
  }
}

customElements.define('lesson-view', LessonView);
