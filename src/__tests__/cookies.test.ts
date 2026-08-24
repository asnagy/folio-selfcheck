import { buildCookieHeader, cookieValue, splitSetCookie } from '@/folio/cookies';

/**
 * Token extraction is the single point of failure for authentication: get the
 * splitting wrong and the kiosk silently loses its session in the field.
 */
describe('splitSetCookie', () => {
  it('splits multiple cookies folded into one header', () => {
    const header = 'folioAccessToken=abc; Path=/; HttpOnly, folioRefreshToken=def; Path=/; HttpOnly';
    expect(splitSetCookie(header)).toEqual([
      'folioAccessToken=abc; Path=/; HttpOnly',
      'folioRefreshToken=def; Path=/; HttpOnly',
    ]);
  });

  it('does not split on the comma inside an Expires date', () => {
    const header =
      'folioAccessToken=abc; Expires=Tue, 01 Jan 2030 00:00:00 GMT; Path=/, folioRefreshToken=def; Path=/';
    const parts = splitSetCookie(header);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain('Expires=Tue, 01 Jan 2030');
  });

  it('handles a single cookie with no comma at all', () => {
    expect(splitSetCookie('folioAccessToken=abc; Path=/')).toEqual(['folioAccessToken=abc; Path=/']);
  });
});

describe('cookieValue', () => {
  const cookies = ['folioAccessToken=abc123; Path=/', 'folioRefreshToken=ref456; Path=/'];

  it('finds a cookie by exact name', () => {
    expect(cookieValue(cookies, 'folioAccessToken')).toBe('abc123');
    expect(cookieValue(cookies, 'folioRefreshToken')).toBe('ref456');
  });

  it('returns undefined for a name that is absent', () => {
    expect(cookieValue(cookies, 'nope')).toBeUndefined();
  });

  it('treats a cleared cookie as absent', () => {
    expect(cookieValue(['folioAccessToken=; Max-Age=0'], 'folioAccessToken')).toBeUndefined();
  });

  it('does not match a name that is only a suffix of another', () => {
    expect(cookieValue(['xfolioAccessToken=zzz'], 'folioAccessToken')).toBeUndefined();
  });

  it('preserves base64 padding in token values', () => {
    expect(cookieValue(['folioAccessToken=eyJhbGc=; Path=/'], 'folioAccessToken')).toBe('eyJhbGc=');
  });
});

describe('buildCookieHeader', () => {
  it('joins present pairs and drops empty ones', () => {
    expect(buildCookieHeader({ a: '1', b: undefined, c: '3' })).toBe('a=1; c=3');
  });

  it('returns undefined when nothing is present', () => {
    expect(buildCookieHeader({ a: undefined })).toBeUndefined();
  });
});
