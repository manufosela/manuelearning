import { LitElement, html, css, unsafeCSS } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { renderMarkdown } from '../lib/markdown.js';

/**
 * @element markdown-content
 * Renders markdown text as styled HTML content.
 *
 * @attr {string} content - Markdown text to render
 */
export class MarkdownContent extends LitElement {
  static properties = {
    content: { type: String },
  };

  static styles = css`
    :host {
      display: block;
      line-height: 1.7;
      color: #334155;
      font-size: 0.938rem;
    }

    h1, h2, h3, h4 {
      color: #0f172a;
      font-weight: 700;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
    }

    h1 { font-size: 1.5rem; }
    h2 { font-size: 1.25rem; }
    h3 { font-size: 1.125rem; }

    p {
      margin-bottom: 1rem;
    }

    ul, ol {
      padding-left: 1.5rem;
      margin-bottom: 1rem;
    }

    li {
      margin-bottom: 0.375rem;
    }

    code {
      background: #f1f5f9;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-size: 0.85em;
      font-family: 'Fira Code', 'Courier New', monospace;
      color: #c2410c;
    }

    pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 1rem 1.25rem;
      border-radius: 0.5rem;
      overflow-x: auto;
      margin-bottom: 1rem;
    }

    pre code {
      background: none;
      color: inherit;
      padding: 0;
    }

    blockquote {
      border-left: 4px solid #84cc16;
      padding: 0.5rem 1rem;
      margin: 1rem 0;
      background: #fef2f2;
      color: #475569;
    }

    a {
      color: #84cc16;
      text-decoration: underline;
    }

    a:hover {
      color: #d11111;
    }

    img {
      max-width: 100%;
      border-radius: 0.5rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1rem;
    }

    th, td {
      padding: 0.5rem 0.75rem;
      border: 1px solid #e2e8f0;
      text-align: left;
    }

    th {
      background: #f8fafc;
      font-weight: 600;
    }

    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 1.5rem 0;
    }
  `;

  constructor() {
    super();
    this.content = '';
  }

  render() {
    const rendered = renderMarkdown(this.content);
    return html`${unsafeHTML(rendered)}`;
  }
}

customElements.define('markdown-content', MarkdownContent);
