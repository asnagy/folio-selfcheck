import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';

import { useSession } from '@/session/SessionContext';
import { palette, spacing } from '@/theme';

/**
 * Page chrome shared by every screen.
 *
 * The wrapping `View` reports touches into the session, which is how the idle
 * timer sees activity: any interaction anywhere on any screen resets the
 * countdown, so no individual screen has to remember to.
 */

interface ScreenProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Persistent footer, rendered outside the scroll area. */
  footer?: React.ReactNode;
  scroll?: boolean;
}

export function Screen({ title, subtitle, children, footer, scroll = true }: ScreenProps) {
  const { reportActivity } = useSession();
  const Body = scroll ? ScrollView : View;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View
        style={styles.root}
        onStartShouldSetResponderCapture={() => {
          reportActivity();
          // Never claim the responder; this only observes touches so that
          // buttons and inputs below still receive them.
          return false;
        }}
      >
        <View style={styles.header}>
          <Text variant="headlineLarge" style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="bodyLarge" style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <Body
          style={styles.body}
          {...(scroll
            ? { contentContainerStyle: styles.bodyContent, keyboardShouldPersistTaps: 'handled' as const }
            : {})}
        >
          {children}
        </Body>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  root: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  header: { marginBottom: spacing.lg },
  title: { color: palette.text },
  subtitle: { color: palette.textMuted, marginTop: spacing.xs },
  body: { flex: 1 },
  bodyContent: { paddingBottom: spacing.lg, gap: spacing.md },
  footer: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#DCE3EB',
    gap: spacing.md,
  },
});
