import { ACCESS_COOKIE, REFRESH_COOKIE, buildCookieHeader, cookieValue, readSetCookies } from './cookies';
import { classifyFolioMessage, extractFolioMessage, networkError } from './errors';
import type { AuthTokens, FolioConnection } from './types';

/**
 * Login against a FOLIO tenant.
 *
 * Eureka (Kong + Keycloak) and recent Okapi builds both expose
 * `/authn/login-with-expiry`, which issues short-lived access tokens with a
 * rotating refresh token. Older tenants only have `/authn/login`, which returns
 * a single long-lived token. We try the modern endpoint first and fall back, so
 * one build works across releases and survives a Eureka migration.
 */

const REQUEST_TIMEOUT_MS = 20_000;

/** Refresh this far before actual expiry so a scan never races the deadline. */
export const REFRESH_SKEW_MS = 60_000;

function parseExpiry(value: unknown, fallbackMs: number): number {
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now() + fallbackMs;
}

export async function timedFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (cause) {
    throw networkError(cause instanceof Error ? cause.message : String(cause));
  } finally {
    clearTimeout(timer);
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function loginWithExpiry(
  connection: FolioConnection,
  username: string,
  password: string,
): Promise<AuthTokens | undefined> {
  const response = await timedFetch(`${connection.baseUrl}/authn/login-with-expiry`, {
    method: 'POST',
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
      'x-okapi-tenant': connection.tenant,
    },
    body: JSON.stringify({ username, password }),
  });

  // A tenant that predates RTR answers 404/400 here; let the caller fall back.
  if (response.status === 404 || response.status === 405) return undefined;

  const body = await readBody(response);
  if (!response.ok) {
    throw classifyFolioMessage(extractFolioMessage(body), response.status);
  }

  const cookies = readSetCookies(response.headers);
  const accessToken = cookieValue(cookies, ACCESS_COOKIE);
  const refreshToken = cookieValue(cookies, REFRESH_COOKIE);

  // Some gateways strip Set-Cookie; without an access token we cannot proceed
  // in this mode, so signal a fallback rather than storing a broken session.
  if (!accessToken) return undefined;

  const payload = (body ?? {}) as { accessTokenExpiration?: string; refreshTokenExpiration?: string };
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: parseExpiry(payload.accessTokenExpiration, 10 * 60_000),
    refreshTokenExpiresAt: refreshToken
      ? parseExpiry(payload.refreshTokenExpiration, 7 * 24 * 60 * 60_000)
      : undefined,
    mode: 'expiry',
  };
}

async function loginLegacy(
  connection: FolioConnection,
  username: string,
  password: string,
): Promise<AuthTokens> {
  const response = await timedFetch(`${connection.baseUrl}/authn/login`, {
    method: 'POST',
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
      'x-okapi-tenant': connection.tenant,
    },
    body: JSON.stringify({ username, password }),
  });

  const body = await readBody(response);
  if (!response.ok) {
    throw classifyFolioMessage(extractFolioMessage(body), response.status);
  }

  const headerToken = response.headers.get('x-okapi-token') ?? undefined;
  const bodyToken = (body as { okapiToken?: string } | undefined)?.okapiToken;
  const accessToken = headerToken ?? bodyToken;

  if (!accessToken) {
    throw classifyFolioMessage('Login succeeded but no token was returned.', response.status);
  }

  return {
    accessToken,
    // Legacy tokens carry no expiry; assume a day and re-login on 401.
    accessTokenExpiresAt: Date.now() + 24 * 60 * 60_000,
    mode: 'legacy',
  };
}

export async function login(
  connection: FolioConnection,
  username: string,
  password: string,
): Promise<AuthTokens> {
  const modern = await loginWithExpiry(connection, username, password);
  if (modern) return modern;
  return loginLegacy(connection, username, password);
}

/**
 * Exchange a refresh token for a new access token.
 *
 * Refresh tokens rotate: the response carries a new one, and the old is dead the
 * moment this succeeds. Callers must persist the returned pair atomically.
 */
export async function refresh(
  connection: FolioConnection,
  refreshToken: string,
): Promise<AuthTokens> {
  const cookie = buildCookieHeader({ [REFRESH_COOKIE]: refreshToken });
  const response = await timedFetch(`${connection.baseUrl}/authn/refresh`, {
    method: 'POST',
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
      'x-okapi-tenant': connection.tenant,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });

  const body = await readBody(response);
  if (!response.ok) {
    throw classifyFolioMessage(extractFolioMessage(body), response.status);
  }

  const cookies = readSetCookies(response.headers);
  const accessToken = cookieValue(cookies, ACCESS_COOKIE);
  if (!accessToken) {
    throw classifyFolioMessage('Refresh succeeded but no access token was returned.', response.status);
  }

  const nextRefresh = cookieValue(cookies, REFRESH_COOKIE) ?? refreshToken;
  const payload = (body ?? {}) as { accessTokenExpiration?: string; refreshTokenExpiration?: string };

  return {
    accessToken,
    refreshToken: nextRefresh,
    accessTokenExpiresAt: parseExpiry(payload.accessTokenExpiration, 10 * 60_000),
    refreshTokenExpiresAt: parseExpiry(payload.refreshTokenExpiration, 7 * 24 * 60 * 60_000),
    mode: 'expiry',
  };
}

export function isExpired(tokens: AuthTokens, now = Date.now()): boolean {
  return tokens.accessTokenExpiresAt - REFRESH_SKEW_MS <= now;
}

export function canRefresh(tokens: AuthTokens, now = Date.now()): boolean {
  if (!tokens.refreshToken) return false;
  if (tokens.refreshTokenExpiresAt === undefined) return true;
  return tokens.refreshTokenExpiresAt > now;
}
