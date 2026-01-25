/**
 * FisioFlow Design System - Toast Component
 *
 * Toast notification system for user feedback
 * Supports multiple variants and auto-dismissal
 */

import React, { useEffect, useState, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top' | 'bottom' | 'center';

export interface ToastConfig {
  id: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  icon?: ReactNode;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastProps extends ToastConfig {
  visible: boolean;
  onDismiss: () => void;
  position?: ToastPosition;
}

/**
 * Toast Item Component
 */
function ToastItem({
  visible,
  message,
  variant = 'info',
  duration = 3000,
  icon,
  action,
  onDismiss,
  position = 'top',
}: ToastProps) {
  const theme = useTheme();
  const [animateValue] = useState(new Animated.Value(0));
  const [opacityValue] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Animate in
      const slideDistance = position === 'bottom' ? 100 : position === 'center' ? 0 : -100;

      Animated.parallel([
        Animated.timing(animateValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      handleDismiss();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(animateValue, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: theme.colors.success[500],
          icon: '✓',
        };
      case 'error':
        return {
          backgroundColor: theme.colors.danger[500],
          icon: '✕',
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning[500],
          icon: '⚠',
        };
      case 'info':
      default:
        return {
          backgroundColor: theme.colors.info[500],
          icon: 'ⓘ',
        };
    }
  };

  const variantStyles = getVariantStyles();
  const translateY = animateValue.interpolate({
    inputRange: [0, 1],
    outputRange: [position === 'bottom' ? 100 : -100, 0],
  });

  if (!visible && (opacityValue as any)._value === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          opacity: opacityValue,
          transform: [{ translateY }],
        },
        position === 'top' && styles.positionTop,
        position === 'bottom' && styles.positionBottom,
        position === 'center' && styles.positionCenter,
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={[
          styles.toast,
          {
            backgroundColor: variantStyles.backgroundColor,
            borderRadius: theme.borderRadius.md,
          },
        ]}
      >
        <View style={styles.toastContent}>
          {icon || (
            <Text style={styles.defaultIcon}>{variantStyles.icon}</Text>
          )}
          <Text style={styles.message}>{message}</Text>
        </View>
        {action && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={action.onPress}
          >
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Toast Container & Manager
 */
interface ToastState {
  toasts: ToastConfig[];
}

class ToastManager {
  private static instance: ToastManager;
  private listeners: Set<(state: ToastState) => void> = new Set();
  private state: ToastState = { toasts: [] };

  private constructor() { }

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  subscribe(listener: (state: ToastState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  show(config: Omit<ToastConfig, 'id'>): string {
    const id = Math.random().toString(36).substring(7);
    const toast: ToastConfig = { ...config, id };
    this.state.toasts = [...this.state.toasts, toast];
    this.notify();
    return id;
  }

  success(message: string, options?: Partial<Omit<ToastConfig, 'id' | 'message' | 'variant'>>) {
    return this.show({ message, variant: 'success', ...options });
  }

  error(message: string, options?: Partial<Omit<ToastConfig, 'id' | 'message' | 'variant'>>) {
    return this.show({ message, variant: 'error', ...options });
  }

  warning(message: string, options?: Partial<Omit<ToastConfig, 'id' | 'message' | 'variant'>>) {
    return this.show({ message, variant: 'warning', ...options });
  }

  info(message: string, options?: Partial<Omit<ToastConfig, 'id' | 'message' | 'variant'>>) {
    return this.show({ message, variant: 'info', ...options });
  }

  dismiss(id: string) {
    this.state.toasts = this.state.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  dismissAll() {
    this.state.toasts = [];
    this.notify();
  }
}

/**
 * Toast Provider Component
 */
export interface ToastProviderProps {
  children: ReactNode;
  position?: ToastPosition;
}

export function ToastProvider({ children, position = 'top' }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);

  useEffect(() => {
    const manager = ToastManager.getInstance();
    const unsubscribe = manager.subscribe((state) => {
      setToasts(state.toasts);
    });
    return () => { unsubscribe(); };
  }, []);

  return (
    <>
      {children}
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          {...toast}
          visible={true}
          onDismiss={() => ToastManager.getInstance().dismiss(toast.id)}
          position={position}
        />
      ))}
    </>
  );
}

/**
 * Toast Hook
 */
export function useToast() {
  return {
    show: (config: Omit<ToastConfig, 'id'>) => ToastManager.getInstance().show(config),
    success: (message: string, options?: Partial<Omit<ToastConfig, 'id' | 'message' | 'variant'>>) =>
      ToastManager.getInstance().success(message, options),
    error: (message: string, options?: Partial<Omit<ToastConfig, 'id' | 'message' | 'variant'>>) =>
      ToastManager.getInstance().error(message, options),
    warning: (message: string, options?: Partial<Omit<ToastConfig, 'id' | 'message' | 'variant'>>) =>
      ToastManager.getInstance().warning(message, options),
    info: (message: string, options?: Partial<Omit<ToastConfig, 'id' | 'message' | 'variant'>>) =>
      ToastManager.getInstance().info(message, options),
    dismiss: (id: string) => ToastManager.getInstance().dismiss(id),
    dismissAll: () => ToastManager.getInstance().dismissAll(),
  };
}

/**
 * Convenience exports for direct usage
 */
export const toast = {
  show: (config: Omit<ToastConfig, 'id'>) => ToastManager.getInstance().show(config),
  success: (message: string, options?: Partial<Omit<ToastConfig, 'id' | 'message' | 'variant'>>) =>
    ToastManager.getInstance().success(message, options),
  error: (message: string, options?: Partial<Omit<ToastConfig, 'id' | 'message' | 'variant'>>) =>
    ToastManager.getInstance().error(message, options),
  warning: (message: string, options?: Partial<Omit<ToastConfig, 'id' | 'message' | 'variant'>>) =>
    ToastManager.getInstance().warning(message, options),
  info: (message: string, options?: Partial<Omit<ToastConfig, 'id' | 'message' | 'variant'>>) =>
    ToastManager.getInstance().info(message, options),
  dismiss: (id: string) => ToastManager.getInstance().dismiss(id),
  dismissAll: () => ToastManager.getInstance().dismissAll(),
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  positionTop: {
    top: 50,
  },
  positionBottom: {
    bottom: 50,
  },
  positionCenter: {
    top: '50%',
    marginTop: -30,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  defaultIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  actionButton: {
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    includeFontPadding: false,
  },
});
