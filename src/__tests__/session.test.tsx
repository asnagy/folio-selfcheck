import React from 'react';
import { Text } from 'react-native';
import { act, render, type RenderResult } from '@testing-library/react-native';

import { DEFAULT_SETTINGS } from '@/config/settings';
import { SessionProvider, useSession } from '@/session/SessionContext';
import type { PatronSnapshot } from '@/folio/types';

/**
 * The idle timeout is the kiosk's central safety property: a patron who walks
 * away must not leave their account open for whoever steps up next.
 */

// `mock`-prefixed so the jest.mock factory may close over it.
const mockSettings = { ...DEFAULT_SETTINGS, idleTimeoutSeconds: 60, idleWarningSeconds: 15 };

jest.mock('@/config/SettingsContext', () => ({
  useSettings: () => ({ settings: mockSettings }),
}));

const patron: PatronSnapshot = {
  user: { id: 'u1', barcode: '111', personal: { firstName: 'Ada' } },
  loans: [],
  fees: [],
  blocks: [],
  totalOwed: 0,
  borrowingBlocked: false,
};

let api: ReturnType<typeof useSession>;
let view: RenderResult | undefined;

function Probe() {
  api = useSession();
  return (
    <>
      <Text testID="patron">{api.patron?.user.id ?? 'none'}</Text>
      <Text testID="remaining">{String(api.secondsRemaining ?? '-')}</Text>
      <Text testID="warning">{String(api.warning)}</Text>
      <Text testID="count">{String(api.checkouts.length)}</Text>
    </>
  );
}

function value(testID: string): string {
  if (!view) throw new Error('setup() must be called first');
  return view.getByTestId(testID).props.children as string;
}

/** Advance both the fake clock and the interval that reads it. */
async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

/** Render the provider under fake timers. Called explicitly by each test so the
 * timer mode is installed before React mounts anything. */
async function setup() {
  view = await render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );
}

beforeEach(() => jest.useFakeTimers());
afterEach(async () => {
  await view?.unmount();
  view = undefined;
  jest.useRealTimers();
});

it('starts with no patron signed in', async () => {
  await setup();
  expect(value('patron')).toBe('none');
  expect(value('remaining')).toBe('-');
});

it('opens a session and begins the countdown', async () => {
  await setup();
  await act(async () => api.startSession(patron));

  expect(value('patron')).toBe('u1');
  expect(value('remaining')).toBe('60');
});

it('clears the patron once the idle timeout elapses', async () => {
  await setup();
  await act(async () => api.startSession(patron));
  await advance(61_000);

  expect(value('patron')).toBe('none');
});

it('keeps the session alive while the patron is interacting', async () => {
  await setup();
  await act(async () => api.startSession(patron));

  // Touch every 30s across a span far longer than the 60s timeout.
  for (let elapsed = 0; elapsed < 150_000; elapsed += 30_000) {
    await advance(30_000);
    await act(async () => api.reportActivity());
  }

  expect(value('patron')).toBe('u1');
});

it('raises the warning only inside the warning window', async () => {
  await setup();
  await act(async () => api.startSession(patron));

  await advance(40_000);
  expect(value('warning')).toBe('false');

  await advance(8_000);
  expect(value('warning')).toBe('true');
});

it('discards scanned items along with the patron, so nothing carries over', async () => {
  await setup();
  await act(async () => {
    api.startSession(patron);
    api.addCheckout({ loan: { id: 'l1' }, title: 'Book', barcode: 'b1' });
  });
  expect(value('count')).toBe('1');

  await advance(61_000);

  expect(value('patron')).toBe('none');
  expect(value('count')).toBe('0');
});

it('ignores activity reported when no session is open', async () => {
  await setup();
  await act(async () => api.reportActivity());
  expect(value('remaining')).toBe('-');
});

it('ends immediately when the patron chooses to finish', async () => {
  await setup();
  await act(async () => api.startSession(patron));
  await act(async () => api.endSession());

  expect(value('patron')).toBe('none');
});
