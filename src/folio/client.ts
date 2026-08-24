import { ACCESS_COOKIE, buildCookieHeader } from './cookies';
import { canRefresh, isExpired, login, refresh, timedFetch } from './auth';
import { FolioError, classifyFolioMessage, extractFolioMessage } from './errors';
import type { AuthTokens, FolioConnection } from './types';

/**
 * A single authenticated conversation with one FOLIO tenant.
 *
 * The kiosk runs unattended for weeks, so token lifecycle is the client's job:
 * it refreshes proactively before expiry, recovers from a 401 exactly once, and
 * hands the caller a persisted-token callback so a restart resumes the session
 * without a staff member retyping the service-account password.
 */

export interface FolioClientOptions {
  connection: FolioConnection;
  tokens?: AuthTokens;
  /** Persist rotated tokens. Called whenever the token pair changes. */
  onTokensChanged?: (tokens: AuthTokens) => void | Promise<void>;
  /** Called when the session is unrecoverable and staff must reconfigure. */
  onAuthLost?: () => void;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Query parameters; undefined values are dropped. */
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions['query']): string {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const parts = Object.entries(query)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length > 0 ? `${url}?${parts.join('&')}` : url;
}

export class FolioClient {
  private readonly connection: FolioConnection;
  private tokens?: AuthTokens;
  private readonly onTokensChanged?: FolioClientOptions['onTokensChanged'];
  private readonly onAuthLost?: () => void;
  /** Shared across concurrent callers so we never refresh twice in parallel. */
  private inFlightRefresh?: Promise<AuthTokens>;

  constructor(options: FolioClientOptions) {
    this.connection = options.connection;
    this.tokens = options.tokens;
    this.onTokensChanged = options.onTokensChanged;
    this.onAuthLost = options.onAuthLost;
  }

  get tenant(): string {
    return this.connection.tenant;
  }

  get baseUrl(): string {
    return this.connection.baseUrl;
  }

  hasSession(): boolean {
    return this.tokens !== undefined;
  }

  /** Authenticate from scratch. Only Settings should call this. */
  async signIn(username: string, password: string): Promise<void> {
    await this.setTokens(await login(this.connection, username, password));
  }

  private async setTokens(tokens: AuthTokens): Promise<void> {
    this.tokens = tokens;
    await this.onTokensChanged?.(tokens);
  }

  /**
   * Refresh the access token, collapsing concurrent callers onto one request so
   * a rotating refresh token is never spent twice.
   */
  private async ensureFreshToken(): Promise<AuthTokens> {
    const current = this.tokens;
    if (!current) {
      throw new FolioError({
        kind: 'auth',
        patronMessage: 'This station is not set up yet. Please tell a staff member.',
        needsStaff: true,
        detail: 'No stored FOLIO session.',
      });
    }

    if (!isExpired(current)) return current;

    if (!canRefresh(current)) {
      // Legacy mode has nothing to refresh; let the request try and 401 if dead.
      if (current.mode === 'legacy') return current;
      this.onAuthLost?.();
      throw new FolioError({
        kind: 'auth',
        patronMessage: 'This station needs to be set up again. Please tell a staff member.',
        needsStaff: true,
        detail: 'Refresh token has expired.',
      });
    }

    this.inFlightRefresh ??= refresh(this.connection, current.refreshToken as string)
      .then(async (next) => {
        await this.setTokens(next);
        return next;
      })
      .finally(() => {
        this.inFlightRefresh = undefined;
      });

    try {
      return await this.inFlightRefresh;
    } catch (error) {
      this.onAuthLost?.();
      throw error;
    }
  }

  private authHeaders(tokens: AuthTokens): Record<string, string> {
    const cookie = buildCookieHeader({ [ACCESS_COOKIE]: tokens.accessToken });
    return {
      'x-okapi-tenant': this.connection.tenant,
      // Eureka reads the cookie; classic Okapi reads the header. Sending both
      // keeps one build working across gateways.
      'x-okapi-token': tokens.accessToken,
      ...(cookie ? { Cookie: cookie } : {}),
    };
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    let tokens = await this.ensureFreshToken();
    let response = await this.send(path, options, tokens);

    // A 401 despite a fresh token means the server rotated us out; retry once.
    if (response.status === 401 && canRefresh(tokens)) {
      this.tokens = { ...tokens, accessTokenExpiresAt: 0 };
      tokens = await this.ensureFreshToken();
      response = await this.send(path, options, tokens);
    }

    const text = await response.text();
    const body: unknown = text ? safeParse(text) : undefined;

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) this.onAuthLost?.();
      throw classifyFolioMessage(extractFolioMessage(body), response.status);
    }

    return body as T;
  }

  private send(path: string, options: RequestOptions, tokens: AuthTokens): Promise<Response> {
    const { method = 'GET', body, query, signal } = options;
    return timedFetch(buildUrl(this.connection.baseUrl, path, query), {
      method,
      credentials: 'omit',
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...this.authHeaders(tokens),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Escape a value for use inside a FOLIO CQL string literal. */
export function cqlQuote(value: string): string {
  return `"${value.replace(/[\\"*?]/g, (char) => `\\${char}`)}"`;
}
