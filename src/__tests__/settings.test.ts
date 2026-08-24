import * as storage from '@/config/secureStorage';

import {
  DEFAULT_SETTINGS,
  hasAdminPin,
  isConfigured,
  loadSettings,
  mergeSettings,
  resetStation,
  saveSettings,
  saveTokens,
  setAdminPin,
  verifyAdminPin,
} from '@/config/settings';

const store = (storage as unknown as { __store: Map<string, string> }).__store;

beforeEach(() => store.clear());

describe('mergeSettings', () => {
  it('fills gaps from defaults so a partial stored blob cannot crash a screen', () => {
    expect(mergeSettings({ tenant: 'diku' })).toMatchObject({
      tenant: 'diku',
      idleTimeoutSeconds: DEFAULT_SETTINGS.idleTimeoutSeconds,
      requirePatronPin: false,
    });
  });

  it('strips a trailing slash so URLs never double up', () => {
    expect(mergeSettings({ baseUrl: 'https://folio.example.org/' }).baseUrl).toBe(
      'https://folio.example.org',
    );
  });
});

describe('isConfigured', () => {
  it('requires a URL, a tenant and a service point', () => {
    expect(isConfigured(DEFAULT_SETTINGS)).toBe(false);
    expect(
      isConfigured({ ...DEFAULT_SETTINGS, baseUrl: 'https://x', tenant: 'diku', servicePointId: 'sp' }),
    ).toBe(true);
    expect(isConfigured({ ...DEFAULT_SETTINGS, baseUrl: 'https://x', tenant: 'diku' })).toBe(false);
  });
});

describe('persistence', () => {
  it('round-trips settings through the keystore', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, tenant: 'diku', stationName: 'Ground floor' });
    await expect(loadSettings()).resolves.toMatchObject({ tenant: 'diku', stationName: 'Ground floor' });
  });

  it('falls back to defaults when the stored blob is corrupt', async () => {
    store.set('folio.selfcheck.settings', '{ not json');
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  /**
   * The service-account password must never reach the device keystore. This
   * asserts the whole store, so a future field that carries it fails here.
   */
  it('never writes a password to storage', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, tenant: 'diku' });
    await saveTokens({ accessToken: 'a', accessTokenExpiresAt: 1, mode: 'expiry' });

    const everything = [...store.values()].join(' ');
    expect(everything).not.toMatch(/password/i);
  });
});

describe('admin PIN', () => {
  it('accepts the correct PIN and rejects a wrong one', async () => {
    await setAdminPin('4821');
    await expect(verifyAdminPin('4821')).resolves.toBe(true);
    await expect(verifyAdminPin('0000')).resolves.toBe(false);
  });

  it('stores only a salted hash, never the PIN itself', async () => {
    await setAdminPin('4821');
    const raw = store.get('folio.selfcheck.adminPin') ?? '';
    expect(raw).not.toContain('"4821"');
    expect(JSON.parse(raw)).toMatchObject({ salt: expect.any(String), hash: expect.any(String) });
  });

  it('leaves the gate open before a PIN is chosen, so first-run setup is possible', async () => {
    await expect(hasAdminPin()).resolves.toBe(false);
    await expect(verifyAdminPin('anything')).resolves.toBe(true);
  });

  it('closes the gate once a PIN exists', async () => {
    await setAdminPin('4821');
    await expect(hasAdminPin()).resolves.toBe(true);
  });
});

describe('resetStation', () => {
  it('erases configuration, tokens and the staff PIN together', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, tenant: 'diku' });
    await saveTokens({ accessToken: 'a', accessTokenExpiresAt: 1, mode: 'expiry' });
    await setAdminPin('4821');

    await resetStation();

    expect(store.size).toBe(0);
  });
});
