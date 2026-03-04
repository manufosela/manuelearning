import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const indexesPath = resolve(__dirname, '../firestore.indexes.json');
const indexesContent = JSON.parse(readFileSync(indexesPath, 'utf-8'));

describe('firestore.indexes.json', () => {
  it('should be valid JSON with indexes array', () => {
    expect(indexesContent).toHaveProperty('indexes');
    expect(Array.isArray(indexesContent.indexes)).toBe(true);
  });

  it('should have fieldOverrides array', () => {
    expect(indexesContent).toHaveProperty('fieldOverrides');
    expect(Array.isArray(indexesContent.fieldOverrides)).toBe(true);
  });

  it('should have 6 composite indexes', () => {
    expect(indexesContent.indexes).toHaveLength(6);
  });

  it('each index should have required fields', () => {
    for (const index of indexesContent.indexes) {
      expect(index).toHaveProperty('collectionGroup');
      expect(index).toHaveProperty('queryScope', 'COLLECTION');
      expect(index).toHaveProperty('fields');
      expect(index.fields.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('each field should have fieldPath and order', () => {
    for (const index of indexesContent.indexes) {
      for (const field of index.fields) {
        expect(field).toHaveProperty('fieldPath');
        expect(field).toHaveProperty('order');
        expect(['ASCENDING', 'DESCENDING']).toContain(field.order);
      }
    }
  });

  const requiredIndexes = [
    { collection: 'progress', fields: ['userId', 'completed'] },
    { collection: 'notifications', fields: ['read', 'createdAt'] },
    { collection: 'questions', fields: ['lessonId', 'createdAt'] },
    { collection: 'sessions', fields: ['cohortId', 'date'] },
    { collection: 'suggestedAnswers', fields: ['status', 'createdAt'] },
    { collection: 'quizResponses', fields: ['userId', 'quizId'] },
  ];

  for (const req of requiredIndexes) {
    it(`should have index for ${req.collection} (${req.fields.join(', ')})`, () => {
      const found = indexesContent.indexes.find(
        (idx) =>
          idx.collectionGroup === req.collection &&
          req.fields.every((f) => idx.fields.some((fld) => fld.fieldPath === f))
      );
      expect(found).toBeDefined();
    });
  }
});
