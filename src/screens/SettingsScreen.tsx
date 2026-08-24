import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Divider, HelperText, SegmentedButtons, Switch, Text, TextInput } from 'react-native-paper';

import { BigButton } from '@/components/BigButton';
import { Notice, type NoticeTone } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { useSettings } from '@/config/SettingsContext';
import {
  hasAdminPin,
  resetStation,
  setAdminPin,
  type KioskSettings,
} from '@/config/settings';
import { login } from '@/folio/auth';
import { FolioClient } from '@/folio/client';
import { fetchPatronGroups, verifyServicePoint } from '@/folio/api';
import { FolioError } from '@/folio/errors';
import type { AuthTokens, PatronGroup } from '@/folio/types';
import type { RootStackParamList } from '@/navigation/types';
import { palette, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

/**
 * Staff configuration.
 *
 * Connecting is a verification step, not just a save: the credentials are used
 * to obtain tokens, the service point is confirmed to exist, and patron groups
 * are fetched for the self-registration picker. Staff find out the station is
 * misconfigured here, rather than a patron discovering it at 9am on Saturday.
 *
 * The service-account password lives in component state only. It is exchanged
 * for tokens and never written to the keystore.
 */
export function SettingsScreen({ navigation }: Props) {
  const { settings, ready } = useSettings();

  // Wait for the keystore read before seeding the form. Rendering the form
  // early would capture empty defaults and then need syncing back.
  if (!ready) return <Screen title="Station settings">{null}</Screen>;

  return <SettingsForm navigation={navigation} initial={settings} />;
}

function SettingsForm({
  navigation,
  initial,
}: {
  navigation: Props['navigation'];
  initial: KioskSettings;
}) {
  const { adoptSession, update, signOut, configured } = useSettings();

  const [draft, setDraft] = useState<KioskSettings>(initial);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinExists, setPinExists] = useState(true);
  const [groups, setGroups] = useState<PatronGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: NoticeTone; message: string; detail?: string } | undefined>();

  useEffect(() => {
    void hasAdminPin().then(setPinExists);
  }, []);

  const patch = useCallback(<K extends keyof KioskSettings>(key: K, value: KioskSettings[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  const connect = useCallback(async () => {
    setBusy(true);
    setStatus(undefined);

    const connection = { baseUrl: draft.baseUrl.trim().replace(/\/+$/, ''), tenant: draft.tenant.trim() };

    try {
      const tokens: AuthTokens = await login(connection, username.trim(), password);
      const probe = new FolioClient({ connection, tokens });

      let servicePointName: string | undefined;
      if (draft.servicePointId.trim()) {
        servicePointName = await verifyServicePoint(probe, draft.servicePointId.trim());
      }

      const fetchedGroups = await fetchPatronGroups(probe).catch(() => [] as PatronGroup[]);
      setGroups(fetchedGroups);

      await adoptSession(
        {
          ...draft,
          baseUrl: connection.baseUrl,
          tenant: connection.tenant,
          servicePointId: draft.servicePointId.trim(),
          servicePointName,
        },
        tokens,
      );

      // Discard the password the moment it is no longer needed.
      setPassword('');
      setStatus({
        tone: 'success',
        message: 'Connected to FOLIO.',
        detail: servicePointName
          ? `Service point: ${servicePointName}. Sign-in mode: ${tokens.mode === 'expiry' ? 'refresh tokens' : 'legacy token'}.`
          : 'Add a service point ID before patrons can check out.',
      });
    } catch (cause) {
      setStatus({
        tone: 'error',
        message: cause instanceof FolioError ? cause.patronMessage : 'Could not connect.',
        detail: cause instanceof FolioError ? cause.detail : String(cause),
      });
    } finally {
      setBusy(false);
    }
  }, [draft, username, password, adoptSession]);

  const saveOptions = useCallback(async () => {
    setBusy(true);
    try {
      await update(draft);
      if (newPin.length >= 4) {
        await setAdminPin(newPin);
        setNewPin('');
        setPinExists(true);
      }
      setStatus({ tone: 'success', message: 'Settings saved.' });
    } finally {
      setBusy(false);
    }
  }, [draft, newPin, update]);

  const reset = useCallback(async () => {
    await resetStation();
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }, [signOut, navigation]);

  return (
    <Screen
      title="Station settings"
      subtitle={configured ? 'This station is connected to FOLIO' : 'Connect this station to FOLIO to begin'}
      scroll={false}
      footer={
        <View style={styles.footerRow}>
          <BigButton
            label={busy ? 'Working…' : 'Save settings'}
            disabled={busy}
            onPress={() => void saveOptions()}
            style={styles.footerItem}
          />
          <BigButton
            label="Close"
            tone="neutral"
            variant="outlined"
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
            style={styles.footerItem}
          />
        </View>
      }
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        {status ? <Notice tone={status.tone} message={status.message} detail={status.detail} /> : null}

        <Section title="FOLIO connection">
          <Field
            label="Gateway URL (Kong on Eureka, Okapi on classic)"
            value={draft.baseUrl}
            onChange={(value) => patch('baseUrl', value)}
            placeholder="https://folio-gateway.example.org"
            keyboardType="url"
          />
          <Field label="Tenant" value={draft.tenant} onChange={(value) => patch('tenant', value)} />
          <Field
            label="Service point ID"
            value={draft.servicePointId}
            onChange={(value) => patch('servicePointId', value)}
            help={draft.servicePointName ? `Verified: ${draft.servicePointName}` : 'The UUID from the service point URL in FOLIO settings.'}
          />

          <Divider style={styles.divider} />

          <Field
            label="Service account username"
            value={username}
            onChange={setUsername}
            autoCapitalize="none"
          />
          <Field
            label="Service account password"
            value={password}
            onChange={setPassword}
            secure={!showPassword}
            onToggleSecure={() => setShowPassword((shown) => !shown)}
            help="Used once to obtain tokens. It is never stored on this device."
          />

          <BigButton
            label={busy ? 'Connecting…' : 'Connect and verify'}
            disabled={busy || !draft.baseUrl || !draft.tenant || !username || !password}
            onPress={() => void connect()}
          />
        </Section>

        <Section title="Patron experience">
          <Toggle
            label="Require a PIN after scanning a card"
            value={draft.requirePatronPin}
            onChange={(value) => patch('requirePatronPin', value)}
          />
          <Toggle
            label="Allow renewals"
            value={draft.allowRenewals}
            onChange={(value) => patch('allowRenewals', value)}
          />
          <Toggle
            label="Show fees and fines"
            value={draft.showFeesAndFines}
            onChange={(value) => patch('showFeesAndFines', value)}
          />
          <Toggle
            label="Allow self-registration for new cards"
            value={draft.allowSelfRegistration}
            onChange={(value) => patch('allowSelfRegistration', value)}
          />

          {draft.allowSelfRegistration ? (
            <View style={styles.subsection}>
              <Text variant="titleMedium">Patron group for new cards</Text>
              {groups.length > 0 ? (
                <SegmentedButtons
                  value={draft.selfRegistrationGroupId ?? ''}
                  onValueChange={(value) => patch('selfRegistrationGroupId', value)}
                  buttons={groups.slice(0, 4).map((group) => ({ value: group.id, label: group.group }))}
                />
              ) : (
                <HelperText type="info">Connect to FOLIO to load patron groups.</HelperText>
              )}
              <Field
                label="Card expires after (days)"
                value={String(draft.selfRegistrationExpiryDays)}
                onChange={(value) => patch('selfRegistrationExpiryDays', clampInt(value, 1, 3650, 365))}
                keyboardType="number-pad"
              />
            </View>
          ) : null}

          <Field
            label="Block borrowing at owed amount (0 to disable)"
            value={String(draft.feeBlockThreshold)}
            onChange={(value) => patch('feeBlockThreshold', clampInt(value, 0, 10_000, 0))}
            keyboardType="decimal-pad"
          />
        </Section>

        <Section title="Station">
          <Field
            label="Station name"
            value={draft.stationName}
            onChange={(value) => patch('stationName', value)}
          />
          <Field
            label="Session timeout (seconds)"
            value={String(draft.idleTimeoutSeconds)}
            onChange={(value) => patch('idleTimeoutSeconds', clampInt(value, 20, 600, 90))}
            keyboardType="number-pad"
            help="How long a patron can be inactive before their session clears."
          />
          <Field
            label="Warning before timeout (seconds)"
            value={String(draft.idleWarningSeconds)}
            onChange={(value) => patch('idleWarningSeconds', clampInt(value, 5, 120, 20))}
            keyboardType="number-pad"
          />
          <Field
            label={pinExists ? 'Change staff PIN (4+ digits)' : 'Set a staff PIN (4+ digits)'}
            value={newPin}
            onChange={setNewPin}
            secure
            keyboardType="number-pad"
            help={pinExists ? undefined : 'Until a PIN is set, anyone can open these settings.'}
          />
        </Section>

        <Section title="Danger zone">
          <BigButton
            label="Reset this station"
            tone="danger"
            variant="outlined"
            onPress={() => void reset()}
          />
          <HelperText type="info">
            Erases the tenant configuration, stored tokens and staff PIN from this device.
          </HelperText>
        </Section>
      </ScrollView>
    </Screen>
  );
}

function clampInt(raw: string, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(raw.replace(/[^0-9]/g, ''), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="titleLarge" accessibilityRole="header">
        {title}
      </Text>
      <Divider style={styles.divider} />
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  help,
  secure = false,
  onToggleSecure,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'none',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  secure?: boolean;
  onToggleSecure?: () => void;
  placeholder?: string;
  keyboardType?: 'default' | 'url' | 'number-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'words';
}) {
  return (
    <View style={styles.field}>
      <TextInput
        mode="outlined"
        label={label}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={styles.input}
        accessibilityLabel={label}
        right={
          onToggleSecure ? (
            <TextInput.Icon
              icon={secure ? 'eye' : 'eye-off'}
              onPress={onToggleSecure}
              accessibilityLabel={secure ? 'Show password' : 'Hide password'}
            />
          ) : undefined
        }
      />
      {help ? <HelperText type="info">{help}</HelperText> : null}
    </View>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      <Text variant="bodyLarge" style={styles.toggleLabel}>
        {label}
      </Text>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingBottom: spacing.xxl },
  section: { gap: spacing.sm },
  subsection: { gap: spacing.sm, paddingLeft: spacing.md, paddingVertical: spacing.sm },
  divider: { marginVertical: spacing.xs },
  field: { width: '100%' },
  input: { fontSize: 20 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    minHeight: 64,
  },
  toggleLabel: { flex: 1, color: palette.text, paddingRight: spacing.md },
  footerRow: { flexDirection: 'row', gap: spacing.md },
  footerItem: { flex: 1 },
});
