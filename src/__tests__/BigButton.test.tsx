import React from 'react';
import { StyleSheet } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { render } from '@testing-library/react-native';

import { BigButton } from '@/components/BigButton';
import { theme } from '@/theme';

/**
 * Regression guard for a truncated label.
 *
 * Paper applies its own 24pt horizontal margin to a Button's label. Stacked on
 * the padding BigButton sets in `contentStyle`, that consumed 96pt of a narrow
 * button's width and rendered "Renew" as "Ren…". The label must therefore keep
 * an explicit `marginHorizontal: 0`, leaving BigButton's padding as the single
 * source of horizontal spacing.
 */

function flatten(style: unknown): Record<string, unknown> {
  return (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;
}

async function labelStyleOf(element: React.ReactElement) {
  const view = await render(<PaperProvider theme={theme}>{element}</PaperProvider>);
  // Paper renders the label as the Text node carrying the button's caption.
  return flatten(view.getByText('Renew').props.style);
}

it('cancels Paper\'s default label margin so short labels are not truncated', async () => {
  expect(await labelStyleOf(<BigButton label="Renew" />)).toMatchObject({ marginHorizontal: 0 });
});

it('cancels the margin on hero buttons too', async () => {
  expect(await labelStyleOf(<BigButton label="Renew" hero />)).toMatchObject({ marginHorizontal: 0 });
});

it('keeps the label margin at zero for outlined buttons, which the renew action uses', async () => {
  expect(await labelStyleOf(<BigButton label="Renew" variant="outlined" />)).toMatchObject({
    marginHorizontal: 0,
  });
});

it('still applies its own horizontal padding, so text never touches the border', async () => {
  const view = await render(
    <PaperProvider theme={theme}>
      <BigButton label="Renew" />
    </PaperProvider>,
  );

  // Padding now comes solely from BigButton, so some node in the tree must
  // still carry it — otherwise the fix would have removed spacing entirely.
  const hasPadding = (node: { props?: { style?: unknown }; children?: unknown[] }): boolean => {
    if (flatten(node.props?.style).paddingHorizontal === 24) return true;
    const children = (node.children ?? []) as { props?: { style?: unknown }; children?: unknown[] }[];
    return children.some((child) => typeof child === 'object' && child !== null && hasPadding(child));
  };

  expect(hasPadding(view.toJSON() as never)).toBe(true);
});
