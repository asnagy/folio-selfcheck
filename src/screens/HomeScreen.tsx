import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { IconButton, Text } from 'react-native-paper';

import { BigButton } from '@/components/BigButton';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { useSettings } from '@/config/SettingsContext';
import type { RootStackParamList } from '@/navigation/types';
import { palette, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/**
 * The attract screen.
 *
 * Checking out is the reason the tablet exists, so it gets a hero button and
 * everything else is secondary. The settings affordance is a small, unlabelled
 * corner icon guarded by a PIN — visible enough for staff, uninviting to a
 * patron looking for the next step.
 */
export function HomeScreen({ navigation }: Props) {
  const { settings, configured, authLost } = useSettings();

  return (
    <Screen
      title={settings.stationName}
      subtitle="Borrow items from the library without waiting in line"
      footer={
        <View style={styles.footer}>
          <Text variant="bodyMedium" style={styles.footerHint}>
            Need help? A staff member is happy to assist.
          </Text>
          <IconButton
            icon="cog-outline"
            size={34}
            onPress={() => navigation.navigate('AdminPin')}
            accessibilityLabel="Staff settings"
            style={styles.settingsButton}
          />
        </View>
      }
    >
      {authLost ? (
        <Notice
          tone="error"
          message="This station has lost its connection to the library system."
          detail="A staff member needs to sign in again from Settings."
        />
      ) : null}

      {!configured ? (
        <Notice
          tone="warning"
          message="This station is not set up yet."
          detail="A staff member can finish setup from the settings icon below."
        />
      ) : null}

      <BigButton
        label="Start Check Out"
        hero
        disabled={!configured}
        onPress={() => navigation.navigate('PatronSignIn', { next: 'Checkout' })}
        style={styles.hero}
      />

      <Text variant="titleLarge" style={styles.sectionHeading}>
        My account
      </Text>

      <View style={styles.row}>
        <BigButton
          label="View My Account"
          variant="outlined"
          disabled={!configured}
          onPress={() => navigation.navigate('PatronSignIn', { next: 'Account' })}
          style={styles.rowItem}
        />
        {settings.allowSelfRegistration ? (
          <BigButton
            label="Get a Library Card"
            variant="outlined"
            disabled={!configured}
            onPress={() => navigation.navigate('Register')}
            style={styles.rowItem}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.md },
  sectionHeading: { marginTop: spacing.lg, color: palette.text },
  row: { flexDirection: 'row', gap: spacing.md },
  rowItem: { flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerHint: { color: palette.textMuted },
  settingsButton: { margin: 0 },
});
