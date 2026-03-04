import { describe, it, expect } from 'vitest';
import { renderMarkdown, sanitizeHtml } from '../src/lib/markdown.js';

describe('renderMarkdown', () => {
  it('should render headings', () => {
    const result = renderMarkdown('# Título');
    expect(result).toContain('<h1');
    expect(result).toContain('Título');
  });

  it('should render paragraphs', () => {
    const result = renderMarkdown('Texto simple');
    expect(result).toContain('<p>');
    expect(result).toContain('Texto simple');
  });

  it('should render bold text', () => {
    const result = renderMarkdown('**negrita**');
    expect(result).toContain('<strong>');
  });

  it('should render italic text', () => {
    const result = renderMarkdown('*cursiva*');
    expect(result).toContain('<em>');
  });

  it('should render unordered lists', () => {
    const result = renderMarkdown('- Item 1\n- Item 2');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
  });

  it('should render ordered lists', () => {
    const result = renderMarkdown('1. Primero\n2. Segundo');
    expect(result).toContain('<ol>');
  });

  it('should render code blocks', () => {
    const result = renderMarkdown('```js\nconst x = 1;\n```');
    expect(result).toContain('<code');
  });

  it('should render inline code', () => {
    const result = renderMarkdown('Usa `const`');
    expect(result).toContain('<code>');
    expect(result).toContain('const');
  });

  it('should render links', () => {
    const result = renderMarkdown('[enlace](https://example.com)');
    expect(result).toContain('href="https://example.com"');
  });

  it('should handle empty string', () => {
    expect(renderMarkdown('')).toBe('');
  });

  it('should handle null/undefined', () => {
    expect(renderMarkdown(null)).toBe('');
    expect(renderMarkdown(undefined)).toBe('');
  });
});

describe('sanitizeHtml', () => {
  it('should remove script tags', () => {
    const result = sanitizeHtml('<p>Text</p><script>alert("xss")</script>');
    expect(result).not.toContain('<script');
    expect(result).toContain('<p>Text</p>');
  });

  it('should remove onerror attributes', () => {
    const result = sanitizeHtml('<img onerror="alert(1)" src="x">');
    expect(result).not.toContain('onerror');
  });

  it('should remove onclick attributes', () => {
    const result = sanitizeHtml('<p onclick="alert(1)">Text</p>');
    expect(result).not.toContain('onclick');
  });

  it('should keep safe HTML', () => {
    const result = sanitizeHtml('<h1>Title</h1><p>Text</p>');
    expect(result).toContain('<h1>Title</h1>');
    expect(result).toContain('<p>Text</p>');
  });
});
