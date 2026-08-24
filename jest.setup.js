// Jest environment shims for the Expo native modules the kiosk depends on.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    __store: store,
    getItemAsync: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    setItemAsync: jest.fn(async (k, v) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k) => void store.delete(k)),
    isAvailableAsync: jest.fn(async () => true),
  };
});

jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(async () => undefined),
  OrientationLock: { LANDSCAPE: 'LANDSCAPE' },
}));

// The storage adapter is mocked rather than expo-secure-store, so tests cover
// the same surface both the native and web builds call through.
jest.mock('@/config/secureStorage', () => {
  const store = new Map();
  return {
    __store: store,
    isSecureStorage: true,
    getItemAsync: undefined,
    getItem: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    setItem: jest.fn(async (k, v) => void store.set(k, v)),
    deleteItem: jest.fn(async (k) => void store.delete(k)),
  };
});

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(async () => undefined),
  deactivateKeepAwake: jest.fn(async () => undefined),
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(async (_alg, data) => `hashed:${data}`),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000000'),
}));
