import React from 'react';
import { PaperProvider } from 'react-native-paper';
import { fireEvent, render, type RenderResult } from '@testing-library/react-native';

import { CheckoutScreen } from '@/screens/CheckoutScreen';
import { DEFAULT_SETTINGS } from '@/config/settings';
import { FolioError } from '@/folio/errors';
import type { PatronSnapshot } from '@/folio/types';
import { theme } from '@/theme';

/**
 * The rule under test: a failed item never removes the patron from the flow.
 * The prototype replaced the whole screen on any error, so one reference book
 * ended a session that still had nine borrowable items in it.
 */

const mockCheckOut = jest.fn();
const mockSettings = { ...DEFAULT_SETTINGS, servicePointId: 'sp-1', feeBlockThreshold: 0 };
const mockSession = {
  patron: undefined as PatronSnapshot | undefined,
  checkouts: [] as unknown[],
  addCheckout: jest.fn(),
  reportActivity: jest.fn(),
  endSession: jest.fn(),
};

jest.mock('@/folio/api', () => ({
  checkOutByBarcode: (...args: unknown[]) => mockCheckOut(...args),
  blockText: (block: { message?: string }) => block.message ?? 'Blocked',
}));

jest.mock('@/config/SettingsContext', () => ({
  useSettings: () => ({ settings: mockSettings, client: { request: jest.fn() } }),
}));

jest.mock('@/session/SessionContext', () => ({
  useSession: () => mockSession,
}));

// The camera cannot run under Jest; the manual field exercises the same path.
jest.mock('@/components/CameraScanner', () => ({ CameraScanner: () => null }));

const patron: PatronSnapshot = {
  user: { id: 'u1', barcode: '111', personal: { firstName: 'Ada' } },
  loans: [],
  fees: [],
  blocks: [],
  totalOwed: 0,
  borrowingBlocked: false,
};

const navigation = { navigate: jest.fn(), replace: jest.fn() };

async function setup(): Promise<RenderResult> {
  return render(
    <PaperProvider theme={theme}>
      <CheckoutScreen
        navigation={navigation as never}
        route={{ key: 'k', name: 'Checkout' } as never}
      />
    </PaperProvider>,
  );
}

/** Type a barcode and press Enter, the same path a wedge scanner takes. */
async function scan(view: RenderResult, barcode: string) {
  const field = view.getByLabelText('Or type the item barcode');
  await fireEvent.changeText(field, barcode);
  await fireEvent(field, 'submitEditing');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.patron = patron;
  mockSession.checkouts = [];
});

it('greets the patron by their first name', async () => {
  const view = await setup();
  expect(view.getByText(/Check out for Ada/)).toBeTruthy();
});

it('records a successful checkout and shows the due date', async () => {
  mockCheckOut.mockResolvedValue({
    id: 'loan-1',
    dueDate: '2026-04-01T23:59:00.000Z',
    item: { title: 'Dune' },
  });

  const view = await setup();
  await scan(view, 'item-1');

  expect(mockCheckOut).toHaveBeenCalledWith(expect.anything(), {
    itemBarcode: 'item-1',
    userBarcode: '111',
    servicePointId: 'sp-1',
  });
  expect(mockSession.addCheckout).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Dune', barcode: 'item-1' }),
  );
  expect(view.getByText(/Dune is yours/)).toBeTruthy();
});

it('keeps the patron scanning after an item is refused', async () => {
  mockCheckOut.mockRejectedValue(
    new FolioError({ kind: 'not-loanable', patronMessage: 'This item cannot be borrowed.', needsStaff: true }),
  );

  const view = await setup();
  await scan(view, 'bad-item');

  expect(view.getByText('This item cannot be borrowed.')).toBeTruthy();
  // The barcode field is still on screen, so the session continues.
  expect(view.getByLabelText('Or type the item barcode')).toBeTruthy();
  expect(navigation.navigate).not.toHaveBeenCalledWith('Home');
});

it('tells a patron they may keep going when the failure is only theirs', async () => {
  mockCheckOut.mockRejectedValue(
    new FolioError({ kind: 'already-out', patronMessage: 'You already have this item.', needsStaff: false }),
  );

  const view = await setup();
  await scan(view, 'dup-item');

  expect(view.getByText(/keep scanning your other items/)).toBeTruthy();
});

it('refuses to scan at all when the account is blocked', async () => {
  mockSession.patron = {
    ...patron,
    blocks: [{ message: 'Too many overdue items', blockBorrowing: true }],
    borrowingBlocked: true,
  };

  const view = await setup();

  expect(view.getByText('Too many overdue items')).toBeTruthy();
  await scan(view, 'item-1');
  expect(mockCheckOut).not.toHaveBeenCalled();
});

it('blocks borrowing once fees reach the configured threshold', async () => {
  mockSettings.feeBlockThreshold = 10;
  mockSession.patron = { ...patron, totalOwed: 12 };

  const view = await setup();
  await scan(view, 'item-1');

  expect(mockCheckOut).not.toHaveBeenCalled();
  expect(view.getByText(/cannot borrow until it is paid/)).toBeTruthy();
  mockSettings.feeBlockThreshold = 0;
});

it('reports every touch so the idle timer never fires mid-scan', async () => {
  mockCheckOut.mockResolvedValue({ id: 'loan-1', item: { title: 'Dune' } });
  const view = await setup();
  await scan(view, 'item-1');

  expect(mockSession.reportActivity).toHaveBeenCalled();
});
