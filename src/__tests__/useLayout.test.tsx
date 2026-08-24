import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

import { useLayout, type Layout } from '@/utils/useLayout';

/**
 * The checkout screen chooses its arrangement from these values, so the
 * thresholds are the actual contract: get them wrong and a tablet held upright
 * gets two columns too narrow to frame a barcode.
 */

const mockDimensions = { width: 1180, height: 820 };

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockDimensions,
}));

async function measure(width: number, height: number): Promise<Layout> {
  mockDimensions.width = width;
  mockDimensions.height = height;

  let captured: Layout | undefined;
  function Probe() {
    captured = useLayout();
    return <Text>x</Text>;
  }
  await render(<Probe />);
  return captured as Layout;
}

describe('orientation', () => {
  it('reports portrait when taller than wide', async () => {
    expect((await measure(820, 1180)).isPortrait).toBe(true);
    expect((await measure(1180, 820)).isPortrait).toBe(false);
  });

  it('treats an exact square as portrait, so the stacked layout wins ties', async () => {
    expect((await measure(1000, 1000)).isPortrait).toBe(true);
  });
});

describe('column choice', () => {
  it('stacks on an iPad held upright, where two columns squeeze both halves', async () => {
    expect((await measure(820, 1180)).isWide).toBe(false);
    expect((await measure(768, 1024)).isWide).toBe(false);
  });

  it('keeps two columns in landscape', async () => {
    expect((await measure(1180, 820)).isWide).toBe(true);
    expect((await measure(1366, 1024)).isWide).toBe(true);
  });

  /** A 12.9" iPad upright is 1024 wide — tall, but wide enough to split. */
  it('still splits a large tablet held upright', async () => {
    expect(await measure(1024, 1366)).toMatchObject({ isPortrait: true, isWide: true });
  });
});

describe('scanner height', () => {
  it('leaves the list most of the screen when stacked', async () => {
    const layout = await measure(820, 1180);
    expect(layout.scannerHeight).toBeLessThan(layout.height * 0.4);
  });

  /**
   * Regression guard: an unclamped fraction of height made the viewfinder
   * taller than its own column on a large tablet held upright.
   */
  it('never lets the viewfinder outgrow its column', async () => {
    const layout = await measure(1024, 1366);
    expect(layout.scannerHeight).toBeLessThanOrEqual(layout.width / 2);
  });

  it('stays usable on the smallest supported screens', async () => {
    expect((await measure(768, 1024)).scannerHeight).toBeGreaterThanOrEqual(220);
    expect((await measure(1024, 600)).scannerHeight).toBeGreaterThanOrEqual(260);
  });
});
