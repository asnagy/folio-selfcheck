import React from 'react';
import { StyleSheet } from 'react-native';
import { Dialog, Portal, Text } from 'react-native-paper';

import { BigButton } from './BigButton';
import { useSession } from '@/session/SessionContext';
import { spacing } from '@/theme';

/**
 * Last chance before the kiosk clears a patron's session.
 *
 * Rendered once at the navigator root rather than per screen, so the guarantee
 * holds no matter where the patron is when they walk away.
 */
export function IdleWarningDialog() {
  const { warning, secondsRemaining, reportActivity, endSession } = useSession();

  return (
    <Portal>
      <Dialog visible={warning} dismissable={false} style={styles.dialog}>
        <Dialog.Title style={styles.title}>Are you still there?</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyLarge">
            {`Your session will end in ${secondsRemaining ?? 0} seconds to protect your account.`}
          </Text>
        </Dialog.Content>
        <Dialog.Actions style={styles.actions}>
          <BigButton label="I'm still here" onPress={reportActivity} style={styles.action} />
          <BigButton
            label="Finish now"
            tone="neutral"
            variant="outlined"
            onPress={endSession}
            style={styles.action}
          />
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: { alignSelf: 'center', width: 620, maxWidth: '92%', borderRadius: 16 },
  title: { fontSize: 30, fontWeight: '700' },
  actions: { flexDirection: 'column', gap: spacing.md, paddingHorizontal: spacing.lg },
  action: { width: '100%' },
});
