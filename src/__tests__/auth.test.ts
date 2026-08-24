import { canRefresh, isExpired, login, refresh } from '@/folio/auth';

const connection = { baseUrl: 'https://folio.example.org', tenant: 'diku' };

function response(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('login', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('prefers the refresh-token endpoint and reads tokens from cookies', async () => {
    const expiry = new Date(Date.now() + 600_000).toISOString();
    fetchMock.mockResolvedValueOnce(
      response(
        { accessTokenExpiration: expiry, refreshTokenExpiration: expiry },
        { headers: { 'set-cookie': 'folioAccessToken=a1; Path=/, folioRefreshToken=r1; Path=/' } },
      ),
    );

    const tokens = await login(connection, 'kiosk', 'secret');

    expect(fetchMock.mock.calls[0][0]).toBe('https://folio.example.org/authn/login-with-expiry');
    expect(tokens).toMatchObject({ accessToken: 'a1', refreshToken: 'r1', mode: 'expiry' });
  });

  /**
   * A tenant that predates refresh-token rotation answers 404 here. Falling back
   * is what lets one build serve libraries on different FOLIO releases.
   */
  it('falls back to legacy login when the modern endpoint is absent', async () => {
    fetchMock
      .mockResolvedValueOnce(response({}, { status: 404 }))
      .mockResolvedValueOnce(response({ okapiToken: 'legacy-token' }));

    const tokens = await login(connection, 'kiosk', 'secret');

    expect(fetchMock.mock.calls[1][0]).toBe('https://folio.example.org/authn/login');
    expect(tokens).toMatchObject({ accessToken: 'legacy-token', mode: 'legacy' });
    expect(tokens.refreshToken).toBeUndefined();
  });

  it('falls back when a gateway strips the Set-Cookie header', async () => {
    fetchMock
      .mockResolvedValueOnce(response({ accessTokenExpiration: new Date().toISOString() }))
      .mockResolvedValueOnce(response({}, { headers: { 'x-okapi-token': 'header-token' } }));

    await expect(login(connection, 'kiosk', 'secret')).resolves.toMatchObject({
      accessToken: 'header-token',
      mode: 'legacy',
    });
  });

  it('surfaces bad credentials as an auth error', async () => {
    fetchMock.mockResolvedValueOnce(
      response({ errors: [{ message: 'Password does not match' }] }, { status: 422 }),
    );
    await expect(login(connection, 'kiosk', 'wrong')).rejects.toBeDefined();
  });

  it('reports an unreachable gateway as a network failure', async () => {
    fetchMock.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));
    await expect(login(connection, 'kiosk', 'secret')).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('refresh', () => {
  it('sends the refresh token as a cookie and returns the rotated pair', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      response({}, { headers: { 'set-cookie': 'folioAccessToken=a2, folioRefreshToken=r2' } }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const tokens = await refresh(connection, 'r1');

    const init = fetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers.Cookie).toBe('folioRefreshToken=r1');
    expect(tokens).toMatchObject({ accessToken: 'a2', refreshToken: 'r2' });
  });

  it('keeps the existing refresh token when the server does not rotate it', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(response({}, { headers: { 'set-cookie': 'folioAccessToken=a2' } })) as unknown as typeof fetch;

    await expect(refresh(connection, 'r1')).resolves.toMatchObject({ refreshToken: 'r1' });
  });
});

describe('token lifetime helpers', () => {
  const base = { accessToken: 'a', mode: 'expiry' as const };

  it('treats a token inside the skew window as already expired', () => {
    expect(isExpired({ ...base, accessTokenExpiresAt: Date.now() + 30_000 })).toBe(true);
    expect(isExpired({ ...base, accessTokenExpiresAt: Date.now() + 300_000 })).toBe(false);
  });

  it('only allows refresh while the refresh token is live', () => {
    expect(canRefresh({ ...base, accessTokenExpiresAt: 0 })).toBe(false);
    expect(
      canRefresh({ ...base, accessTokenExpiresAt: 0, refreshToken: 'r', refreshTokenExpiresAt: Date.now() - 1 }),
    ).toBe(false);
    expect(
      canRefresh({ ...base, accessTokenExpiresAt: 0, refreshToken: 'r', refreshTokenExpiresAt: Date.now() + 60_000 }),
    ).toBe(true);
  });
});
