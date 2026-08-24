/**
 * Subset of the FOLIO domain model this kiosk depends on.
 *
 * These are deliberately narrow: we model only the fields the self check out
 * flow reads, so a schema change elsewhere in FOLIO cannot break the kiosk.
 */

export type AuthMode = 'expiry' | 'legacy';

/** Credentials + endpoint details for a FOLIO tenant. */
export interface FolioConnection {
  /** Gateway base URL: Kong on Eureka, Okapi on classic. No trailing slash. */
  baseUrl: string;
  tenant: string;
}

export interface AuthTokens {
  accessToken: string;
  /** Absent in legacy mode, where the single token is long lived. */
  refreshToken?: string;
  /** Epoch milliseconds. */
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt?: number;
  mode: AuthMode;
}

export interface PersonalInfo {
  firstName?: string;
  lastName?: string;
  preferredFirstName?: string;
  middleName?: string;
  email?: string;
  phone?: string;
}

export interface FolioUser {
  id: string;
  username?: string;
  barcode?: string;
  active?: boolean;
  patronGroup?: string;
  expirationDate?: string;
  personal?: PersonalInfo;
}

export interface LoanItem {
  id?: string;
  title?: string;
  barcode?: string;
  callNumber?: string;
  materialType?: { name?: string };
}

export interface Loan {
  id: string;
  itemId?: string;
  userId?: string;
  dueDate?: string;
  loanDate?: string;
  renewalCount?: number;
  item?: LoanItem;
  /** Present on renew failures we surface inline. */
  action?: string;
}

export interface FeeFine {
  id: string;
  amount?: number;
  remaining?: number;
  feeFineType?: string;
  paymentStatus?: { name?: string };
  status?: { name?: string };
  title?: string;
}

export interface PatronBlock {
  /** Automated blocks use `message`; manual blocks use `desc`. */
  message?: string;
  desc?: string;
  blockBorrowing?: boolean;
  blockRenewals?: boolean;
  blockRequests?: boolean;
}

/** A normalised, display-ready view of everything the kiosk knows about a patron. */
export interface PatronSnapshot {
  user: FolioUser;
  loans: Loan[];
  fees: FeeFine[];
  blocks: PatronBlock[];
  totalOwed: number;
  /** True when any block prevents borrowing. */
  borrowingBlocked: boolean;
}

export interface PatronGroup {
  id: string;
  group: string;
  desc?: string;
}
