import { useWindowDimensions } from 'react-native';

/**
 * Orientation-aware layout facts.
 *
 * A kiosk tablet may be mounted either way round, and the checkout screen needs
 * genuinely different arrangements: two columns side by side when it is wide,
 * one column stacked when it is tall. Reading this from window dimensions
 * rather than a device constant means the layout also stays correct on web, on
 * a split-screen iPad, and while a rotation animates.
 */

export interface Layout {
  width: number;
  height: number;
  /** Taller than it is wide. */
  isPortrait: boolean;
  /**
   * Enough width to place the scanner and the borrowed list side by side.
   * Below this, two columns leave the camera too narrow to frame a barcode
   * and squeeze the item titles into unreadable slivers.
   */
  isWide: boolean;
  /** Height for the camera panel, sized so the list keeps usable space. */
  scannerHeight: number;
}

/** Below this width, side-by-side columns stop being usable. */
const TWO_COLUMN_MIN_WIDTH = 900;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  const isPortrait = height >= width;
  const isWide = width >= TWO_COLUMN_MIN_WIDTH;

  /**
   * Stacked, the camera takes a band across the full width — a wide, shallow
   * shape that suits a library barcode and leaves the list room below.
   *
   * Both branches are clamped rather than a bare fraction of height. On a large
   * tablet held upright (a 12.9" iPad is 1024x1366, wide enough for two columns
   * yet very tall) an unbounded fraction produced a viewfinder taller than its
   * own column, which is the same awkward sliver stacking was meant to avoid.
   */
  const scannerHeight = isWide
    ? clamp(Math.round(height * 0.42), 260, 420)
    : clamp(Math.round(height * 0.26), 220, 320);

  return { width, height, isPortrait, isWide, scannerHeight };
}
