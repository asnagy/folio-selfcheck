import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { BigButton } from './BigButton';
import { palette, spacing } from '@/theme';

/**
 * Last line of defence.
 *
 * An unattended tablet that renders a blank screen after a crash is out of
 * service until someone notices. Catching the crash lets a patron recover the
 * kiosk themselves, and shows staff enough to report what happened.
 */
interface State {
  error?: Error;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  override state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surfaces in `npx expo start` and in device logs via adb/Console.
    console.error('Kiosk crashed', error, info.componentStack);
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.container}>
        <Text variant="headlineLarge" style={styles.title} accessibilityRole="header">
          This station needs a moment
        </Text>
        <Text variant="bodyLarge" style={styles.body}>
          Something went wrong. Tap below to start again, or ask a staff member for help.
        </Text>
        <BigButton
          label="Start again"
          hero
          onPress={() => this.setState({ error: undefined })}
          style={styles.button}
        />
        <Text variant="bodyMedium" style={styles.detail} selectable>
          {error.message}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
    backgroundColor: palette.background,
  },
  title: { color: palette.text, textAlign: 'center' },
  body: { color: palette.textMuted, textAlign: 'center', maxWidth: 620 },
  button: { maxWidth: 460 },
  detail: { color: palette.textMuted, fontSize: 14, textAlign: 'center' },
});
