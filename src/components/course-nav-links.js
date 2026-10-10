import { LitElement, html } from 'lit';
import { fetchPublishedCourses } from '../lib/firebase/courses.js';

/**
 * @element course-nav-links
 * Footer navigation: one <li> link per published course, rendered in light
 * DOM so the layout's footer styles apply.
 */
export class CourseNavLinks extends LitElement {
  static properties = {
    _courses: { type: Array, state: true },
  };

  constructor() {
    super();
    this._courses = [];
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this._load();
  }

  async _load() {
    const result = await fetchPublishedCourses();
    this._courses = result.success ? result.courses : [];
  }

  render() {
    return html`${this._courses.map(
      (course) => html`<li><a href="/curso?c=${course.slug}">${course.title}</a></li>`
    )}`;
  }
}

customElements.define('course-nav-links', CourseNavLinks);
