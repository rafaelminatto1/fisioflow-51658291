/**
 * FisioFlow Design System - BottomSheet Component
 *
 * Bottom sheet that slides up from the bottom
 * Supports snap points and drag-to-dismiss
 */

import React, { ReactNode, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme';
import { Divider } from './Divider';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_ANDROID = Platform.OS === 'android';

export type SnapPoint = number | string; // e.g., 100, '50%', '60%'

export interface BottomSheetProps {
  /** Whether the bottom sheet is visible */
  visible: boolean;
  /** onClose handler */
  onClose: () => void;
  /** Sheet content */
  children: ReactNode;
  /** Snap points (heights) - first is initial */
  snapPoints?: SnapPoint[];
  /** Initial snap point index */
  initialSnapIndex?: number;
  /** Enable drag to dismiss */
  enableDragToDismiss?: boolean;
  /** Show backdrop */
  showBackdrop?: boolean;
  /** Sheet title */
  title?: string;
  /** Show handle indicator */
  showHandle?: boolean;
  /** Border radius */
  borderRadius?: number;
  /** Additional styles */
  style?: any;
  /** Content style */
  contentStyle?: any;
  /** Test ID */
  testID?: string;
  /** Enable haptic feedback */
  haptic?: boolean;
}

/**
 * Convert snap point to pixels
 */
function snapPointToPixels(point: SnapPoint): number {
  if (typeof point === 'string' && point.endsWith('%')) {
    return (SCREEN_HEIGHT * parseFloat(point)) / 100;
  }
  return point as number;
}

/**
 * BottomSheet Component
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  snapPoints = ['50%', '90%'],
  initialSnapIndex = 0,
  enableDragToDismiss = true,
  showBackdrop = true,
  title,
  showHandle = true,
  borderRadius,
  style,
  contentStyle,
  testID,
  haptic = true,
}: BottomSheetProps) {
  const theme = useTheme();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [currentSnapIndex, setCurrentSnapIndex] = useState(initialSnapIndex);
  const [containerHeight, setContainerHeight] = useState(0);

  const snapPointsPixels = snapPoints.map(snapPointToPixels);
  const currentSnapPoint = snapPointsPixels[currentSnapIndex] || snapPointsPixels[0];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT - currentSnapPoint,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, currentSnapPoint]);

  const handleClose = () => {
    if (haptic) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onClose();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enableDragToDismiss && visible,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return enableDragToDismiss && visible && gestureState.dy > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(SCREEN_HEIGHT - currentSnapPoint + gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = 100;
        if (gestureState.dy > threshold) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: SCREEN_HEIGHT - currentSnapPoint,
            useNativeDriver: true,
            damping: 20,
            stiffness: 300,
          }).start();
        }
      },
    })
  ).current;

  const sheetRadius = borderRadius ?? theme.borderRadius.xl;

  return (
    <>
      {/* Backdrop */}
      {showBackdrop && (
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      {/* Sheet */}
      <Animated.View
        testID={testID}
        style={[
          styles.sheet,
          {
            transform: [{ translateY }],
            borderRadius: sheetRadius,
          },
          style,
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        {/* Handle */}
        {showHandle && (
          <View style={styles.handleContainer}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.handlePress}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.handle,
                  { backgroundColor: theme.colors.gray[300] },
                ]}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Title */}
        {title && (
          <>
            <View style={styles.header}>
              <Text
                style={[styles.title, { color: theme.colors.text.primary }]}
              >
                {title}
              </Text>
            </View>
            <Divider />
          </>
        )}

        {/* Content */}
        <View
          {...panResponder.panHandlers}
          style={[styles.content, contentStyle]}
          onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
        >
          {children}
        </View>
      </Animated.View>
    </>
  );
}

/**
 * Bottom Sheet Action Item
 */
export interface BottomSheetActionProps {
  /** Icon */
  icon?: ReactNode;
  /** Label */
  label: string;
  /** Subtitle/Description */
  subtitle?: string;
  /** Action type */
  variant?: 'default' | 'danger' | 'success';
  /** onPress handler */
  onPress: () => void;
  /** Disabled */
  disabled?: boolean;
}

export function BottomSheetAction({
  icon,
  label,
  subtitle,
  variant = 'default',
  onPress,
  disabled = false,
}: BottomSheetActionProps) {
  const theme = useTheme();

  const getColor = () => {
    if (disabled) return theme.colors.gray[400];
    if (variant === 'danger') return theme.colors.danger[500];
    if (variant === 'success') return theme.colors.success[500];
    return theme.colors.primary[500];
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={styles.action}
    >
      {icon && <View style={styles.actionIcon}>{icon}</View>}
      <View style={styles.actionContent}>
        <Text
          style={[
            styles.actionLabel,
            { color: disabled ? theme.colors.gray[400] : theme.colors.text.primary },
          ]}
        >
          {label}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.actionSubtitle,
              { color: theme.colors.text.tertiary },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Quick Action Sheet - Pre-built action sheet
 */
export interface ActionSheetProps {
  /** Visible */
  visible: boolean;
  /** onClose */
  onClose: () => void;
  /** Title */
  title?: string;
  /** Message */
  message?: string;
  /** Actions */
  actions: Array<{
    label: string;
    icon?: ReactNode;
    onPress: () => void;
    variant?: 'default' | 'danger' | 'success';
    disabled?: boolean;
  }>;
  /** Cancel button label */
  cancelLabel?: string;
  /** Destructive action index */
  destructiveIndex?: number;
}

export function ActionSheet({
  visible,
  onClose,
  title,
  message,
  actions,
  cancelLabel = 'Cancelar',
  destructiveIndex,
}: ActionSheetProps) {
  const theme = useTheme();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      snapPoints={['40%', '70%']}
    >
      {message && (
        <Text style={[styles.message, { color: theme.colors.text.secondary }]}>
          {message}
        </Text>
      )}

      <View style={styles.actionsContainer}>
        {actions.map((action, index) => (
          <BottomSheetAction
            key={index}
            label={action.label}
            icon={action.icon}
            variant={
              index === destructiveIndex ? 'danger' : action.variant || 'default'
            }
            onPress={() => {
              action.onPress();
              onClose();
            }}
            disabled={action.disabled}
          />
        ))}

        <Divider style={{ marginVertical: 8 }} />

        <BottomSheetAction
          label={cancelLabel}
          onPress={onClose}
          variant="default"
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9999,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handlePress: {
    padding: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    includeFontPadding: false,
  },
  actionsContainer: {
    gap: 4,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  actionIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '500',
    includeFontPadding: false,
  },
  actionSubtitle: {
    fontSize: 13,
    marginTop: 2,
    includeFontPadding: false,
  },
});
