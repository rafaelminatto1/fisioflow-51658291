/**
 * FisioFlow Design System - Modal Component
 *
 * Accessible modal dialog component
 * Supports multiple sizes and animations
 */

import React, { ReactNode, useEffect, useRef } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme';
import { Button } from './Button';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_ANDROID = Platform.OS === 'android';

export type ModalSize = 'sm' | 'md' | 'lg' | 'full' | 'auto';

export interface ModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** onClose handler */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: ReactNode;
  /** Modal size */
  size?: ModalSize;
  /** Show close button */
  showCloseButton?: boolean;
  /** Close on backdrop press */
  closeOnBackdropPress?: boolean;
  /** Close on swipe down (bottom sheet style) */
  closeOnSwipeDown?: boolean;
  /** Footer actions */
  actions?: Array<{
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    disabled?: boolean;
  }>;
  /** Additional styles */
  style?: any;
  /** Content style */
  contentStyle?: any;
  /** Test ID */
  testID?: string;
  /** Enable haptic feedback on close */
  haptic?: boolean;
}

/**
 * Modal Component
 */
export function Modal({
  visible,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropPress = true,
  closeOnSwipeDown = false,
  actions,
  style,
  contentStyle,
  testID,
  haptic = true,
}: ModalProps) {
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [modalHeight, setModalHeight] = React.useState(0);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 20,
          stiffness: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  const handleClose = () => {
    if (haptic) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onClose();
  };

  const getSizeStyles = () => {
    const maxWidth = {
      sm: SCREEN_HEIGHT * 0.5,
      md: SCREEN_HEIGHT * 0.7,
      lg: SCREEN_HEIGHT * 0.85,
      full: SCREEN_HEIGHT * 0.95,
      auto: 'auto',
    };

    return {
      maxWidth: maxWidth[size] === 'auto' ? '90%' : maxWidth[size],
      width: '90%',
    };
  };

  const backdropStyle = {
    ...styles.backdrop,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    opacity: fadeAnim,
  };

  const containerStyle = {
    ...styles.container,
    ...getSizeStyles(),
    backgroundColor: theme.colors.background,
    borderRadius: size === 'full' ? 0 : theme.borderRadius.xl,
    transform: [{ scale: scaleAnim }],
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      testID={testID}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={closeOnBackdropPress ? handleClose : undefined}
      >
        <Animated.View style={backdropStyle}>
          <KeyboardAvoidingView
            behavior={IS_ANDROID ? 'height' : 'padding'}
            style={styles.keyboardAvoiding}
          >
            <Pressable onPress={() => {}} style={[styles.contentWrapper, style]}>
              <View
                style={[containerStyle, contentStyle]}
                onLayout={(e) => setModalHeight(e.nativeEvent.layout.height)}
              >
                {/* Header */}
                {(title || showCloseButton) && (
                  <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                    {title && (
                      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                        {title}
                      </Text>
                    )}
                    {showCloseButton && (
                      <TouchableOpacity
                        onPress={handleClose}
                        style={styles.closeButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={[styles.closeIcon, { color: theme.colors.text.secondary }]}>
                          ✕
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Content */}
                <View style={styles.body}>{children}</View>

                {/* Footer Actions */}
                {actions && actions.length > 0 && (
                  <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
                    {actions.map((action, index) => (
                      <View
                        key={index}
                        style={[index > 0 && styles.actionSpacer, { flex: index === 0 && actions.length === 1 ? 1 : undefined }]}
                      >
                        <Button
                          onPress={() => {
                            action.onPress();
                            if (action.variant !== 'danger') {
                              handleClose();
                            }
                          }}
                          variant={action.variant || 'primary'}
                          disabled={action.disabled}
                          fullWidth={actions.length === 1}
                          size={actions.length > 2 ? 'sm' : 'md'}
                        >
                          {action.label}
                        </Button>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Animated.View>
      </Pressable>
    </RNModal>
  );
}

/**
 * Alert Modal - Quick alert dialogs
 */
export interface AlertModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** onClose handler */
  onClose: () => void;
  /** Alert title */
  title: string;
  /** Alert message */
  message: string;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** onConfirm handler */
  onConfirm?: () => void;
  /** Alert variant */
  variant?: 'info' | 'success' | 'warning' | 'danger';
}

export function AlertModal({
  visible,
  onClose,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel,
  onConfirm,
  variant = 'info',
}: AlertModalProps) {
  const theme = useTheme();

  const getVariantIcon = () => {
    switch (variant) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'danger':
        return '✕';
      default:
        return 'ⓘ';
    }
  };

  const getVariantColor = () => {
    switch (variant) {
      case 'success':
        return theme.colors.success[500];
      case 'warning':
        return theme.colors.warning[500];
      case 'danger':
        return theme.colors.danger[500];
      default:
        return theme.colors.info[500];
    }
  };

  const actions = [
    ...(cancelLabel
      ? [
          {
            label: cancelLabel,
            onPress: onClose,
            variant: 'ghost' as const,
          },
        ]
      : []),
    {
      label: confirmLabel,
      onPress: () => {
        onConfirm?.();
        onClose();
      },
      variant: variant === 'danger' ? ('danger' as const) : ('primary' as const),
    },
  ];

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={title}
      size="sm"
      actions={actions}
    >
      <View style={styles.alertContent}>
        <View
          style={[
            styles.alertIcon,
            { backgroundColor: getVariantColor() + '20' },
          ]}
        >
          <Text style={[styles.alertIconText, { color: getVariantColor() }]}>
            {getVariantIcon()}
          </Text>
        </View>
        <Text style={[styles.alertMessage, { color: theme.colors.text.secondary }]}>
          {message}
        </Text>
      </View>
    </Modal>
  );
}

/**
 * Confirm Dialog - Yes/No confirmation
 */
export interface ConfirmDialogProps {
  /** Whether the dialog is visible */
  visible: boolean;
  /** onClose handler */
  onClose: (confirmed: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Dialog variant */
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  visible,
  onClose,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'info',
}: ConfirmDialogProps) {
  return (
    <AlertModal
      visible={visible}
      onClose={() => onClose(false)}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={() => onClose(true)}
      variant={variant}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoiding: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  contentWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    maxHeight: '90%',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    includeFontPadding: false,
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 20,
    fontWeight: '600',
    includeFontPadding: false,
  },
  body: {
    padding: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  actionSpacer: {
    flex: 1,
  },
  alertContent: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  alertIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconText: {
    fontSize: 28,
    fontWeight: '600',
  },
  alertMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    includeFontPadding: false,
  },
});
