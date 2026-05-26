import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '../theme';
import { logSafeError } from '../utils/safeLog';

export type AppDialogState = {
  title: string;
  message: string;
  primaryLabel?: string;
  onPrimary?: () => void | Promise<void>;
  secondaryLabel?: string;
  onSecondary?: () => void | Promise<void>;
  destructive?: boolean;
};

export default function AppDialog({
  dialog,
  onClose,
}: {
  dialog: AppDialogState | null;
  onClose: () => void;
}) {
  if (!dialog) {
    return null;
  }

  const runAndClose = async (action?: () => void | Promise<void>) => {
    onClose();
    try {
      await action?.();
    } catch (error) {
      logSafeError('[AppDialog] action failed:', error);
    }
  };

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{dialog.title}</Text>
          <Text style={styles.message}>{dialog.message}</Text>
          <View style={styles.actions}>
            {dialog.secondaryLabel ? (
              <Pressable
                onPress={() => runAndClose(dialog.onSecondary)}
                accessibilityRole="button"
                accessibilityLabel={dialog.secondaryLabel}
                style={({ pressed }) => [
                  styles.button,
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.secondaryText}>{dialog.secondaryLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => runAndClose(dialog.onPrimary)}
              accessibilityRole="button"
              accessibilityLabel={dialog.primaryLabel ?? '확인'}
              style={({ pressed }) => [
                styles.button,
                dialog.destructive ? styles.dangerButton : styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryText}>{dialog.primaryLabel ?? '확인'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(28,25,23,0.46)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  title: {
    fontSize: fontSize.xl,
    lineHeight: 30,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: fontSize.sm,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    minHeight: 52,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  secondaryButton: {
    backgroundColor: '#F5F5F4',
  },
  primaryButton: {
    backgroundColor: colors.accent,
  },
  dangerButton: {
    backgroundColor: '#DC2626',
  },
  secondaryText: {
    fontSize: fontSize.md,
    lineHeight: 24,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  primaryText: {
    fontSize: fontSize.md,
    lineHeight: 24,
    color: colors.textInverse,
    fontWeight: fontWeight.semibold,
  },
});
