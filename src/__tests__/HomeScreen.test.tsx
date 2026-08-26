import React from 'react';
import { PaperProvider } from 'react-native-paper';
import { fireEvent, render, type RenderResult } from '@testing-library/react-native';

import { HomeScreen } from '@/screens/HomeScreen';
import { DEFAULT_SETTINGS, type KioskSettings } from '@/config/settings';
import { HOME_COPY } from '@/screens/home/copy';
import { theme } from '@/theme';

/**
 * The home screen's contract: exactly one identification hint, never a choice
 * for the student, and the primary action inert until the station is set up.
 */

// `mock`-prefixed so the hoisted jest.mock factory may close over it, and
// populated inside setup() rather than at module scope.
const mockState = {
  settings: undefined as unknown as KioskSettings,
  configured: true,
  authLost: false,
};

jest.mock('@/config/SettingsContext', () => ({
  useSettings: () => mockState,
}));

jest.mock('@/session/SessionContext', () => ({
  useSession: () => ({ reportActivity: jest.fn() }),
}));

const navigation = { navigate: jest.fn() };

async function setup(patch: Partial<KioskSettings> = {}): Promise<RenderResult> {
  mockState.settings = { ...DEFAULT_SETTINGS, ...patch };
  return render(
    <PaperProvider theme={theme}>
      <HomeScreen navigation={navigation as never} route={{ key: 'k', name: 'Home' } as never} />
    </PaperProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState.configured = true;
  mockState.authLost = false;
});

describe('identification hint', () => {
  it('shows the card hint for a barcode station, and only that one', async () => {
    const view = await setup({ idMethod: 'barcode' });
    expect(view.getByText('library card')).toBeTruthy();
    expect(view.queryByText('library app')).toBeNull();
    expect(view.queryByText('student ID')).toBeNull();
  });

  it('shows the app hint for a QR station, and only that one', async () => {
    const view = await setup({ idMethod: 'qr' });
    expect(view.getByText('library app')).toBeTruthy();
    expect(view.queryByText('library card')).toBeNull();
    expect(view.queryByText('student ID')).toBeNull();
  });

  it('shows the swipe hint for a mag-stripe station, and only that one', async () => {
    const view = await setup({ idMethod: 'magstripe' });
    expect(view.getByText('student ID')).toBeTruthy();
    expect(view.queryByText('library card')).toBeNull();
    expect(view.queryByText('library app')).toBeNull();
  });
});

describe('branding', () => {
  it('renders the configured institution and station names', async () => {
    const view = await setup({
      institutionName: 'State University Libraries',
      stationName: 'Hale Library',
    });
    expect(view.getByText('State University Libraries')).toBeTruthy();
    expect(view.getByText('Hale Library')).toBeTruthy();
  });

  it('falls back to a generic name when no institution is configured', async () => {
    const view = await setup({ institutionName: '' });
    expect(view.getByText(HOME_COPY.fallbackInstitution)).toBeTruthy();
  });

  it('omits help desk details that have not been configured', async () => {
    const view = await setup({ helpDeskLocation: '', helpDeskHours: '' });
    expect(view.queryByText(/Help desk/)).toBeNull();
  });
});

describe('actions', () => {
  it('starts checkout from the primary button', async () => {
    const view = await setup();
    fireEvent.press(view.getByLabelText(HOME_COPY.primaryAction));
    expect(navigation.navigate).toHaveBeenCalledWith('PatronSignIn', { next: 'Checkout' });
  });

  it('hides the card card when self-registration is off, per settings', async () => {
    const view = await setup({ allowSelfRegistration: false });
    expect(view.queryByText(HOME_COPY.register.title)).toBeNull();
    expect(view.getByText(HOME_COPY.account.title)).toBeTruthy();
  });

  it('offers registration when it is enabled', async () => {
    const view = await setup({ allowSelfRegistration: true });
    expect(view.getByText(HOME_COPY.register.title)).toBeTruthy();
  });

  it('keeps the staff settings gate reachable', async () => {
    const view = await setup();
    fireEvent.press(view.getByLabelText(HOME_COPY.settingsLabel));
    expect(navigation.navigate).toHaveBeenCalledWith('AdminPin');
  });
});

describe('unconfigured station', () => {
  it('warns and refuses to start a checkout', async () => {
    mockState.configured = false;
    const view = await setup();

    expect(view.getByText(HOME_COPY.unconfigured.message)).toBeTruthy();
    fireEvent.press(view.getByLabelText(HOME_COPY.primaryAction));
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('reports a lost FOLIO session to staff', async () => {
    mockState.authLost = true;
    const view = await setup();
    expect(view.getByText(HOME_COPY.authLost.message)).toBeTruthy();
  });
});
