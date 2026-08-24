import { FolioClient, cqlQuote } from './client';
import { FolioError } from './errors';
import type {
  FeeFine,
  FolioUser,
  Loan,
  PatronBlock,
  PatronGroup,
  PatronSnapshot,
} from './types';

/**
 * Circulation operations the kiosk performs, expressed in library terms.
 *
 * Everything a patron sees comes from this module. All CQL values go through
 * `cqlQuote` so a barcode containing quotes or wildcards cannot alter a query.
 */

const LOAN_PAGE_LIMIT = 200;

interface Collection<T> {
  [key: string]: T[] | number | undefined;
  totalRecords?: number;
}

function firstOf<T>(collection: Collection<T> | undefined, key: string): T | undefined {
  const items = collection?.[key];
  return Array.isArray(items) ? items[0] : undefined;
}

function listOf<T>(collection: Collection<T> | undefined, key: string): T[] {
  const items = collection?.[key];
  return Array.isArray(items) ? items : [];
}

export async function findUserByBarcode(
  client: FolioClient,
  barcode: string,
): Promise<FolioUser> {
  const result = await client.request<Collection<FolioUser>>('/users', {
    query: { query: `barcode==${cqlQuote(barcode)}`, limit: 1 },
  });

  const user = firstOf(result, 'users');
  if (!user) {
    throw new FolioError({
      kind: 'not-found',
      patronMessage: "We couldn't find that library card. Please try again or see a staff member.",
      detail: `No user with barcode ${barcode}`,
    });
  }

  if (user.active === false) {
    throw new FolioError({
      kind: 'blocked',
      patronMessage: 'This library card is not active. Please see a staff member.',
      needsStaff: true,
      detail: `User ${user.id} is inactive`,
    });
  }

  if (user.expirationDate && Date.parse(user.expirationDate) < Date.now()) {
    throw new FolioError({
      kind: 'blocked',
      patronMessage: 'This library card has expired. Please see a staff member to renew it.',
      needsStaff: true,
      detail: `User ${user.id} expired ${user.expirationDate}`,
    });
  }

  return user;
}

/**
 * Verify a patron's PIN via mod-patron-pin.
 *
 * The endpoint answers 200 for a match and 422 for a mismatch, so a rejected
 * PIN is a normal outcome rather than an error we surface as a system fault.
 */
export async function verifyPatronPin(
  client: FolioClient,
  userId: string,
  pin: string,
): Promise<boolean> {
  try {
    await client.request<void>('/patron-pin/verify', {
      method: 'POST',
      body: { id: userId, pin },
    });
    return true;
  } catch (error) {
    if (error instanceof FolioError && (error.status === 422 || error.status === 400)) {
      return false;
    }
    throw error;
  }
}

export async function fetchOpenLoans(client: FolioClient, userId: string): Promise<Loan[]> {
  const result = await client.request<Collection<Loan>>('/circulation/loans', {
    query: {
      query: `userId==${cqlQuote(userId)} and status.name==${cqlQuote('Open')}`,
      limit: LOAN_PAGE_LIMIT,
    },
  });
  return listOf(result, 'loans');
}

export async function fetchOpenFees(client: FolioClient, userId: string): Promise<FeeFine[]> {
  const result = await client.request<Collection<FeeFine>>('/accounts', {
    query: {
      query: `userId==${cqlQuote(userId)} and status.name<>${cqlQuote('Closed')}`,
      limit: LOAN_PAGE_LIMIT,
    },
  });
  return listOf(result, 'accounts');
}

/**
 * Collect both kinds of FOLIO block. Automated blocks are computed from
 * circulation rules; manual blocks are placed by staff. Either can stop a
 * checkout, and a patron needs to be told which applies before they scan.
 */
export async function fetchBlocks(client: FolioClient, userId: string): Promise<PatronBlock[]> {
  const [automated, manual] = await Promise.all([
    client
      .request<Collection<PatronBlock>>(`/automated-patron-blocks/${encodeURIComponent(userId)}`)
      .then((result) => listOf(result, 'automatedPatronBlocks'))
      .catch(() => [] as PatronBlock[]),
    client
      .request<Collection<PatronBlock>>('/manualblocks', {
        query: { query: `userId==${cqlQuote(userId)}`, limit: 50 },
      })
      .then((result) => listOf(result, 'manualblocks'))
      .catch(() => [] as PatronBlock[]),
  ]);

  return [...automated, ...manual];
}

export function blockText(block: PatronBlock): string {
  return block.message ?? block.desc ?? 'Your account has a block.';
}

export function sumOwed(fees: FeeFine[]): number {
  return fees.reduce((total, fee) => total + (fee.remaining ?? fee.amount ?? 0), 0);
}

/**
 * Everything the account and checkout screens need, in one round of requests.
 *
 * Blocks and fees are best-effort: a tenant without mod-feesfines or
 * mod-patron-blocks should still be able to check items out, so a failure there
 * degrades to an empty list rather than stopping the patron.
 */
export async function loadPatronSnapshot(
  client: FolioClient,
  user: FolioUser,
): Promise<PatronSnapshot> {
  const [loans, fees, blocks] = await Promise.all([
    fetchOpenLoans(client, user.id),
    fetchOpenFees(client, user.id).catch(() => [] as FeeFine[]),
    fetchBlocks(client, user.id),
  ]);

  return {
    user,
    loans,
    fees,
    blocks,
    totalOwed: sumOwed(fees),
    borrowingBlocked: blocks.some((block) => block.blockBorrowing !== false),
  };
}

export async function checkOutByBarcode(
  client: FolioClient,
  params: { itemBarcode: string; userBarcode: string; servicePointId: string },
): Promise<Loan> {
  return client.request<Loan>('/circulation/check-out-by-barcode', {
    method: 'POST',
    body: {
      itemBarcode: params.itemBarcode,
      userBarcode: params.userBarcode,
      servicePointId: params.servicePointId,
    },
  });
}

export async function renewByBarcode(
  client: FolioClient,
  params: { itemBarcode: string; userBarcode: string },
): Promise<Loan> {
  return client.request<Loan>('/circulation/renew-by-barcode', {
    method: 'POST',
    body: { itemBarcode: params.itemBarcode, userBarcode: params.userBarcode },
  });
}

/**
 * Close the patron action session so FOLIO sends the checkout receipt notice.
 *
 * The action type must match what actually happened at this station. The
 * prototype sent "Check-in" from a check-out kiosk, which meant the patron's
 * checkout notice was never triggered.
 */
export async function endPatronSession(
  client: FolioClient,
  userId: string,
  actionType: 'Check-out' | 'Check-in' = 'Check-out',
): Promise<void> {
  await client.request<void>('/circulation/end-patron-action-session', {
    method: 'POST',
    body: { endSessions: [{ actionType, patronId: userId }] },
  });
}

export async function fetchPatronGroups(client: FolioClient): Promise<PatronGroup[]> {
  const result = await client.request<Collection<PatronGroup>>('/groups', {
    query: { query: 'cql.allRecords=1', limit: 200 },
  });
  return listOf(result, 'usergroups');
}

export interface NewPatron {
  firstName: string;
  lastName: string;
  preferredFirstName?: string;
  email: string;
  phone?: string;
  patronGroupId: string;
  /** Days until the self-registered card expires. */
  expiryDays: number;
}

/**
 * Create a self-registered patron.
 *
 * Unlike the prototype, the account is created active, in a real patron group,
 * with a barcode and an expiry date. Without those a FOLIO user exists but
 * cannot borrow anything, which made self-registration a dead end.
 */
export async function registerPatron(
  client: FolioClient,
  patron: NewPatron,
): Promise<FolioUser> {
  const barcode = generateBarcode();
  const expiration = new Date(Date.now() + patron.expiryDays * 24 * 60 * 60_000);

  return client.request<FolioUser>('/users', {
    method: 'POST',
    body: {
      username: patron.email.toLowerCase(),
      barcode,
      active: true,
      type: 'patron',
      patronGroup: patron.patronGroupId,
      expirationDate: expiration.toISOString().slice(0, 10),
      personal: {
        firstName: patron.firstName,
        lastName: patron.lastName,
        preferredFirstName: patron.preferredFirstName || undefined,
        email: patron.email,
        phone: patron.phone || undefined,
        preferredContactTypeId: '002',
      },
    },
  });
}

/**
 * Self-registration barcodes are time-ordered with a random tail, which keeps
 * them short enough to print on a temporary card while staying collision-safe
 * across the handful of kiosks a library runs.
 */
export function generateBarcode(now = Date.now(), random = Math.random): string {
  const stamp = now.toString(36).toUpperCase();
  const tail = Math.floor(random() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, '0');
  return `SS${stamp}${tail}`;
}

/** Confirm a configured service point exists before staff leave the kiosk. */
export async function verifyServicePoint(
  client: FolioClient,
  servicePointId: string,
): Promise<string> {
  const result = await client.request<{ name?: string }>(
    `/service-points/${encodeURIComponent(servicePointId)}`,
  );
  return result.name ?? servicePointId;
}
