import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import * as ScreenOrientation from 'expo-screen-orientation';
import { activateKeepAwakeAsync } from 'expo-keep-awake';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SettingsProvider, useSettings } from '@/config/SettingsContext';
import { RootNavigator } from '@/navigation/RootNavigator';
import { SessionProvider } from '@/session/SessionContext';
import { palette, theme } from '@/theme';

const ORIENTATION_LOCKS = {
  landscape: ScreenOrientation.OrientationLock.LANDSCAPE,
  portrait: ScreenOrientation.OrientationLock.PORTRAIT_UP,
  auto: ScreenOrientation.OrientationLock.DEFAULT,
} as const;

/**
 * Applies the staff-configured orientation.
 *
 * A wall-mounted kiosk usually wants one orientation pinned so a patron cannot
 * rotate the screen; a tablet people pick up is better left to follow the
 * device. Both are best-effort: browsers reject an orientation lock outside
 * fullscreen, which is not a reason to fail to start.
 */
function OrientationLock() {
  const { settings, ready } = useSettings();

  useEffect(() => {
    if (!ready) return;
    void ScreenOrientation.lockAsync(ORIENTATION_LOCKS[settings.orientation]).catch(
      () => undefined,
    );
  }, [ready, settings.orientation]);

  return null;
}

/** The screen must never sleep while the kiosk is in service. */
export default function App() {
  useEffect(() => {
    void activateKeepAwakeAsync().catch(() => undefined);
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <SettingsProvider>
            <SessionProvider>
              <View style={styles.root}>
                <StatusBar hidden />
                <OrientationLock />
                <RootNavigator />
              </View>
            </SessionProvider>
          </SettingsProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
});
