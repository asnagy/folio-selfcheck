import { parseSwipe } from '@/utils/magstripe';

/**
 * A mag-stripe reader types the whole encoded track. Only the barcode is
 * wanted; sending the sentinels to FOLIO would look up a patron that does not
 * exist.
 */
describe('parseSwipe', () => {
  it('strips track 2 sentinels', () => {
    expect(parseSwipe(';1234567890?')).toBe('1234567890');
  });

  it('drops a trailing LRC character after the end sentinel', () => {
    expect(parseSwipe(';1234567890?4')).toBe('1234567890');
  });

  it('reads the first field of a track 1 swipe', () => {
    expect(parseSwipe('%B1234567890^LOVELACE/ADA^250912?')).toBe('1234567890');
  });

  it('handles an already-clean barcode unchanged', () => {
    expect(parseSwipe('21234000123456')).toBe('21234000123456');
  });

  it('keeps alphanumeric barcodes', () => {
    expect(parseSwipe(';SS1A2B3C?')).toBe('SS1A2B3C');
  });

  it('returns undefined for empty or sentinel-only input', () => {
    expect(parseSwipe('')).toBeUndefined();
    expect(parseSwipe('   ')).toBeUndefined();
    expect(parseSwipe(';?')).toBeUndefined();
  });

  it('trims surrounding whitespace a reader may append', () => {
    expect(parseSwipe('  ;1234567890?  ')).toBe('1234567890');
  });
});
