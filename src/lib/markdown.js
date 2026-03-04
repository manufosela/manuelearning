import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Render markdown string to HTML.
 * @param {string|null|undefined} text
 * @returns {string}
 */
export function renderMarkdown(text) {
  if (!text) return '';
  return sanitizeHtml(marked.parse(text));
}

/**
 * Basic HTML sanitizer to prevent XSS.
 * Removes script tags, event handlers, and dangerous attributes.
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHtml(html) {
  if (!html) return '';

  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\bon\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\bon\w+\s*=[^\s>]*/gi, '');
}
