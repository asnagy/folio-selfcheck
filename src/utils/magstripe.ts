/**
 * Mag-stripe swipe decoding.
 *
 * A reader behaves as a keyboard: swiping types the encoded track and presses
 * Enter. Only the patron barcode is wanted from that burst, so the framing
 * characters ISO 7811 puts around the data are stripped here.
 *
 * Track 2 looks like `;1234567890?` — a `;` start sentinel, the digits, a `?`
 * end sentinel and sometimes a trailing LRC character. Track 1 starts `%B` and
 * separates fields with `^`. Passing any of that to FOLIO verbatim would look
 * up a barcode that does not exist, which is why the raw burst is never used
 * directly.
 */

/** Characters that frame the data rather than forming part of it. */
const START_SENTINELS = /^[;%! ]+B?/;
const END_SENTINEL_ONWARDS = /\?.*$/;

export function parseSwipe(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  let value = trimmed.replace(START_SENTINELS, '').replace(END_SENTINEL_ONWARDS, '');

  // Track 1 packs several fields; the first, before any separator, is the id.
  const [firstField] = value.split(/[^0-9A-Za-z]/);
  value = (firstField ?? '').trim();

  return value.length > 0 ? value : undefined;
}

/**
 * A swipe arrives far faster than a person types, which is how a wedge burst is
 * told apart from someone using an on-screen keyboard.
 */
export const SWIPE_MAX_GAP_MS = 120;
