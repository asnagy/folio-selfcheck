import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Text } from 'react-native-paper';

import { SWIPE_MAX_GAP_MS } from '@/utils/magstripe';
import { kiosk, palette, spacing } from '@/theme';

/**
 * Capture surface for a mag-stripe reader.
 *
 * The reader is a keyboard: a swipe types the encoded track very fast and ends
 * with Enter. This keeps a focused, visually hidden field to receive that burst
 * and shows the patron a target instead — there is nothing for them to type, so
 * exposing a text box would only invite the on-screen keyboard.
 *
 * Focus is reclaimed whenever the field loses it, because a kiosk left idle can
 * blur the field and would then silently ignore every swipe.
 */

interface SwipeReaderProps {
  onSwipe: (raw: string) => void;
  disabled?: boolean;
}

export function SwipeReader({ onSwipe, disabled = false }: SwipeReaderProps) {
  const inputRef = useRef<TextInput>(null);
  const [buffer, setBuffer] = useState('');
  const lastKeyAt = useRef(0);

  const refocus = useCallback(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  useEffect(() => {
    refocus();
  }, [refocus]);

  const handleChange = useCallback((text: string) => {
    const now = Date.now();
    // A human typing pauses between characters far longer than a reader does;
    // a slow keystroke therefore starts a fresh capture rather than extending
    // whatever partial value was already there.
    const continuing = now - lastKeyAt.current < SWIPE_MAX_GAP_MS;
    lastKeyAt.current = now;
    setBuffer(continuing || text.length <= 1 ? text : text.slice(-1));
  }, []);

  const handleSubmit = useCallback(() => {
    const captured = buffer;
    setBuffer('');
    if (captured) onSwipe(captured);
    refocus();
  }, [buffer, onSwipe, refocus]);

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        value={buffer}
        onChangeText={handleChange}
        onSubmitEditing={handleSubmit}
        onBlur={refocus}
        editable={!disabled}
        autoFocus
        blurOnSubmit={false}
        showSoftInputOnFocus={false}
        caretHidden
        style={styles.hidden}
        accessibilityLabel="Card swipe reader"
      />

      <View style={styles.target} accessibilityRole="image" accessibilityLabel="Swipe your card">
        <View style={styles.card}>
          <View style={styles.stripe} />
        </View>
        <Text style={styles.prompt}>Swipe your card through the reader</Text>
        <Text style={styles.hint}>
          {disabled ? 'Checking your account…' : 'The stripe should face down and to the left.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 220, marginBottom: spacing.md },
  /**
   * Off-screen rather than `display: none`: a field that is not laid out cannot
   * hold focus, and without focus no swipe is ever received.
   */
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0, left: -9999 },
  target: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: kiosk.radiusLarge,
    backgroundColor: palette.primaryContainer,
    padding: spacing.lg,
  },
  card: {
    width: 168,
    height: 108,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: palette.primary,
    justifyContent: 'flex-end',
    paddingBottom: 18,
    alignItems: 'center',
  },
  stripe: { width: 118, height: 14, borderRadius: 7, backgroundColor: palette.primary },
  prompt: { fontSize: 24, fontWeight: '600', color: palette.navy, textAlign: 'center' },
  hint: { fontSize: 18, color: palette.textMuted, textAlign: 'center' },
});
