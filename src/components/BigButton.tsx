import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, type ButtonProps } from 'react-native-paper';
import type { StyleProp, ViewStyle } from 'react-native';

import { TOUCH_TARGET, spacing } from '@/theme';

type Tone = 'primary' | 'neutral' | 'danger' | 'success';

interface BigButtonProps extends Omit<ButtonProps, 'children' | 'mode' | 'theme' | 'style'> {
  style?: StyleProp<ViewStyle>;
  label: string;
  tone?: Tone;
  variant?: 'filled' | 'outlined';
  /** Doubles the height for the one primary action on a screen. */
  hero?: boolean;
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
  style,
  ...rest
}: BigButtonProps) {
  const color = TONE_COLORS[tone];
  const height = hero ? TOUCH_TARGET * 1.6 : TOUCH_TARGET;

  return (
    <View style={[styles.wrapper, style]}>
      <Button
        {...rest}
        mode={variant === 'filled' ? 'contained' : 'outlined'}
        buttonColor={variant === 'filled' ? color : undefined}
        textColor={variant === 'filled' ? '#FFFFFF' : color}
        contentStyle={[styles.content, { height }]}
        labelStyle={hero ? styles.heroLabel : styles.label}
        style={[styles.button, variant === 'outlined' && { borderColor: color, borderWidth: 2 }]}
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
  label: { fontSize: 22, fontWeight: '600', lineHeight: 28 },
  heroLabel: { fontSize: 30, fontWeight: '700', lineHeight: 38 },
});
