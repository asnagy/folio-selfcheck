import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Text } from 'react-native-paper';

import { BarcodeField } from '@/components/BarcodeField';
import { BigButton } from '@/components/BigButton';
import { CameraScanner } from '@/components/CameraScanner';
import { Notice } from '@/components/Notice';
import { NumericKeypad } from '@/components/NumericKeypad';
import { Screen } from '@/components/Screen';
import { useSettings } from '@/config/SettingsContext';
import { findUserByBarcode, loadPatronSnapshot, verifyPatronPin } from '@/folio/api';
import { FolioError } from '@/folio/errors';
import type { PatronSnapshot } from '@/folio/types';
import type { RootStackParamList } from '@/navigation/types';
import { useSession } from '@/session/SessionContext';
import { SwipeReader } from './home/SwipeReader';
import { SIGN_IN_COPY } from './home/copy';
import { greetingName } from '@/utils/format';
import { parseSwipe } from '@/utils/magstripe';
import { palette, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PatronSignIn'>;

const PIN_LENGTH_MAX = 8;
/** Wrong PINs allowed before the kiosk sends the patron to staff. */
const MAX_PIN_ATTEMPTS = 3;

/**
 * Identify the patron, by camera or by typing.
 *
 * When the library requires a PIN, the keypad appears on this same screen once
 * the card is recognised. Keeping it here means the half-identified patron is
 * only ever held in local state, never committed to the session or pushed onto
 * the navigation stack, so abandoning the flow leaves nothing behind.
 */
export function PatronSignInScreen({ navigation, route }: Props) {
  const { next } = route.params;
  const { settings, client } = useSettings();
  const { startSession, reportActivity } = useSession();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FolioError | undefined>();
  const [pending, setPending] = useState<PatronSnapshot | undefined>();
  const [pin, setPin] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);
  const [resetToken, setResetToken] = useState(0);

  const begin = useCallback(
    (snapshot: PatronSnapshot) => {
      startSession(snapshot);
      navigation.replace(next);
    },
    [startSession, navigation, next],
  );

  const handleBarcode = useCallback(
    async (barcode: string) => {
      if (!client || busy) return;
      reportActivity();
      setBusy(true);
      setError(undefined);

      try {
        const user = await findUserByBarcode(client, barcode);
        const snapshot = await loadPatronSnapshot(client, user);

        if (settings.requirePatronPin) {
          setPending(snapshot);
          setPin('');
          setPinAttempts(0);
        } else {
          begin(snapshot);
        }
      } catch (cause) {
        setError(
          cause instanceof FolioError
            ? cause
            : new FolioError({
                kind: 'unknown',
                patronMessage: 'Something went wrong. Please try again.',
                detail: String(cause),
              }),
        );
        setResetToken((token) => token + 1);
      } finally {
        setBusy(false);
      }
    },
    [client, busy, reportActivity, settings.requirePatronPin, begin],
  );

  const submitPin = useCallback(async () => {
    if (!client || !pending || busy) return;
    reportActivity();
    setBusy(true);
    setError(undefined);

    try {
      const ok = await verifyPatronPin(client, pending.user.id, pin);
      if (ok) {
        begin(pending);
        return;
      }

      const attempts = pinAttempts + 1;
      setPinAttempts(attempts);
      setPin('');

      if (attempts >= MAX_PIN_ATTEMPTS) {
        // Drop the half-identified patron rather than letting someone keep
        // guessing at a card they found.
        setPending(undefined);
        setError(
          new FolioError({
            kind: 'auth',
            patronMessage: 'Too many incorrect PINs. Please see a staff member.',
            needsStaff: true,
          }),
        );
      } else {
        setError(
          new FolioError({
            kind: 'auth',
            patronMessage: `That PIN did not match. ${MAX_PIN_ATTEMPTS - attempts} attempt${
              MAX_PIN_ATTEMPTS - attempts === 1 ? '' : 's'
            } left.`,
          }),
        );
      }
    } catch (cause) {
      setError(
        cause instanceof FolioError
          ? cause
          : new FolioError({
              kind: 'unknown',
              patronMessage: 'We could not check that PIN. Please see a staff member.',
              needsStaff: true,
              detail: String(cause),
            }),
      );
    } finally {
      setBusy(false);
    }
  }, [client, pending, busy, reportActivity, pin, pinAttempts, begin]);

  const cancel = useCallback(() => {
    setPending(undefined);
    setPin('');
    navigation.navigate('Home');
  }, [navigation]);

  if (pending) {
    return (
      <Screen
        title={`Hello, ${greetingName(pending.user.personal)}`}
        subtitle="Enter your PIN to continue"
        footer={<BigButton label="Cancel" tone="neutral" variant="outlined" onPress={cancel} />}
      >
        {error ? <Notice tone="error" message={error.patronMessage} /> : null}

        <View style={styles.pinArea}>
          <Text
            variant="displayLarge"
            style={styles.pinDots}
            accessibilityLabel={`${pin.length} digits entered`}
          >
            {pin.length > 0 ? '•'.repeat(pin.length) : ' '}
          </Text>

          <NumericKeypad
            disabled={busy}
            onKey={(digit) => setPin((current) => (current + digit).slice(0, PIN_LENGTH_MAX))}
            onBackspace={() => setPin((current) => current.slice(0, -1))}
            onClear={() => setPin('')}
          />

          <BigButton
            label={busy ? 'Checking…' : 'Continue'}
            disabled={busy || pin.length === 0}
            onPress={() => void submitPin()}
            style={styles.pinSubmit}
          />
        </View>
      </Screen>
    );
  }

  const copy = SIGN_IN_COPY[settings.idMethod];
  // A mag-stripe reader is keyboard-wedge input, so the camera is not opened at
  // all for that method — no permission prompt, no viewfinder.
  const usesCamera = settings.idMethod !== 'magstripe';

  return (
    <Screen
      title={copy.title}
      subtitle={copy.subtitle}
      scroll={false}
      footer={<BigButton label="Cancel" tone="neutral" variant="outlined" onPress={cancel} />}
    >
      {error ? (
        <Notice
          tone="error"
          message={error.patronMessage}
          detail={error.needsStaff ? undefined : 'Line the barcode up inside the box.'}
        />
      ) : null}

      {usesCamera ? (
        <View style={styles.scannerArea}>
          <CameraScanner
            paused={busy}
            mode={settings.idMethod === 'qr' ? 'qr' : 'barcode'}
            label={settings.idMethod === 'qr' ? 'Library app QR code' : 'Library card barcode'}
            onScan={(barcode) => void handleBarcode(barcode)}
          />
        </View>
      ) : (
        <SwipeReader
          disabled={busy}
          onSwipe={(value) => {
            const barcode = parseSwipe(value);
            if (barcode) void handleBarcode(barcode);
          }}
        />
      )}

      {busy ? (
        <View style={styles.busy} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={palette.primary} />
          <Text variant="titleMedium">Looking up your account…</Text>
        </View>
      ) : null}

      <BarcodeField
        key={resetToken}
        label={copy.field}
        disabled={busy}
        onSubmit={(barcode) => void handleBarcode(barcode)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scannerArea: { flex: 1, marginBottom: spacing.md, minHeight: 220 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  pinArea: { alignItems: 'center', gap: spacing.lg },
  pinDots: { letterSpacing: 10, minHeight: 60, color: palette.text },
  pinSubmit: { maxWidth: 420 },
});
