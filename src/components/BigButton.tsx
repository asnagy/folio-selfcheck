import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, type ButtonProps } from 'react-native-paper';
import type { StyleProp, ViewStyle } from 'react-native';

import { TOUCH_TARGET, kiosk, spacing } from '@/theme';

type Tone = 'primary' | 'neutral' | 'danger' | 'success';

interface BigButtonProps extends Omit<ButtonProps, 'children' | 'mode' | 'theme' | 'style'> {
  style?: StyleProp<ViewStyle>;
  label: string;
  tone?: Tone;
  variant?: 'filled' | 'outlined';
  /** Doubles the height for the one primary action on a screen. */
  hero?: boolean;
  /**
   * The home screen's primary action, which the redesign fixes at 132pt with a
   * 38pt label. Kept distinct from `hero` so the summary and error screens that
   * already use `hero` are untouched by this pass.
   */
  display?: boolean;
}

const TONE_COLORS: Record<Tone, string> = {
  primary: '#1B5E9C',
  neutral: '#4A5A6A',
  danger: '#A32020',
  success: '#1B6B3A',
};

/**
 * The kiosk's only button. Enforcing the touch target here rather than at each
 * call site is what keeps the interface usable for someone with a tremor or
 * long nails, no matter which screen added the button.
 */
export function BigButton({
  label,
  tone = 'primary',
  variant = 'filled',
  hero = false,
  display = false,
  style,
  ...rest
}: BigButtonProps) {
  const color = TONE_COLORS[tone];
  const height = display ? kiosk.primaryHeight : hero ? TOUCH_TARGET * 1.6 : TOUCH_TARGET;
  const labelStyle = display ? styles.displayLabel : hero ? styles.heroLabel : styles.label;

  return (
    <View style={[styles.wrapper, style]}>
      <Button
        {...rest}
        mode={variant === 'filled' ? 'contained' : 'outlined'}
        buttonColor={variant === 'filled' ? color : undefined}
        textColor={variant === 'filled' ? '#FFFFFF' : color}
        contentStyle={[styles.content, { height }]}
        labelStyle={labelStyle}
        style={[
          styles.button,
          display && styles.displayButton,
          variant === 'outlined' && { borderColor: color, borderWidth: 2 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {label}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  button: { borderRadius: 12 },
  content: { paddingHorizontal: spacing.lg },
  /**
   * `marginHorizontal: 0` overrides Paper's own 24pt label margin. Without it
   * that margin stacks on top of the padding in `content`, costing 96pt of
   * horizontal space and truncating short labels on narrow buttons.
   */
  label: { fontSize: 22, fontWeight: '600', lineHeight: 28, marginHorizontal: 0 },
  heroLabel: { fontSize: 30, fontWeight: '700', lineHeight: 38, marginHorizontal: 0 },
  displayLabel: {
    fontSize: 38,
    fontWeight: '700',
    lineHeight: 46,
    letterSpacing: -0.38,
    marginHorizontal: 0,
  },
  displayButton: { borderRadius: kiosk.radiusLarge, ...kiosk.primaryShadow },
});
