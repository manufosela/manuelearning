import { describe, it, expect } from 'vitest';
import { stateStyles } from '../src/lib/shared-styles.js';

describe('shared-styles', () => {
  it('should export stateStyles as a CSSResult', () => {
    expect(stateStyles).toBeDefined();
    expect(typeof stateStyles.cssText).toBe('string');
  });

  it('should include state-loading class', () => {
    expect(stateStyles.cssText).toContain('.state-loading');
  });

  it('should include state-spinner class', () => {
    expect(stateStyles.cssText).toContain('.state-spinner');
  });

  it('should include state-empty class', () => {
    expect(stateStyles.cssText).toContain('.state-empty');
  });

  it('should include state-error class', () => {
    expect(stateStyles.cssText).toContain('.state-error');
  });

  it('should include state-retry-btn class', () => {
    expect(stateStyles.cssText).toContain('.state-retry-btn');
  });

  it('should include spin animation', () => {
    expect(stateStyles.cssText).toContain('state-spin');
  });
});
