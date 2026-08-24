import { FolioClient, cqlQuote } from '@/folio/client';
import { FolioError } from '@/folio/errors';
import type { AuthTokens } from '@/folio/types';

const connection = { baseUrl: 'https://folio.example.org', tenant: 'diku' };

function tokens(overrides: Partial<AuthTokens> = {}): AuthTokens {
  return {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    accessTokenExpiresAt: Date.now() + 10 * 60_000,
    refreshTokenExpiresAt: Date.now() + 24 * 60 * 60_000,
    mode: 'expiry',
    ...overrides,
  };
}

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('cqlQuote', () => {
  it('escapes characters that would otherwise alter a CQL query', () => {
    expect(cqlQuote('12345')).toBe('"12345"');
    // Without escaping, this barcode would inject a wildcard and match everyone.
    expect(cqlQuote('*')).toBe('"\\*"');
    expect(cqlQuote('a"b')).toBe('"a\\"b"');
    expect(cqlQuote('a\\b')).toBe('"a\\\\b"');
  });
});

describe('FolioClient', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('sends the tenant and both token forms so one build works on Eureka and Okapi', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ users: [] }));
    const client = new FolioClient({ connection, tokens: tokens() });

    await client.request('/users', { query: { query: 'barcode=="1"', limit: 1 } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://folio.example.org/users?query=barcode%3D%3D%221%22&limit=1');
    const headers = init.headers as Record<string, string>;
    expect(headers['x-okapi-tenant']).toBe('diku');
    expect(headers['x-okapi-token']).toBe('access-1');
    expect(headers.Cookie).toBe('folioAccessToken=access-1');
  });

  it('refreshes proactively when the access token is within the skew window', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          { accessTokenExpiration: new Date(Date.now() + 600_000).toISOString() },
          { headers: { 'set-cookie': 'folioAccessToken=access-2; Path=/, folioRefreshToken=refresh-2; Path=/' } },
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ users: [] }));

    const saved: AuthTokens[] = [];
    const client = new FolioClient({
      connection,
      // Already inside the 60s refresh skew.
      tokens: tokens({ accessTokenExpiresAt: Date.now() + 5_000 }),
      onTokensChanged: (next) => void saved.push(next),
    });

    await client.request('/users');

    expect(fetchMock.mock.calls[0][0]).toBe('https://folio.example.org/authn/refresh');
    expect(saved[0]?.accessToken).toBe('access-2');
    // The rotated refresh token must be persisted, or the next restart is dead.
    expect(saved[0]?.refreshToken).toBe('refresh-2');
    const headers = fetchMock.mock.calls[1][1].headers as Record<string, string>;
    expect(headers['x-okapi-token']).toBe('access-2');
  });

  it('spends a rotating refresh token only once across concurrent requests', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/authn/refresh')) {
        return jsonResponse(
          {},
          { headers: { 'set-cookie': 'folioAccessToken=access-2, folioRefreshToken=refresh-2' } },
        );
      }
      return jsonResponse({ users: [] });
    });

    const client = new FolioClient({
      connection,
      tokens: tokens({ accessTokenExpiresAt: Date.now() + 5_000 }),
    });

    await Promise.all([client.request('/users'), client.request('/accounts'), client.request('/groups')]);

    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/authn/refresh'));
    expect(refreshCalls).toHaveLength(1);
  });

  it('retries once after a 401 from a token the server rotated out', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ errors: [{ message: 'expired' }] }, { status: 401 }))
      .mockResolvedValueOnce(
        jsonResponse({}, { headers: { 'set-cookie': 'folioAccessToken=access-3, folioRefreshToken=refresh-3' } }),
      )
      .mockResolvedValueOnce(jsonResponse({ users: [] }));

    const client = new FolioClient({ connection, tokens: tokens() });
    await expect(client.request('/users')).resolves.toEqual({ users: [] });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('reports auth loss when the refresh token itself is expired', async () => {
    const onAuthLost = jest.fn();
    const client = new FolioClient({
      connection,
      tokens: tokens({ accessTokenExpiresAt: 0, refreshTokenExpiresAt: Date.now() - 1000 }),
      onAuthLost,
    });

    await expect(client.request('/users')).rejects.toBeInstanceOf(FolioError);
    expect(onAuthLost).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('turns a FOLIO validation error into a patron-safe FolioError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ errors: [{ message: 'Item is not loanable' }] }, { status: 422 }),
    );
    const client = new FolioClient({ connection, tokens: tokens() });

    await expect(client.request('/circulation/check-out-by-barcode', { method: 'POST' })).rejects.toMatchObject({
      kind: 'not-loanable',
      needsStaff: true,
    });
  });

  it('refuses to make a request with no stored session', async () => {
    const client = new FolioClient({ connection });
    await expect(client.request('/users')).rejects.toMatchObject({ kind: 'auth' });
  });
});
