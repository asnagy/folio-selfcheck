/**
 * FOLIO speaks in staff-facing error text. A patron standing at a kiosk needs
 * something they can act on, so every failure is funnelled through here and
 * turned into a short instruction plus a flag for whether staff must intervene.
 */

export type FailureKind =
  | 'network'
  | 'auth'
  | 'not-found'
  | 'blocked'
  | 'not-loanable'
  | 'already-out'
  | 'limit-reached'
  | 'server'
  | 'unknown';

export class FolioError extends Error {
  readonly kind: FailureKind;
  /** Text safe to display to a patron on a public screen. */
  readonly patronMessage: string;
  /** True when the patron cannot resolve this alone. */
  readonly needsStaff: boolean;
  readonly status?: number;
  /** Raw FOLIO text, kept for the diagnostics panel in Settings. */
  readonly detail?: string;

  constructor(args: {
    kind: FailureKind;
    patronMessage: string;
    needsStaff?: boolean;
    status?: number;
    detail?: string;
  }) {
    super(args.detail ?? args.patronMessage);
    this.name = 'FolioError';
    this.kind = args.kind;
    this.patronMessage = args.patronMessage;
    this.needsStaff = args.needsStaff ?? false;
    this.status = args.status;
    this.detail = args.detail;
  }
}

/** Shape FOLIO returns for validation failures across circulation modules. */
interface FolioErrorBody {
  errors?: { message?: string; code?: string }[];
  message?: string;
  errorMessage?: string;
}

export function extractFolioMessage(body: unknown): string | undefined {
  if (typeof body === 'string') return body.trim() || undefined;
  if (!body || typeof body !== 'object') return undefined;
  const typed = body as FolioErrorBody;
  const first = typed.errors?.[0]?.message;
  return first ?? typed.message ?? typed.errorMessage ?? undefined;
}

const PATTERNS: { match: RegExp; kind: FailureKind; message: string; needsStaff?: boolean }[] = [
  {
    match: /has the item checked out|already checked out to this/i,
    kind: 'already-out',
    message: 'You already have this item checked out.',
  },
  {
    match: /checked out to another patron|item is already checked out/i,
    kind: 'already-out',
    message: 'This item is checked out to someone else. Please see a staff member.',
    needsStaff: true,
  },
  {
    match: /loan policy.*not loanable|item is not loanable/i,
    kind: 'not-loanable',
    message: 'This item cannot be borrowed. Please see a staff member.',
    needsStaff: true,
  },
  {
    match: /patron has reached maximum.*limit|item limit/i,
    kind: 'limit-reached',
    message: 'You have reached the borrowing limit for this type of item.',
    needsStaff: true,
  },
  {
    match: /blocked|block(s)? borrowing/i,
    kind: 'blocked',
    message: 'Your account cannot borrow right now. Please see a staff member.',
    needsStaff: true,
  },
  {
    match: /no item with barcode|item with barcode.*does not exist|could not be found/i,
    kind: 'not-found',
    message: "That barcode wasn't recognised. Try scanning it again.",
  },
  {
    match: /could not find user|user with barcode.*does not exist|unable to find patron/i,
    kind: 'not-found',
    message: "We couldn't find that library card. Please try again or see a staff member.",
  },
  {
    match: /expired|inactive/i,
    kind: 'blocked',
    message: 'Your library account needs attention. Please see a staff member.',
    needsStaff: true,
  },
  {
    match: /status.*(missing|withdrawn|lost|in process|on order|declared lost)/i,
    kind: 'not-loanable',
    message: 'This item is not available to borrow. Please see a staff member.',
    needsStaff: true,
  },
];

/** Turn a raw FOLIO error string into a patron-facing FolioError. */
export function classifyFolioMessage(raw: string | undefined, status?: number): FolioError {
  const detail = raw?.trim();

  if (detail) {
    for (const pattern of PATTERNS) {
      if (pattern.match.test(detail)) {
        return new FolioError({
          kind: pattern.kind,
          patronMessage: pattern.message,
          needsStaff: pattern.needsStaff,
          status,
          detail,
        });
      }
    }
  }

  if (status === 401 || status === 403) {
    return new FolioError({
      kind: 'auth',
      patronMessage: 'This station needs to be set up again. Please tell a staff member.',
      needsStaff: true,
      status,
      detail,
    });
  }

  if (status !== undefined && status >= 500) {
    return new FolioError({
      kind: 'server',
      patronMessage: 'The library system is not responding. Please see a staff member.',
      needsStaff: true,
      status,
      detail,
    });
  }

  return new FolioError({
    kind: 'unknown',
    patronMessage: 'Something went wrong. Please try again or see a staff member.',
    needsStaff: true,
    status,
    detail,
  });
}

export function networkError(detail?: string): FolioError {
  return new FolioError({
    kind: 'network',
    patronMessage: 'Cannot reach the library system. Please tell a staff member.',
    needsStaff: true,
    detail,
  });
}
