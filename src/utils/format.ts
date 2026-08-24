/**
 * Display formatting.
 *
 * Uses the platform's own `Intl` rather than a date library: the kiosk shows a
 * handful of dates and amounts, and pulling in Moment (which the prototype did,
 * and which is in maintenance mode) to do it costs bundle size for nothing.
 */

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function formatDueDate(iso: string | undefined): string {
  if (!iso) return 'No due date';
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return 'No due date';
  return DATE_FORMAT.format(new Date(parsed));
}

export function formatShortDate(iso: string | undefined): string {
  if (!iso) return '—';
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return '—';
  return SHORT_DATE_FORMAT.format(new Date(parsed));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

/** Whole days until `iso`; negative when already overdue. */
export function daysUntil(iso: string | undefined, now = Date.now()): number | undefined {
  if (!iso) return undefined;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return undefined;
  return Math.ceil((parsed - now) / (24 * 60 * 60 * 1000));
}

export function isOverdue(iso: string | undefined, now = Date.now()): boolean {
  const days = daysUntil(iso, now);
  return days !== undefined && days < 0;
}

/** Prefer the name a patron chose to be called by. */
export function greetingName(personal: { firstName?: string; preferredFirstName?: string } | undefined): string {
  return personal?.preferredFirstName?.trim() || personal?.firstName?.trim() || 'there';
}

export function fullName(
  personal: { firstName?: string; lastName?: string; preferredFirstName?: string } | undefined,
): string {
  const first = personal?.preferredFirstName?.trim() || personal?.firstName?.trim() || '';
  const last = personal?.lastName?.trim() || '';
  return [first, last].filter(Boolean).join(' ') || 'Library patron';
}
