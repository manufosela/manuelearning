import { describe, it, expect } from 'vitest';
import { isCohortExpired, getCohortStatus, validateCohort, generateCohortSlug } from '../src/lib/cohort-utils.js';

describe('isCohortExpired', () => {
  it('should return false when cohort is null', () => {
    expect(isCohortExpired(null)).toBe(false);
  });

  it('should return false when expiryDate is missing', () => {
    expect(isCohortExpired({ name: 'Test' })).toBe(false);
  });

  it('should return false when cohort expires in the future', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(isCohortExpired({ expiryDate: future.toISOString().split('T')[0] })).toBe(false);
  });

  it('should return true when cohort expired in the past', () => {
    expect(isCohortExpired({ expiryDate: '2020-01-01' })).toBe(true);
  });

  it('should return false when expiryDate is today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(isCohortExpired({ expiryDate: today })).toBe(false);
  });
});

describe('getCohortStatus', () => {
  it('should return inactive when cohort is not active', () => {
    expect(getCohortStatus({ active: false, expiryDate: '2099-12-31' })).toBe('inactive');
  });

  it('should return expired when active but expired', () => {
    expect(getCohortStatus({ active: true, expiryDate: '2020-01-01' })).toBe('expired');
  });

  it('should return active when active and not expired', () => {
    expect(getCohortStatus({ active: true, expiryDate: '2099-12-31' })).toBe('active');
  });

  it('should return active when active and no expiryDate', () => {
    expect(getCohortStatus({ active: true })).toBe('active');
  });
});

describe('validateCohort', () => {
  const valid = { name: 'Test', startDate: '2026-03-01', expiryDate: '2026-06-01' };

  it('should reject empty name', () => {
    expect(validateCohort({ ...valid, name: '' }).valid).toBe(false);
  });

  it('should reject missing startDate', () => {
    expect(validateCohort({ ...valid, startDate: '' }).valid).toBe(false);
  });

  it('should reject missing expiryDate', () => {
    expect(validateCohort({ ...valid, expiryDate: '' }).valid).toBe(false);
  });

  it('should reject expiryDate before startDate', () => {
    expect(validateCohort({ ...valid, startDate: '2026-06-01', expiryDate: '2026-03-01' }).valid).toBe(false);
  });

  it('should accept valid cohort data without code', () => {
    expect(validateCohort(valid).valid).toBe(true);
  });
});

describe('generateCohortSlug', () => {
  it('should slugify a simple name', () => {
    expect(generateCohortSlug('Convocatoria Marzo 2026')).toBe('convocatoria-marzo-2026');
  });

  it('should remove accents and special characters', () => {
    expect(generateCohortSlug('Mi Convocatoria Ñoña')).toBe('mi-convocatoria-nona');
  });

  it('should collapse multiple spaces', () => {
    expect(generateCohortSlug('  Espacios   múltiples  ')).toBe('espacios-multiples');
  });
});
