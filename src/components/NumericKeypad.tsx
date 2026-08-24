import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TouchableRipple } from 'react-native-paper';

import { TOUCH_TARGET, palette, spacing } from '@/theme';

/**
 * On-screen PIN pad.
 *
 * A kiosk cannot rely on the system keyboard: it covers half a landscape tablet
 * and offers no way to guarantee digits only. This pad also keeps PIN entry
 * visually distinct from barcode entry, which matters when both appear in the
 * same flow.
 */

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const;

interface NumericKeypadProps {
  onKey: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function NumericKeypad({ onKey, onBackspace, onClear, disabled = false }: NumericKeypadProps) {
  return (
    <View style={styles.grid}>
      {KEYS.map((key) => {
        const isAction = key === 'clear' || key === 'back';
        const label = key === 'clear' ? 'Clear' : key === 'back' ? '⌫' : key;
        const accessibilityLabel =
          key === 'clear' ? 'Clear entry' : key === 'back' ? 'Delete last digit' : `Digit ${key}`;

        return (
          <TouchableRipple
            key={key}
            disabled={disabled}
            onPress={() => {
              if (key === 'clear') onClear();
              else if (key === 'back') onBackspace();
              else onKey(key);
            }}
            style={[styles.key, isAction && styles.actionKey, disabled && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
          >
            <Text style={[styles.keyLabel, isAction && styles.actionLabel]}>{label}</Text>
          </TouchableRipple>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: TOUCH_TARGET * 3 + spacing.sm * 2,
    gap: spacing.sm,
  },
  key: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 2,
    borderColor: palette.outline,
  },
  actionKey: { backgroundColor: palette.primaryContainer },
  disabled: { opacity: 0.4 },
  keyLabel: { fontSize: 30, fontWeight: '600', color: palette.text },
  actionLabel: { fontSize: 20 },
});
