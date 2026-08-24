import {
  endPatronSession,
  findUserByBarcode,
  generateBarcode,
  loadPatronSnapshot,
  registerPatron,
  sumOwed,
  verifyPatronPin,
} from '@/folio/api';
import type { FolioClient } from '@/folio/client';
import { FolioError } from '@/folio/errors';

/**
 * A stand-in for FolioClient. `request` always returns a promise, because the
 * API layer chains `.then`/`.catch` on it to degrade optional lookups.
 */
function stubClient(handler: (path: string, options?: unknown) => unknown): FolioClient {
  const request = jest.fn(async (path: string, options?: unknown) => handler(path, options));
  return { request } as unknown as FolioClient;
}

describe('findUserByBarcode', () => {
  it('escapes the barcode so a wildcard cannot widen the query', async () => {
    const request = jest.fn().mockResolvedValue({ users: [{ id: 'u1', active: true }] });
    const client = { request } as unknown as FolioClient;

    await findUserByBarcode(client, '*');

    expect(request).toHaveBeenCalledWith('/users', {
      query: { query: 'barcode=="\\*"', limit: 1 },
    });
  });

  it('rejects an unknown card without asking the patron to find staff', async () => {
    const client = stubClient(() => ({ users: [] }));
    await expect(findUserByBarcode(client, '999')).rejects.toMatchObject({
      kind: 'not-found',
      needsStaff: false,
    });
  });

  it('refuses an inactive account', async () => {
    const client = stubClient(() => ({ users: [{ id: 'u1', active: false }] }));
    await expect(findUserByBarcode(client, '111')).rejects.toMatchObject({ kind: 'blocked' });
  });

  it('refuses an expired card', async () => {
    const client = stubClient(() => ({
      users: [{ id: 'u1', active: true, expirationDate: '2020-01-01' }],
    }));
    await expect(findUserByBarcode(client, '111')).rejects.toMatchObject({ kind: 'blocked' });
  });

  it('accepts an active card whose expiry is in the future', async () => {
    const client = stubClient(() => ({
      users: [{ id: 'u1', active: true, expirationDate: '2999-01-01' }],
    }));
    await expect(findUserByBarcode(client, '111')).resolves.toMatchObject({ id: 'u1' });
  });
});

describe('verifyPatronPin', () => {
  it('reports a wrong PIN as a normal false, not a system error', async () => {
    const client = stubClient(() => {
      throw new FolioError({ kind: 'unknown', patronMessage: 'nope', status: 422 });
    });
    await expect(verifyPatronPin(client, 'u1', '0000')).resolves.toBe(false);
  });

  it('rethrows a genuine failure so it is not mistaken for a wrong PIN', async () => {
    const client = stubClient(() => {
      throw new FolioError({ kind: 'server', patronMessage: 'down', status: 500 });
    });
    await expect(verifyPatronPin(client, 'u1', '0000')).rejects.toBeInstanceOf(FolioError);
  });

  it('returns true when FOLIO accepts the PIN', async () => {
    const client = stubClient(() => undefined);
    await expect(verifyPatronPin(client, 'u1', '1234')).resolves.toBe(true);
  });
});

describe('loadPatronSnapshot', () => {
  const user = { id: 'u1', barcode: '111' };

  it('collects loans, fees and both kinds of block', async () => {
    const client = stubClient((path) => {
      if (path === '/circulation/loans') return { loans: [{ id: 'l1' }] };
      if (path === '/accounts') return { accounts: [{ id: 'f1', remaining: 3.5 }] };
      if (path.startsWith('/automated-patron-blocks')) {
        return { automatedPatronBlocks: [{ message: 'Too many overdue', blockBorrowing: true }] };
      }
      if (path === '/manualblocks') return { manualblocks: [] };
      return {};
    });

    const snapshot = await loadPatronSnapshot(client, user);

    expect(snapshot.loans).toHaveLength(1);
    expect(snapshot.totalOwed).toBe(3.5);
    expect(snapshot.borrowingBlocked).toBe(true);
  });

  /**
   * Not every tenant runs mod-feesfines or mod-patron-blocks. A library without
   * them must still be able to lend, so those lookups degrade rather than throw.
   */
  it('still allows borrowing when the optional modules are unavailable', async () => {
    const client = stubClient((path) => {
      if (path === '/circulation/loans') return { loans: [] };
      throw new FolioError({ kind: 'server', patronMessage: 'no module', status: 404 });
    });

    const snapshot = await loadPatronSnapshot(client, user);

    expect(snapshot.fees).toEqual([]);
    expect(snapshot.blocks).toEqual([]);
    expect(snapshot.borrowingBlocked).toBe(false);
  });

  it('does not treat a non-borrowing block as a borrowing block', async () => {
    const client = stubClient((path) => {
      if (path === '/circulation/loans') return { loans: [] };
      if (path === '/accounts') return { accounts: [] };
      if (path.startsWith('/automated-patron-blocks')) {
        return { automatedPatronBlocks: [{ message: 'No requests', blockBorrowing: false }] };
      }
      return { manualblocks: [] };
    });

    await expect(loadPatronSnapshot(client, user)).resolves.toMatchObject({ borrowingBlocked: false });
  });
});

describe('endPatronSession', () => {
  /**
   * The prototype sent "Check-in" from a check-out kiosk, so FOLIO never fired
   * the patron's checkout notice and no receipt was ever emailed.
   */
  it('closes the session as Check-out so the receipt notice fires', async () => {
    const request = jest.fn().mockResolvedValue(undefined);
    await endPatronSession({ request } as unknown as FolioClient, 'u1');

    expect(request).toHaveBeenCalledWith('/circulation/end-patron-action-session', {
      method: 'POST',
      body: { endSessions: [{ actionType: 'Check-out', patronId: 'u1' }] },
    });
  });
});

describe('registerPatron', () => {
  /**
   * The prototype created users that were inactive, group-less and barcode-less,
   * which meant a self-registered patron could never borrow anything.
   */
  it('creates a card that can actually borrow', async () => {
    const request = jest.fn().mockImplementation((_path, options) => options.body);
    const created = await registerPatron({ request } as unknown as FolioClient, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.org',
      patronGroupId: 'group-1',
      expiryDays: 365,
    });

    expect(created).toMatchObject({ active: true, type: 'patron', patronGroup: 'group-1' });
    expect(created.barcode).toMatch(/^SS/);
    expect(created.expirationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('generateBarcode', () => {
  it('produces distinct, prefixed, uppercase barcodes', () => {
    const a = generateBarcode(1_700_000_000_000, () => 0.1);
    const b = generateBarcode(1_700_000_000_001, () => 0.9);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^SS[0-9A-Z]+$/);
  });
});

describe('sumOwed', () => {
  it('prefers the remaining balance over the original amount', () => {
    expect(sumOwed([{ id: '1', amount: 10, remaining: 2.5 }, { id: '2', amount: 1 }])).toBe(3.5);
  });

  it('is zero for an account with no charges', () => {
    expect(sumOwed([])).toBe(0);
  });
});
