import { describe, it, expect } from 'vitest';
import { matchesSearch, filterBySearch } from '../src/lib/search-filter.js';

describe('matchesSearch', () => {
  const item = { email: 'alice@test.com', displayName: 'Alice Smith', role: 'admin' };

  it('should return true when query is empty', () => {
    expect(matchesSearch(item, ['email'], '')).toBe(true);
  });

  it('should return true when query is whitespace', () => {
    expect(matchesSearch(item, ['email'], '   ')).toBe(true);
  });

  it('should match email field', () => {
    expect(matchesSearch(item, ['email', 'displayName'], 'alice@')).toBe(true);
  });

  it('should match displayName field', () => {
    expect(matchesSearch(item, ['email', 'displayName'], 'Smith')).toBe(true);
  });

  it('should be case insensitive', () => {
    expect(matchesSearch(item, ['displayName'], 'ALICE')).toBe(true);
  });

  it('should return false when no match', () => {
    expect(matchesSearch(item, ['email', 'displayName'], 'bob')).toBe(false);
  });

  it('should handle null field values', () => {
    const itemWithNull = { email: 'a@b.com', displayName: null };
    expect(matchesSearch(itemWithNull, ['displayName'], 'test')).toBe(false);
  });

  it('should handle undefined field values', () => {
    const itemMissing = { email: 'a@b.com' };
    expect(matchesSearch(itemMissing, ['displayName'], 'test')).toBe(false);
  });

  it('should match partial strings', () => {
    expect(matchesSearch(item, ['role'], 'adm')).toBe(true);
  });
});

describe('filterBySearch', () => {
  const items = [
    { name: 'Alice', role: 'admin' },
    { name: 'Bob', role: 'student' },
    { name: 'Charlie', role: 'admin' },
  ];

  it('should return all items when query is empty', () => {
    expect(filterBySearch(items, ['name'], '')).toHaveLength(3);
  });

  it('should filter by name', () => {
    const result = filterBySearch(items, ['name'], 'ali');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alice');
  });

  it('should filter by role', () => {
    const result = filterBySearch(items, ['role'], 'admin');
    expect(result).toHaveLength(2);
  });

  it('should return empty when no match', () => {
    const result = filterBySearch(items, ['name', 'role'], 'xyz');
    expect(result).toHaveLength(0);
  });

  it('should search across multiple fields', () => {
    const result = filterBySearch(items, ['name', 'role'], 'student');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Bob');
  });
});
