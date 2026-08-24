import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HelperText, Text, TextInput } from 'react-native-paper';

import { BigButton } from '@/components/BigButton';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { useSettings } from '@/config/SettingsContext';
import { registerPatron } from '@/folio/api';
import { FolioError } from '@/folio/errors';
import type { FolioUser } from '@/folio/types';
import type { RootStackParamList } from '@/navigation/types';
import { palette, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

interface FieldSpec {
  key: FieldKey;
  label: string;
  required: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words';
}

type FieldKey = 'firstName' | 'lastName' | 'preferredFirstName' | 'email' | 'phone';

const FIELDS: FieldSpec[] = [
  { key: 'firstName', label: 'First name', required: true, autoCapitalize: 'words' },
  { key: 'lastName', label: 'Last name', required: true, autoCapitalize: 'words' },
  { key: 'preferredFirstName', label: 'Preferred name (optional)', required: false, autoCapitalize: 'words' },
  { key: 'email', label: 'Email address', required: true, keyboardType: 'email-address', autoCapitalize: 'none' },
  { key: 'phone', label: 'Phone (optional)', required: false, keyboardType: 'phone-pad' },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormState = Record<FieldKey, string>;

const EMPTY_FORM: FormState = {
  firstName: '',
  lastName: '',
  preferredFirstName: '',
  email: '',
  phone: '',
};

/**
 * Self-registration for a temporary library card.
 *
 * The prototype's version produced accounts that could not borrow — inactive,
 * no patron group, no barcode. Here the card is usable immediately, and the
 * assigned barcode is shown large enough to write down, since the patron has no
 * physical card yet.
 */
export function RegisterScreen({ navigation }: Props) {
  const { settings, client } = useSettings();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [created, setCreated] = useState<FolioUser | undefined>();

  // Guard the route directly: a disabled feature must not be reachable by a
  // stale navigation action or a deep link.
  useEffect(() => {
    if (!settings.allowSelfRegistration) navigation.replace('Home');
  }, [settings.allowSelfRegistration, navigation]);

  const errors = useMemo(() => {
    const found: Partial<Record<FieldKey, string>> = {};
    for (const field of FIELDS) {
      const value = form[field.key].trim();
      if (field.required && value.length === 0) found[field.key] = 'This is required.';
    }
    if (form.email.trim() && !EMAIL_PATTERN.test(form.email.trim())) {
      found.email = 'Enter a valid email address.';
    }
    return found;
  }, [form]);

  const valid = Object.keys(errors).length === 0;

  const submit = useCallback(async () => {
    if (!client || !valid || busy) return;
    if (!settings.selfRegistrationGroupId) {
      setError('Self-registration is not fully configured. Please see a staff member.');
      return;
    }

    setBusy(true);
    setError(undefined);

    try {
      setCreated(
        await registerPatron(client, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          preferredFirstName: form.preferredFirstName.trim() || undefined,
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          patronGroupId: settings.selfRegistrationGroupId,
          expiryDays: settings.selfRegistrationExpiryDays,
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof FolioError
          ? cause.patronMessage
          : 'We could not create your card. Please see a staff member.',
      );
    } finally {
      setBusy(false);
    }
  }, [client, valid, busy, settings, form]);

  if (created) {
    return (
      <Screen
        title="Your library card is ready"
        subtitle="Write this number down — you will need it to borrow items."
        footer={<BigButton label="Done" hero onPress={() => navigation.replace('Home')} />}
      >
        <View style={styles.barcodeCard}>
          <Text variant="bodyLarge" style={styles.barcodeCaption}>
            Your card number
          </Text>
          <Text
            variant="displayLarge"
            style={styles.barcodeValue}
            accessibilityLabel={`Your card number is ${created.barcode?.split('').join(' ')}`}
            selectable
          >
            {created.barcode}
          </Text>
        </View>
        <Notice
          tone="info"
          message="Visit the service desk to collect a printed card."
          detail="Bring photo identification. Your temporary card works right away."
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Get a library card"
      subtitle="Fill in your details to create a temporary card"
      footer={
        <View style={styles.footerRow}>
          <BigButton
            label={busy ? 'Creating…' : 'Create my card'}
            disabled={!valid || busy}
            onPress={() => void submit()}
            style={styles.footerItem}
          />
          <BigButton
            label="Cancel"
            tone="neutral"
            variant="outlined"
            onPress={() => navigation.replace('Home')}
            style={styles.footerItem}
          />
        </View>
      }
    >
      {error ? <Notice tone="error" message={error} /> : null}

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
        {FIELDS.map((field) => {
          const message = touched[field.key] ? errors[field.key] : undefined;
          return (
            <View key={field.key} style={styles.field}>
              <TextInput
                mode="outlined"
                label={field.label}
                value={form[field.key]}
                onChangeText={(value) => setForm((current) => ({ ...current, [field.key]: value }))}
                onBlur={() => setTouched((current) => ({ ...current, [field.key]: true }))}
                keyboardType={field.keyboardType ?? 'default'}
                autoCapitalize={field.autoCapitalize ?? 'none'}
                autoCorrect={false}
                error={Boolean(message)}
                style={styles.input}
                contentStyle={styles.inputContent}
                accessibilityLabel={field.label}
              />
              {message ? <HelperText type="error">{message}</HelperText> : null}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm, paddingBottom: spacing.lg },
  field: { width: '100%' },
  input: { fontSize: 22 },
  inputContent: { fontSize: 22, paddingVertical: spacing.md },
  footerRow: { flexDirection: 'row', gap: spacing.md },
  footerItem: { flex: 1 },
  barcodeCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: 16,
    backgroundColor: palette.successContainer,
    gap: spacing.sm,
  },
  barcodeCaption: { color: palette.textMuted },
  barcodeValue: { letterSpacing: 4, color: palette.text, fontWeight: '700' },
});
