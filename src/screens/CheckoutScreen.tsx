import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Divider, List, Text } from 'react-native-paper';

import { BarcodeField } from '@/components/BarcodeField';
import { BigButton } from '@/components/BigButton';
import { CameraScanner } from '@/components/CameraScanner';
import { Notice, type NoticeTone } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { useSettings } from '@/config/SettingsContext';
import { blockText, checkOutByBarcode } from '@/folio/api';
import { FolioError } from '@/folio/errors';
import type { RootStackParamList } from '@/navigation/types';
import { useSession } from '@/session/SessionContext';
import { useLayout } from '@/utils/useLayout';
import { formatCurrency, formatDueDate, greetingName } from '@/utils/format';
import { palette, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

interface Feedback {
  tone: NoticeTone;
  message: string;
  detail?: string;
}

/**
 * Scan items and borrow them.
 *
 * The design rule here is that nothing removes the patron from the flow. A
 * failed item shows as an inline notice and the scanner stays live, because the
 * common case — one unloanable reference book in a stack of ten — should not
 * cost the patron the other nine.
 */
export function CheckoutScreen({ navigation }: Props) {
  const { settings, client } = useSettings();
  const { patron, checkouts, addCheckout, reportActivity, endSession } = useSession();
  const { isWide, scannerHeight } = useLayout();

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | undefined>();
  const [resetToken, setResetToken] = useState(0);

  // The session can expire while this screen is mounted; when it does there is
  // no patron left to check out to, so return to the attract screen.
  useEffect(() => {
    if (!patron) navigation.navigate('Home');
  }, [patron, navigation]);

  const owedBlocks =
    settings.feeBlockThreshold > 0 && (patron?.totalOwed ?? 0) >= settings.feeBlockThreshold;
  const blocked = (patron?.borrowingBlocked ?? false) || owedBlocks;

  const handleBarcode = useCallback(
    async (itemBarcode: string) => {
      if (!client || !patron || busy || blocked) return;
      reportActivity();
      setBusy(true);
      setFeedback(undefined);

      try {
        const loan = await checkOutByBarcode(client, {
          itemBarcode,
          userBarcode: patron.user.barcode ?? '',
          servicePointId: settings.servicePointId,
        });

        const title = loan.item?.title ?? 'Item';
        addCheckout({ loan, title, barcode: itemBarcode, dueDate: loan.dueDate });
        setFeedback({
          tone: 'success',
          message: `${title} is yours.`,
          detail: `Due ${formatDueDate(loan.dueDate)}`,
        });
      } catch (cause) {
        const error =
          cause instanceof FolioError
            ? cause
            : new FolioError({
                kind: 'unknown',
                patronMessage: 'That item could not be checked out.',
                detail: String(cause),
              });
        setFeedback({
          tone: error.needsStaff ? 'error' : 'warning',
          message: error.patronMessage,
          detail: error.needsStaff ? undefined : 'You can keep scanning your other items.',
        });
      } finally {
        setBusy(false);
        setResetToken((token) => token + 1);
      }
    },
    [client, patron, busy, blocked, reportActivity, settings.servicePointId, addCheckout],
  );

  const finish = useCallback(() => {
    navigation.replace('SessionSummary');
  }, [navigation]);

  if (!patron) return null;

  return (
    <Screen
      title={`Check out for ${greetingName(patron.user.personal)}`}
      subtitle={
        blocked
          ? 'This account cannot borrow right now'
          : 'Scan each item you want to borrow, one at a time'
      }
      scroll={false}
      footer={
        <View style={styles.footerRow}>
          <BigButton
            label={checkouts.length > 0 ? `Finish (${checkouts.length})` : 'Finish'}
            tone="success"
            onPress={finish}
            style={styles.footerItem}
          />
          <BigButton
            label="Cancel"
            tone="neutral"
            variant="outlined"
            onPress={() => {
              endSession();
              navigation.navigate('Home');
            }}
            style={styles.footerItem}
          />
        </View>
      }
    >
      {blocked ? (
        <Notice
          tone="error"
          message={
            patron.blocks[0]
              ? blockText(patron.blocks[0])
              : `You owe ${formatCurrency(patron.totalOwed)} and cannot borrow until it is paid.`
          }
          detail="Please see a staff member for help."
        />
      ) : null}

      {feedback ? (
        <Notice tone={feedback.tone} message={feedback.message} detail={feedback.detail} />
      ) : null}

      <View style={[styles.columns, isWide ? styles.columnsWide : styles.columnsStacked]}>
        <View style={isWide ? styles.scannerColumnWide : styles.scannerColumnStacked}>
          {!blocked ? (
            <View style={{ height: scannerHeight }}>
              <CameraScanner
                paused={busy}
                label="Item barcode"
                onScan={(barcode) => void handleBarcode(barcode)}
              />
            </View>
          ) : null}

          {busy ? (
            <View style={styles.busy} accessibilityLiveRegion="polite">
              <ActivityIndicator size="large" color={palette.primary} />
              <Text variant="titleMedium">Checking out…</Text>
            </View>
          ) : null}

          <BarcodeField
            key={resetToken}
            label="Or type the item barcode"
            disabled={busy || blocked}
            onSubmit={(barcode) => void handleBarcode(barcode)}
          />
        </View>

        <View style={styles.listColumn}>
          <Text variant="titleLarge" accessibilityRole="header">
            {checkouts.length === 0
              ? 'Nothing scanned yet'
              : `${checkouts.length} item${checkouts.length === 1 ? '' : 's'} borrowed`}
          </Text>
          <Divider style={styles.divider} />

          {/*
            The list scrolls in its own right. Without this a long checkout ran
            off the bottom of the screen in either orientation, with no way for
            the patron to see what they had already scanned.
          */}
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            accessibilityLiveRegion="polite"
          >
            {checkouts.map((record) => (
              <List.Item
                key={record.loan.id ?? record.barcode}
                title={record.title}
                description={`Due ${formatDueDate(record.dueDate)}`}
                titleNumberOfLines={2}
                titleStyle={styles.itemTitle}
                descriptionStyle={styles.itemDescription}
                left={(props) => <List.Icon {...props} icon="check-circle" color={palette.success} />}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  columns: { flex: 1, gap: spacing.lg, marginTop: spacing.md },
  columnsWide: { flexDirection: 'row' },
  columnsStacked: { flexDirection: 'column' },
  /** Side by side, the scanner shares the width evenly with the list. */
  scannerColumnWide: { flex: 1, gap: spacing.md },
  /**
   * Stacked, the scanner takes only the height it needs so the borrowed list
   * keeps the rest. `flexShrink: 0` stops a long list squeezing the viewfinder.
   */
  scannerColumnStacked: { flexShrink: 0, gap: spacing.md },
  listColumn: { flex: 1, minHeight: 120 },
  listScroll: { flex: 1 },
  listContent: { paddingBottom: spacing.md },
  divider: { marginVertical: spacing.sm },
  busy: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemTitle: { fontSize: 20, fontWeight: '600' },
  itemDescription: { fontSize: 17, color: palette.textMuted },
  footerRow: { flexDirection: 'row', gap: spacing.md },
  footerItem: { flex: 1 },
});
