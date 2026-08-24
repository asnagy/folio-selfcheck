import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card, Divider, List, Text } from 'react-native-paper';

import { BigButton } from '@/components/BigButton';
import { Notice, type NoticeTone } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { useSettings } from '@/config/SettingsContext';
import { blockText, loadPatronSnapshot, renewByBarcode } from '@/folio/api';
import { FolioError } from '@/folio/errors';
import type { Loan } from '@/folio/types';
import type { RootStackParamList } from '@/navigation/types';
import { useSession } from '@/session/SessionContext';
import { formatCurrency, formatDueDate, fullName, isOverdue } from '@/utils/format';
import { palette, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Account'>;

/**
 * What the patron currently has out, what they owe, and one-tap renewals.
 *
 * Renewal happens in place: the row updates with its new due date and the rest
 * of the list is untouched, so a patron renewing five items sees five results
 * rather than five full-screen reloads.
 */
export function AccountScreen({ navigation }: Props) {
  const { settings, client } = useSettings();
  const { patron, updatePatron, addRenewal, reportActivity, endSession } = useSession();

  const [renewing, setRenewing] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<{ tone: NoticeTone; message: string } | undefined>();

  useEffect(() => {
    if (!patron) navigation.navigate('Home');
  }, [patron, navigation]);

  const renew = useCallback(
    async (loan: Loan) => {
      const itemBarcode = loan.item?.barcode;
      if (!client || !patron || !itemBarcode || renewing) return;
      reportActivity();
      setRenewing(loan.id);
      setFeedback(undefined);

      try {
        const renewed = await renewByBarcode(client, {
          itemBarcode,
          userBarcode: patron.user.barcode ?? '',
        });

        const title = loan.item?.title ?? 'Item';
        addRenewal({ loan: renewed, title, barcode: itemBarcode, dueDate: renewed.dueDate });
        setFeedback({
          tone: 'success',
          message: `${title} renewed. Now due ${formatDueDate(renewed.dueDate)}.`,
        });

        // Re-read the account so loan counts, due dates and any newly triggered
        // block all reflect what FOLIO now believes.
        updatePatron(await loadPatronSnapshot(client, patron.user));
      } catch (cause) {
        const error =
          cause instanceof FolioError
            ? cause
            : new FolioError({
                kind: 'unknown',
                patronMessage: 'That item could not be renewed.',
                detail: String(cause),
              });
        setFeedback({ tone: error.needsStaff ? 'error' : 'warning', message: error.patronMessage });
      } finally {
        setRenewing(undefined);
      }
    },
    [client, patron, renewing, reportActivity, addRenewal, updatePatron],
  );

  if (!patron) return null;

  const owed = patron.totalOwed;

  return (
    <Screen
      title="My account"
      subtitle={fullName(patron.user.personal)}
      footer={
        <BigButton
          label="Done"
          onPress={() => {
            endSession();
            navigation.navigate('Home');
          }}
        />
      }
    >
      {patron.blocks.map((block, index) => (
        <Notice key={index} tone="error" message={blockText(block)} detail="Please see a staff member." />
      ))}

      {feedback ? <Notice tone={feedback.tone} message={feedback.message} /> : null}

      {settings.showFeesAndFines && owed > 0 ? (
        <Card mode="outlined" style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge">You owe {formatCurrency(owed)}</Text>
            <Text variant="bodyMedium" style={styles.muted}>
              {patron.fees.length} charge{patron.fees.length === 1 ? '' : 's'} on your account.
              Payment can be taken at the service desk.
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      <Text variant="titleLarge" accessibilityRole="header" style={styles.heading}>
        {patron.loans.length === 0
          ? 'You have nothing checked out'
          : `${patron.loans.length} item${patron.loans.length === 1 ? '' : 's'} checked out`}
      </Text>
      <Divider />

      {patron.loans.map((loan) => {
        const overdue = isOverdue(loan.dueDate);
        const canRenew = settings.allowRenewals && Boolean(loan.item?.barcode) && !patron.borrowingBlocked;

        return (
          <List.Item
            key={loan.id}
            title={loan.item?.title ?? 'Item'}
            description={`${overdue ? 'Overdue — was due' : 'Due'} ${formatDueDate(loan.dueDate)}`}
            titleNumberOfLines={3}
            titleStyle={styles.itemTitle}
            descriptionStyle={[styles.itemDescription, overdue && styles.overdue]}
            style={styles.item}
            right={() =>
              canRenew ? (
                <BigButton
                  label={renewing === loan.id ? 'Renewing…' : 'Renew'}
                  variant="outlined"
                  disabled={renewing !== undefined}
                  onPress={() => void renew(loan)}
                  style={styles.renewButton}
                />
              ) : null
            }
          />
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.warningContainer, borderColor: palette.warning },
  muted: { color: palette.textMuted, marginTop: spacing.xs },
  heading: { marginTop: spacing.md },
  item: { paddingVertical: spacing.sm },
  itemTitle: { fontSize: 21, fontWeight: '600' },
  itemDescription: { fontSize: 17, color: palette.textMuted },
  overdue: { color: palette.danger, fontWeight: '600' },
  // Sized for the longest label this button takes ("Renewing…"), so the busy
  // state does not truncate either.
  renewButton: { width: 210, alignSelf: 'center' },
});
