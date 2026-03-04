import { describe, it, expect } from 'vitest';
import { computeSwap } from '../src/lib/reorder-utils.js';

describe('computeSwap', () => {
  const items = [
    { id: 'a', order: 1 },
    { id: 'b', order: 2 },
    { id: 'c', order: 3 },
  ];

  it('should return null for unknown itemId', () => {
    expect(computeSwap(items, 'unknown', 'up')).toBeNull();
  });

  it('should return null when moving first item up', () => {
    expect(computeSwap(items, 'a', 'up')).toBeNull();
  });

  it('should return null when moving last item down', () => {
    expect(computeSwap(items, 'c', 'down')).toBeNull();
  });

  it('should swap order when moving item up', () => {
    const result = computeSwap(items, 'b', 'up');
    expect(result).not.toBeNull();
    expect(result.item).toEqual({ id: 'b', order: 1 });
    expect(result.neighbor).toEqual({ id: 'a', order: 2 });
  });

  it('should swap order when moving item down', () => {
    const result = computeSwap(items, 'b', 'down');
    expect(result).not.toBeNull();
    expect(result.item).toEqual({ id: 'b', order: 3 });
    expect(result.neighbor).toEqual({ id: 'c', order: 2 });
  });

  it('should swap first item down', () => {
    const result = computeSwap(items, 'a', 'down');
    expect(result).not.toBeNull();
    expect(result.item).toEqual({ id: 'a', order: 2 });
    expect(result.neighbor).toEqual({ id: 'b', order: 1 });
  });

  it('should swap last item up', () => {
    const result = computeSwap(items, 'c', 'up');
    expect(result).not.toBeNull();
    expect(result.item).toEqual({ id: 'c', order: 2 });
    expect(result.neighbor).toEqual({ id: 'b', order: 3 });
  });

  it('should handle single-item list', () => {
    expect(computeSwap([{ id: 'x', order: 1 }], 'x', 'up')).toBeNull();
    expect(computeSwap([{ id: 'x', order: 1 }], 'x', 'down')).toBeNull();
  });

  it('should handle empty list', () => {
    expect(computeSwap([], 'x', 'up')).toBeNull();
  });

  it('should handle two-item list correctly', () => {
    const twoItems = [{ id: 'a', order: 1 }, { id: 'b', order: 2 }];
    const result = computeSwap(twoItems, 'b', 'up');
    expect(result.item).toEqual({ id: 'b', order: 1 });
    expect(result.neighbor).toEqual({ id: 'a', order: 2 });
  });
});
