import fs from 'fs';
import path from 'path';

/**
 * Helpers to test the markup of .astro pages from their SOURCE, not from
 * dist/. The suite must not depend on a previous build nor on a local server
 * (happy-dom would try to fetch every <link> of a built page).
 */

/**
 * Read an .astro file and return its markup without the frontmatter,
 * external links or scripts (nothing must be fetched while parsing).
 * @param {string} relPath - path relative to the project root
 * @returns {string}
 */
export function loadAstroMarkup(relPath) {
  const source = fs.readFileSync(path.resolve(relPath), 'utf-8');
  return source
    .replace(/^---[\s\S]*?---/, '')
    .replace(/<link\b[^>]*>/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/g, '');
}

/**
 * Parse one or more .astro sources into a single Document.
 * Pass the layout first so header/footer and page content share one tree.
 * @param {...string} relPaths
 * @returns {{ html: string, doc: Document }}
 */
export function parseAstroPages(...relPaths) {
  const html = relPaths.map(loadAstroMarkup).join('\n');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return { html, doc };
}
