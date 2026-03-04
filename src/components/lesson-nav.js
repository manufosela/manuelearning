import { LitElement, html, css } from 'lit';

/**
 * @element lesson-nav
 * Previous/Next navigation for sequential lesson browsing.
 *
 * @attr {string} prev-module - Previous lesson module ID
 * @attr {string} prev-lesson - Previous lesson ID
 * @attr {string} next-module - Next lesson module ID
 * @attr {string} next-lesson - Next lesson ID
 */
export class LessonNav extends LitElement {
  static properties = {
    prevModule: { type: String, attribute: 'prev-module' },
    prevLesson: { type: String, attribute: 'prev-lesson' },
    nextModule: { type: String, attribute: 'next-module' },
    nextLesson: { type: String, attribute: 'next-lesson' },
  };

  static styles = css`
    :host {
      display: block;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e2e8f0;
    }

    .nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .nav-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.625rem 1.25rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      background: #fff;
      color: #334155;
      font-size: 0.875rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s;
    }

    .nav-btn:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .nav-btn--primary {
      background: #84cc16;
      color: #fff;
      border-color: #84cc16;
    }

    .nav-btn--primary:hover {
      background: #d11111;
    }

    .nav-btn--hidden {
      visibility: hidden;
    }

    .material-symbols-outlined {
      font-size: 1.125rem;
    }
  `;

  constructor() {
    super();
    this.prevModule = '';
    this.prevLesson = '';
    this.nextModule = '';
    this.nextLesson = '';
  }

  render() {
    const hasPrev = this.prevModule && this.prevLesson;
    const hasNext = this.nextModule && this.nextLesson;
    const prevUrl = hasPrev ? `/leccion?m=${this.prevModule}&l=${this.prevLesson}` : '#';
    const nextUrl = hasNext ? `/leccion?m=${this.nextModule}&l=${this.nextLesson}` : '#';

    return html`
      <div class="nav">
        <a href=${prevUrl} class="nav-btn ${hasPrev ? '' : 'nav-btn--hidden'}">
          <span class="material-symbols-outlined">arrow_back</span>
          Anterior
        </a>
        <a href="/curso" class="nav-btn">
          <span class="material-symbols-outlined">menu_book</span>
          Temario
        </a>
        <a href=${nextUrl} class="nav-btn nav-btn--primary ${hasNext ? '' : 'nav-btn--hidden'}">
          Siguiente
          <span class="material-symbols-outlined">arrow_forward</span>
        </a>
      </div>
    `;
  }
}

customElements.define('lesson-nav', LessonNav);
