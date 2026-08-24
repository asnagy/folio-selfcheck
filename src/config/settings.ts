import * as Crypto from 'expo-crypto';

import { deleteItem, getItem, setItem } from './secureStorage';

import type { AuthTokens } from '@/folio/types';

/**
 * Kiosk configuration, held in the platform keystore.
 *
 * Two rules shape this module. The service-account password is never persisted
 * — it is used once to obtain tokens and then discarded, so a stolen tablet
 * yields at most a revocable refresh token. And the admin PIN is stored only as
 * a salted hash, so reading the keystore does not reveal the way back in.
 */

const KEY_SETTINGS = 'folio.selfcheck.settings';
const KEY_TOKENS = 'folio.selfcheck.tokens';
const KEY_ADMIN_PIN = 'folio.selfcheck.adminPin';

/**
 * How the kiosk sits in its stand. `auto` follows the device, which suits a
 * tablet people pick up; a wall mount usually wants one orientation pinned so
 * the screen cannot be rotated by a patron.
 */
export type OrientationMode = 'auto' | 'landscape' | 'portrait';

export interface KioskSettings {
  orientation: OrientationMode;
  baseUrl: string;
  tenant: string;
  servicePointId: string;
  servicePointName?: string;
  /** Shown in the header so staff can tell stations apart. */
  stationName: string;
  /** Seconds of inactivity before a patron session is abandoned. */
  idleTimeoutSeconds: number;
  /** Seconds the "are you still there?" warning shows before reset. */
  idleWarningSeconds: number;
  requirePatronPin: boolean;
  allowSelfRegistration: boolean;
  allowRenewals: boolean;
  showFeesAndFines: boolean;
  selfRegistrationGroupId?: string;
  selfRegistrationExpiryDays: number;
  /** Owed amount at or above which borrowing is refused. Zero disables. */
  feeBlockThreshold: number;
}

export const DEFAULT_SETTINGS: KioskSettings = {
  orientation: 'auto',
  baseUrl: '',
  tenant: '',
  servicePointId: '',
  stationName: 'Self Check Out',
  idleTimeoutSeconds: 90,
  idleWarningSeconds: 20,
  requirePatronPin: false,
  allowSelfRegistration: false,
  allowRenewals: true,
  showFeesAndFines: true,
  selfRegistrationExpiryDays: 365,
  feeBlockThreshold: 0,
};

function normaliseBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function mergeSettings(stored: Partial<KioskSettings> | undefined): KioskSettings {
  const merged = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
  return { ...merged, baseUrl: normaliseBaseUrl(merged.baseUrl) };
}

export function isConfigured(settings: KioskSettings): boolean {
  return (
    settings.baseUrl.length > 0 &&
    settings.tenant.length > 0 &&
    settings.servicePointId.length > 0
  );
}

async function readJson<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    // A corrupt or unreadable entry must not brick the kiosk; fall back to
    // defaults and let staff reconfigure.
    return undefined;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await setItem(key, JSON.stringify(value));
}

export async function loadSettings(): Promise<KioskSettings> {
  return mergeSettings(await readJson<Partial<KioskSettings>>(KEY_SETTINGS));
}

export async function saveSettings(settings: KioskSettings): Promise<void> {
  await writeJson(KEY_SETTINGS, { ...settings, baseUrl: normaliseBaseUrl(settings.baseUrl) });
}

export async function loadTokens(): Promise<AuthTokens | undefined> {
  return readJson<AuthTokens>(KEY_TOKENS);
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await writeJson(KEY_TOKENS, tokens);
}

export async function clearTokens(): Promise<void> {
  await deleteItem(KEY_TOKENS);
}

interface StoredPin {
  salt: string;
  hash: string;
}

function randomSalt(): string {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 36 ** 6).toString(36)).join('');
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function setAdminPin(pin: string): Promise<void> {
  const salt = randomSalt();
  await writeJson(KEY_ADMIN_PIN, { salt, hash: await hashPin(pin, salt) } satisfies StoredPin);
}

export async function hasAdminPin(): Promise<boolean> {
  return (await readJson<StoredPin>(KEY_ADMIN_PIN)) !== undefined;
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const stored = await readJson<StoredPin>(KEY_ADMIN_PIN);
  // With no PIN set the station is unconfigured, so the gate stays open long
  // enough for staff to perform first-run setup and choose one.
  if (!stored) return true;
  return (await hashPin(pin, stored.salt)) === stored.hash;
}

/** Wipe every stored secret. Used by the "reset this station" action. */
export async function resetStation(): Promise<void> {
  await Promise.all([
    deleteItem(KEY_SETTINGS),
    deleteItem(KEY_TOKENS),
    deleteItem(KEY_ADMIN_PIN),
  ]);
}
