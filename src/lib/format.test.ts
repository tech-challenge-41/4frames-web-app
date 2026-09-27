import { describe, expect, it } from 'vitest';
import { formatDateTime } from './format';

describe('formatDateTime', () => {
  it('formats an ISO date with day, month, year and time in pt-BR', () => {
    const formatted = formatDateTime('2026-09-27T14:05:00.000Z');

    expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4},? \d{2}:\d{2}$/);
  });

  it('returns the original text when it is not a date', () => {
    expect(formatDateTime('não é data')).toBe('não é data');
  });
});
