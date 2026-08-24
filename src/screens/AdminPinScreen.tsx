import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text } from 'react-native-paper';

import { BigButton } from '@/components/BigButton';
import { Notice } from '@/components/Notice';
import { NumericKeypad } from '@/components/NumericKeypad';
import { Screen } from '@/components/Screen';
import { hasAdminPin, verifyAdminPin } from '@/config/settings';
import type { RootStackParamList } from '@/navigation/types';
import { palette, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminPin'>;

const MAX_ATTEMPTS = 5;
/** Lockout after repeated failures, to blunt shoulder-surfing and guessing. */
const LOCKOUT_MS = 60_000;

/**
 * Staff gate in front of Settings.
 *
 * In the prototype the settings screen — including the FOLIO service-account
 * credentials — was one tap from the home screen with nothing in the way. This
 * is that missing lock.
 */
export function AdminPinScreen({ navigation }: Props) {
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [checking, setChecking] = useState(true);

  // A station with no PIN yet is mid-first-run setup; let staff straight in so
  // they can configure the tenant and choose a PIN.
  useEffect(() => {
    void (async () => {
      if (!(await hasAdminPin())) {
        navigation.replace('Settings');
        return;
      }
      setChecking(false);
    })();
  }, [navigation]);

  // The lockout lifts on a timer rather than by re-reading the clock each
  // render, so the keypad re-enables itself without needing another touch.
  useEffect(() => {
    if (!locked) return;
    const timer = setTimeout(() => {
      setLocked(false);
      setError(undefined);
    }, LOCKOUT_MS);
    return () => clearTimeout(timer);
  }, [locked]);

  const submit = useCallback(async () => {
    if (locked) return;

    if (await verifyAdminPin(pin)) {
      setPin('');
      setAttempts(0);
      navigation.replace('Settings');
      return;
    }

    const next = attempts + 1;
    setAttempts(next);
    setPin('');

    if (next >= MAX_ATTEMPTS) {
      setLocked(true);
      setAttempts(0);
      setError('Too many incorrect attempts. Try again in a minute.');
    } else {
      setError(`Incorrect PIN. ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next === 1 ? '' : 's'} left.`);
    }
  }, [locked, pin, attempts, navigation]);

  if (checking) return <Screen title="Staff access">{null}</Screen>;

  return (
    <Screen
      title="Staff access"
      subtitle="Enter the staff PIN to open settings"
      footer={
        <BigButton
          label="Back"
          tone="neutral"
          variant="outlined"
          onPress={() => navigation.replace('Home')}
        />
      }
    >
      {error ? <Notice tone="error" message={error} /> : null}

      <View style={styles.area}>
        <Text
          variant="displayLarge"
          style={styles.dots}
          accessibilityLabel={`${pin.length} digits entered`}
        >
          {pin.length > 0 ? '•'.repeat(pin.length) : ' '}
        </Text>

        <NumericKeypad
          disabled={locked}
          onKey={(digit) => setPin((current) => (current + digit).slice(0, 12))}
          onBackspace={() => setPin((current) => current.slice(0, -1))}
          onClear={() => setPin('')}
        />

        <BigButton
          label="Unlock"
          disabled={locked || pin.length === 0}
          onPress={() => void submit()}
          style={styles.submit}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  area: { alignItems: 'center', gap: spacing.lg },
  dots: { letterSpacing: 10, minHeight: 60, color: palette.text },
  submit: { maxWidth: 420 },
});
