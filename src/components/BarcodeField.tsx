import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TextInput } from 'react-native-paper';

import { BigButton } from './BigButton';
import { spacing } from '@/theme';

/**
 * Manual barcode entry, and the landing point for hardware wedge scanners.
 *
 * Libraries that already own USB or Bluetooth scanners get them for free: a
 * wedge types into the focused field and sends Enter, which `onSubmitEditing`
 * treats exactly like a camera read. The field re-focuses after each submit so
 * a patron can scan a stack of items without touching the screen.
 */

interface BarcodeFieldProps {
  label: string;
  onSubmit: (barcode: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * To clear and re-focus this field after a scan, remount it with a changing
 * `key` rather than pushing a reset signal in. Remounting resets the value and
 * re-runs `autoFocus` in one step, with no state to synchronise.
 */
export function BarcodeField({ label, onSubmit, disabled = false, autoFocus = false }: BarcodeFieldProps) {
  const [value, setValue] = useState('');

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue('');
  }, [value, disabled, onSubmit]);

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        label={label}
        value={value}
        onChangeText={setValue}
        onSubmitEditing={submit}
        disabled={disabled}
        autoFocus={autoFocus}
        autoCapitalize="characters"
        autoCorrect={false}
        spellCheck={false}
        // "done" rather than "next" so a wedge scanner's Enter submits here.
        returnKeyType="done"
        blurOnSubmit={false}
        style={styles.input}
        contentStyle={styles.inputContent}
        accessibilityLabel={label}
      />
      <BigButton
        label="Enter"
        onPress={submit}
        disabled={disabled || value.trim().length === 0}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  input: { flex: 1, fontSize: 24 },
  inputContent: { fontSize: 24, paddingVertical: spacing.md },
  button: { width: 160 },
});
