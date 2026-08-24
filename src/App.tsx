import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import * as ScreenOrientation from 'expo-screen-orientation';
import { activateKeepAwakeAsync } from 'expo-keep-awake';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SettingsProvider } from '@/config/SettingsContext';
import { RootNavigator } from '@/navigation/RootNavigator';
import { SessionProvider } from '@/session/SessionContext';
import { palette, theme } from '@/theme';

/**
 * Two things every kiosk needs and no phone app does: the screen must never
 * sleep, and the orientation must not follow whichever way a patron tilts the
 * tablet in its stand.
 *
 * Both are best-effort. Browsers reject an orientation lock outside fullscreen,
 * and wake lock is unavailable in some contexts; neither is a reason to fail to
 * start, so the kiosk carries on without them.
 */
export default function App() {
  useEffect(() => {
    void activateKeepAwakeAsync().catch(() => undefined);
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(
      () => undefined,
    );
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <SettingsProvider>
            <SessionProvider>
              <View style={styles.root}>
                <StatusBar hidden />
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
