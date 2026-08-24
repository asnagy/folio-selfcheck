/**
 * FOLIO's refresh-token login returns its tokens in `Set-Cookie` rather than
 * the response body. React Native has no cookie jar we can read from, so we
 * parse the header ourselves and hold the tokens in secure storage instead.
 */

/**
 * Split a possibly-folded `Set-Cookie` header into individual cookies.
 *
 * `Headers.get` joins repeated headers with ", ", which collides with the comma
 * inside `Expires=Tue, 01 Jan 2030 ...`. We therefore only split on a comma that
 * is followed by a plausible `cookie-name=` token.
 */
export function splitSetCookie(header: string): string[] {
  return header
    .split(/,(?=\s*[A-Za-z0-9!#$%&'*+\-.^_`|~]+\s*=)/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Read all `Set-Cookie` values from a response across RN and Node header impls.
 *
 * `getSetCookie` is not a guarantee of separation: when the header arrived as a
 * single folded string it comes back as one folded entry. Every entry is
 * therefore re-split, which is a no-op on already-separated cookies.
 */
export function readSetCookies(headers: Headers): string[] {
  const withGetter = headers as Headers & { getSetCookie?: () => string[] };
  const values =
    typeof withGetter.getSetCookie === 'function' ? withGetter.getSetCookie() : [];

  const raw = values.length > 0 ? values : [headers.get('set-cookie') ?? ''];
  return raw.filter(Boolean).flatMap(splitSetCookie);
}

/** Extract a single cookie's value by name, or undefined if absent. */
export function cookieValue(cookies: string[], name: string): string | undefined {
  for (const cookie of cookies) {
    const [pair] = cookie.split(';');
    if (!pair) continue;
    const index = pair.indexOf('=');
    if (index === -1) continue;
    if (pair.slice(0, index).trim() === name) {
      const value = pair.slice(index + 1).trim();
      // An empty value is how servers clear a cookie; treat it as absent.
      return value.length > 0 ? value : undefined;
    }
  }
  return undefined;
}

/** Build a `Cookie` request header from name/value pairs, skipping empties. */
export function buildCookieHeader(pairs: Record<string, string | undefined>): string | undefined {
  const parts = Object.entries(pairs)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([name, value]) => `${name}=${value}`);
  return parts.length > 0 ? parts.join('; ') : undefined;
}

export const ACCESS_COOKIE = 'folioAccessToken';
export const REFRESH_COOKIE = 'folioRefreshToken';
