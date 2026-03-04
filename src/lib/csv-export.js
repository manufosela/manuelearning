/**
 * Escape a CSV field value.
 * Wraps in double quotes if the value contains commas, quotes, or newlines.
 * @param {*} value
 * @returns {string}
 */
export function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of objects to a CSV string.
 * @param {string[]} headers - Column headers
 * @param {string[][]} rows - Array of row arrays
 * @returns {string}
 */
export function arrayToCsv(headers, rows) {
  const headerLine = headers.map(escapeCsvField).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(','));
  return [headerLine, ...dataLines].join('\n');
}

/**
 * Trigger a file download in the browser.
 * @param {string} content - File content
 * @param {string} filename - File name including extension
 * @param {string} [mimeType='text/csv;charset=utf-8;']
 */
export function downloadFile(content, filename, mimeType = 'text/csv;charset=utf-8;') {
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data as a CSV file.
 * @param {string[]} headers
 * @param {string[][]} rows
 * @param {string} filename
 */
export function exportCsv(headers, rows, filename) {
  const csv = arrayToCsv(headers, rows);
  downloadFile(csv, filename);
}
