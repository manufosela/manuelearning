import { describe, it, expect } from 'vitest';
import { escapeCsvField, arrayToCsv } from '../src/lib/csv-export.js';

describe('escapeCsvField', () => {
  it('should return empty string for null', () => {
    expect(escapeCsvField(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(escapeCsvField(undefined)).toBe('');
  });

  it('should convert numbers to string', () => {
    expect(escapeCsvField(42)).toBe('42');
  });

  it('should return plain string as-is', () => {
    expect(escapeCsvField('hello')).toBe('hello');
  });

  it('should wrap string with comma in double quotes', () => {
    expect(escapeCsvField('hello, world')).toBe('"hello, world"');
  });

  it('should escape double quotes inside value', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('should wrap string with newline in quotes', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('arrayToCsv', () => {
  it('should generate CSV with headers and rows', () => {
    const headers = ['Name', 'Email', 'Role'];
    const rows = [
      ['Alice', 'alice@test.com', 'admin'],
      ['Bob', 'bob@test.com', 'student'],
    ];

    const csv = arrayToCsv(headers, rows);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Name,Email,Role');
    expect(lines[1]).toBe('Alice,alice@test.com,admin');
    expect(lines[2]).toBe('Bob,bob@test.com,student');
  });

  it('should handle empty rows', () => {
    const csv = arrayToCsv(['A', 'B'], []);
    expect(csv).toBe('A,B');
  });

  it('should escape special characters in data', () => {
    const csv = arrayToCsv(['Name'], [['O\'Brien, Jr.']]);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('"O\'Brien, Jr."');
  });

  it('should handle null values in rows', () => {
    const csv = arrayToCsv(['A', 'B'], [[null, 'value']]);
    const lines = csv.split('\n');
    expect(lines[1]).toBe(',value');
  });
});
