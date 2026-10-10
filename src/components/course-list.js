import { LitElement, html } from 'lit';
import { fetchPublishedCourses } from '../lib/firebase/courses.js';
import { fetchAllModules } from '../lib/firebase/modules.js';

/**
 * Count modules per course slug.
 * @param {{ course?: string }[]} modules
 * @returns {Map<string, number>}
 */
export function countModulesByCourse(modules) {
  const counts = new Map();
  for (const mod of modules) {
    if (!mod.course) continue;
    counts.set(mod.course, (counts.get(mod.course) ?? 0) + 1);
  }
  return counts;
}

/**
 * @element course-list
 * Public catalogue: one card per published course, with its real module count.
 */
export class CourseList extends LitElement {
  static properties = {
    _courses: { type: Array, state: true },
    _moduleCounts: { type: Object, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
  };

  constructor() {
    super();
    this._courses = [];
    this._moduleCounts = new Map();
    this._loading = true;
    this._error = '';
  }

  /** Light DOM: the page's global styles and Material Symbols font apply. */
  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this._load();
  }

  async _load() {
    this._loading = true;
    const [coursesResult, modulesResult] = await Promise.all([fetchPublishedCourses(), fetchAllModules()]);
    if (!coursesResult.success) {
      this._error = coursesResult.error;
      this._loading = false;
      return;
    }
    this._courses = coursesResult.courses;
    this._moduleCounts = countModulesByCourse(modulesResult.success ? modulesResult.modules : []);
    this._loading = false;
  }

  render() {
    if (this._loading) return html`<p class="courses-state" role="status">Cargando cursos...</p>`;
    if (this._error) return html`<p class="courses-state courses-state--error" role="alert">${this._error}</p>`;
    if (this._courses.length === 0) return html`<p class="courses-state">Todavía no hay cursos publicados.</p>`;

    return html`
      <div class="courses-grid">
        ${this._courses.map((course) => this._renderCard(course))}
      </div>
    `;
  }

  _renderCard(course) {
    const modules = this._moduleCounts.get(course.slug) ?? 0;
    return html`
      <a href="/curso?c=${course.slug}" class="course-card">
        <div class="course-card__icon" style="background-color: ${course.color}20; color: ${course.color};">
          <span class="material-symbols-outlined">${course.icon}</span>
        </div>
        <h2 class="course-card__title">${course.title}</h2>
        <p class="course-card__desc">${course.description}</p>
        <div class="course-card__meta">
          <span class="material-symbols-outlined">school</span>
          ${modules} ${modules === 1 ? 'módulo' : 'módulos'}
        </div>
        <div class="course-card__cta">
          Ver temario
          <span class="material-symbols-outlined">arrow_forward</span>
        </div>
      </a>
    `;
  }
}

customElements.define('course-list', CourseList);
