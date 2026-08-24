import { daysUntil, formatCurrency, formatDueDate, fullName, greetingName, isOverdue } from '@/utils/format';

describe('date formatting', () => {
  it('formats a real due date and survives a missing or malformed one', () => {
    expect(formatDueDate('2026-03-15T23:59:00.000Z')).toContain('2026');
    expect(formatDueDate(undefined)).toBe('No due date');
    expect(formatDueDate('not-a-date')).toBe('No due date');
  });

  it('detects overdue loans', () => {
    const now = Date.parse('2026-03-15T12:00:00Z');
    expect(isOverdue('2026-03-10T12:00:00Z', now)).toBe(true);
    expect(isOverdue('2026-03-20T12:00:00Z', now)).toBe(false);
    expect(isOverdue(undefined, now)).toBe(false);
  });

  it('counts whole days until a due date', () => {
    const now = Date.parse('2026-03-15T12:00:00Z');
    expect(daysUntil('2026-03-18T12:00:00Z', now)).toBe(3);
    expect(daysUntil('2026-03-14T12:00:00Z', now)).toBe(-1);
  });
});

describe('formatCurrency', () => {
  it('renders an amount with a currency symbol', () => {
    expect(formatCurrency(3.5)).toMatch(/3\.50/);
  });

  it('falls back rather than throwing on an unknown currency code', () => {
    expect(formatCurrency(3.5, 'NOTACURRENCY')).toMatch(/3\.50/);
  });
});

describe('names', () => {
  /** A patron who set a preferred name should be greeted by it. */
  it('prefers the chosen name over the legal first name', () => {
    expect(greetingName({ firstName: 'Augusta', preferredFirstName: 'Ada' })).toBe('Ada');
    expect(fullName({ firstName: 'Augusta', preferredFirstName: 'Ada', lastName: 'Lovelace' })).toBe(
      'Ada Lovelace',
    );
  });

  it('degrades gracefully when a record has no name at all', () => {
    expect(greetingName(undefined)).toBe('there');
    expect(fullName({})).toBe('Library patron');
  });

  it('ignores a whitespace-only preferred name', () => {
    expect(greetingName({ firstName: 'Ada', preferredFirstName: '   ' })).toBe('Ada');
  });
});
