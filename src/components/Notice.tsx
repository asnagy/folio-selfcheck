import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { palette, spacing } from '@/theme';

/**
 * Inline status message.
 *
 * The prototype replaced the whole screen on any error, which ended a patron's
 * session over a single unloanable item. Errors belong beside the thing that
 * failed, with the rest of the flow left intact.
 */

export type NoticeTone = 'info' | 'success' | 'warning' | 'error';

const TONES: Record<NoticeTone, { bg: string; fg: string; icon: string }> = {
  info: { bg: palette.primaryContainer, fg: palette.text, icon: 'ℹ' },
  success: { bg: palette.successContainer, fg: palette.success, icon: '✓' },
  warning: { bg: palette.warningContainer, fg: palette.warning, icon: '!' },
  error: { bg: palette.dangerContainer, fg: palette.danger, icon: '✕' },
};

interface NoticeProps {
  tone: NoticeTone;
  message: string;
  detail?: string;
}

export function Notice({ tone, message, detail }: NoticeProps) {
  const colors = TONES[tone];

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bg }]}
      accessibilityRole="alert"
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
    >
      <Text style={[styles.icon, { color: colors.fg }]} accessibilityElementsHidden>
        {colors.icon}
      </Text>
      <View style={styles.text}>
        <Text variant="titleMedium" style={{ color: colors.fg }}>
          {message}
        </Text>
        {detail ? (
          <Text variant="bodyMedium" style={styles.detail}>
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
  },
  icon: { fontSize: 26, fontWeight: '700', lineHeight: 30 },
  text: { flex: 1, gap: spacing.xs },
  detail: { color: palette.textMuted },
});
