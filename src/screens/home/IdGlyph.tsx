import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { IdMethod } from '@/config/settings';
import { palette } from '@/theme';

/**
 * The pictogram beside the identification hint.
 *
 * Drawn with plain views rather than SVG: each mark is a rectangle or a bar, so
 * borders and flex express them exactly, and the app avoids taking on a vector
 * dependency for three small glyphs.
 */

const STROKE = 3;

/** Bar widths in the barcode card, mirroring the design's rhythm. */
const BARCODE_BARS = [2, 4, 2, 5, 2];

export function IdGlyph({ method }: { method: IdMethod }) {
  if (method === 'qr') {
    return (
      <View style={[styles.frame, styles.qrFrame]} accessibilityElementsHidden>
        <View style={styles.qrInner} />
      </View>
    );
  }

  if (method === 'magstripe') {
    return (
      <View style={[styles.frame, styles.card, styles.swipeCard]} accessibilityElementsHidden>
        <View style={styles.swipeBar} />
      </View>
    );
  }

  return (
    <View style={[styles.frame, styles.card, styles.barcodeCard]} accessibilityElementsHidden>
      {BARCODE_BARS.map((width, index) => (
        <View key={index} style={[styles.bar, { width }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderWidth: STROKE, borderColor: palette.primary, flexShrink: 0 },
  card: { width: 56, height: 40, borderRadius: 5 },
  barcodeCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  bar: { height: 20, backgroundColor: palette.primary },
  qrFrame: { width: 44, height: 56, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  qrInner: { width: 22, height: 22, borderWidth: STROKE, borderColor: palette.primary },
  swipeCard: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 7 },
  swipeBar: { width: 38, height: 6, borderRadius: 3, backgroundColor: palette.primary },
});
