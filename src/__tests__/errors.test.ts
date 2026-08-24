import { classifyFolioMessage, extractFolioMessage } from '@/folio/errors';

/**
 * FOLIO's staff-facing wording must never reach a kiosk screen verbatim, and a
 * failure the patron can fix must not be reported as one requiring staff.
 */
describe('extractFolioMessage', () => {
  it('reads the first entry of a circulation errors array', () => {
    expect(extractFolioMessage({ errors: [{ message: 'Item is not loanable' }] })).toBe(
      'Item is not loanable',
    );
  });

  it('falls back to a bare message field', () => {
    expect(extractFolioMessage({ message: 'Boom' })).toBe('Boom');
  });

  it('handles plain-text bodies and empty input', () => {
    expect(extractFolioMessage('gateway timeout')).toBe('gateway timeout');
    expect(extractFolioMessage(undefined)).toBeUndefined();
    expect(extractFolioMessage('   ')).toBeUndefined();
  });
});

describe('classifyFolioMessage', () => {
  it('treats an unloanable item as needing staff', () => {
    const error = classifyFolioMessage('Item is not loanable', 422);
    expect(error.kind).toBe('not-loanable');
    expect(error.needsStaff).toBe(true);
  });

  it('lets a patron retry their own duplicate checkout without staff', () => {
    const error = classifyFolioMessage('User has the item checked out', 422);
    expect(error.kind).toBe('already-out');
    expect(error.needsStaff).toBe(false);
  });

  it('maps an unknown barcode to a retry-friendly message', () => {
    const error = classifyFolioMessage('No item with barcode 123 exists', 422);
    expect(error.kind).toBe('not-found');
    expect(error.needsStaff).toBe(false);
  });

  it('maps 401 to an auth failure that staff must resolve', () => {
    const error = classifyFolioMessage(undefined, 401);
    expect(error.kind).toBe('auth');
    expect(error.needsStaff).toBe(true);
  });

  it('maps 5xx to a server failure', () => {
    expect(classifyFolioMessage(undefined, 503).kind).toBe('server');
  });

  it('never leaks raw FOLIO text into the patron-facing message', () => {
    const raw = 'org.folio.circulation.SomeInternalException: null pointer at line 42';
    const error = classifyFolioMessage(raw, 500);
    expect(error.patronMessage).not.toContain('org.folio');
    expect(error.detail).toBe(raw);
  });
});
