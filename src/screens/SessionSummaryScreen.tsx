import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Divider, List, Text } from 'react-native-paper';

import { BigButton } from '@/components/BigButton';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { useSettings } from '@/config/SettingsContext';
import { endPatronSession } from '@/folio/api';
import type { RootStackParamList } from '@/navigation/types';
import { useSession, type CheckoutRecord } from '@/session/SessionContext';
import { formatDueDate, greetingName } from '@/utils/format';
import { palette, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionSummary'>;

/** Seconds the receipt stays up before the kiosk returns to the attract screen. */
const AUTO_RETURN_SECONDS = 25;

/**
 * The on-screen receipt.
 *
 * Closing the patron action session is what makes FOLIO send the checkout
 * notice, so the email receipt the library already has configured is triggered
 * from here. It is fire-and-forget: a notice that fails to send must not stop
 * the patron from walking away with items they legitimately borrowed.
 */
export function SessionSummaryScreen({ navigation }: Props) {
  const { client } = useSettings();
  const { patron, checkouts, endSession } = useSession();

  const [countdown, setCountdown] = useState(AUTO_RETURN_SECONDS);
  const [noticeFailed, setNoticeFailed] = useState(false);
  /**
   * The receipt is snapshotted from the session on the first render, because the
   * effect below immediately tears the session down. Seeding state lazily keeps
   * the summary readable after the patron identity is gone.
   */
  const [summary] = useState<{ name: string; items: CheckoutRecord[] } | undefined>(() =>
    patron ? { name: greetingName(patron.user.personal), items: checkouts } : undefined,
  );

  useEffect(() => {
    const userId = patron?.user.id;
    const borrowed = summary?.items.length ?? 0;

    // Closing the action session is what makes FOLIO send the checkout notice.
    if (client && userId && borrowed > 0) {
      void endPatronSession(client, userId, 'Check-out').catch(() => setNoticeFailed(true));
    }

    // The patron identity is not needed past this point.
    endSession();
    // Deliberately mount-only: the session is gone after this runs, so re-running
    // would close an action session that no longer exists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((remaining) => {
        if (remaining <= 1) {
          clearInterval(timer);
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigation]);

  const items = summary?.items ?? [];

  return (
    <Screen
      title={items.length > 0 ? 'You are all set' : 'Nothing was borrowed'}
      subtitle={
        summary?.name && items.length > 0
          ? `Thanks, ${summary.name}. Please take your items.`
          : undefined
      }
      footer={
        <BigButton
          label={`Done (${countdown})`}
          hero
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
        />
      }
    >
      {noticeFailed ? (
        <Notice
          tone="warning"
          message="We could not send your email receipt."
          detail="Your items are still checked out. Due dates are shown below."
        />
      ) : null}

      {items.length > 0 ? (
        <>
          <Text variant="titleLarge" accessibilityRole="header">
            {items.length} item{items.length === 1 ? '' : 's'} checked out
          </Text>
          <Divider style={styles.divider} />
          {items.map((record) => (
            <List.Item
              key={record.loan.id ?? record.barcode}
              title={record.title}
              description={`Due ${formatDueDate(record.dueDate)}`}
              titleNumberOfLines={3}
              titleStyle={styles.itemTitle}
              descriptionStyle={styles.itemDescription}
              left={(props) => <List.Icon {...props} icon="check-circle" color={palette.success} />}
            />
          ))}
          <View style={styles.reminder}>
            <Text variant="bodyLarge" style={styles.reminderText}>
              A receipt has been emailed to the address on your account.
            </Text>
          </View>
        </>
      ) : (
        <Text variant="bodyLarge">No items were checked out during this visit.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: { marginVertical: spacing.sm },
  itemTitle: { fontSize: 21, fontWeight: '600' },
  itemDescription: { fontSize: 18, color: palette.textMuted },
  reminder: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: palette.primaryContainer, borderRadius: 12 },
  reminderText: { color: palette.text },
});
