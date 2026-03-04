/**
 * Check if an item matches a search query by checking multiple fields.
 * Case-insensitive, matches any field that contains the query.
 * @param {Object} item - The item to check
 * @param {string[]} fields - Field names to search in
 * @param {string} query - Search query
 * @returns {boolean}
 */
export function matchesSearch(item, fields, query) {
  if (!query || query.trim().length === 0) return true;

  const normalizedQuery = query.toLowerCase().trim();

  return fields.some((field) => {
    const value = item[field];
    if (value === null || value === undefined) return false;
    return String(value).toLowerCase().includes(normalizedQuery);
  });
}

/**
 * Filter an array of items by a search query across multiple fields.
 * @param {Object[]} items
 * @param {string[]} fields
 * @param {string} query
 * @returns {Object[]}
 */
export function filterBySearch(items, fields, query) {
  if (!query || query.trim().length === 0) return items;
  return items.filter((item) => matchesSearch(item, fields, query));
}
