import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Key/value storage for kiosk configuration and FOLIO tokens.
 *
 * On a device this is the iOS Keychain or Android Keystore, which is what makes
 * holding a service-account refresh token on a public tablet acceptable.
 *
 * `expo-secure-store` has no web implementation — it ships an empty stub — so
 * the browser build falls back to `localStorage`. That fallback exists so the
 * UI and the FOLIO flows can be exercised in a browser during development.
 *
 * It is NOT a secure store. `localStorage` is readable by any script on the
 * origin and by anyone who opens developer tools, which is precisely the
 * weakness that made the original web prototype unsuitable for a public kiosk.
 * Never deploy the web build as a real self check station: use it for
 * development and demos, and ship the native build to tablets.
 */

const isWeb = Platform.OS === 'web';

function webStorage(): Storage | undefined {
  try {
    // Absent in SSR, and access itself throws when site data is blocked.
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

export async function getItem(key: string): Promise<string | null> {
  if (isWeb) return webStorage()?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    webStorage()?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    webStorage()?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

/** True when secrets are held in real platform-backed secure storage. */
export const isSecureStorage = !isWeb;
