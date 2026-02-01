/**
 * Toast Notification System
 * Beautiful toast notifications for feedback
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

let toastId = 0;
const toasts: Toast[] = [];
const toastListeners: Set<(toasts: Toast[]) => void> = new Set();

const notifyListeners = () => {
  toastListeners.forEach(listener => listener([...toasts]));
};

/**
 * Show a toast notification
 */
export function showToast(
  type: ToastType,
  title: string,
  message?: string,
  duration: number = 3000
): string {
  const id = `toast_${toastId++}`;
  const toast: Toast = { id, type, title, message, duration };

  toasts.push(toast);
  notifyListeners();

  setTimeout(() => {
    removeToast(id);
  }, duration);

  return id;
}

/**
 * Remove a toast notification
 */
export function removeToast(id: string): void {
  const index = toasts.findIndex(t => t.id === id);
  if (index >= 0) {
    toasts.splice(index, 1);
    notifyListeners();
  }
}

/**
 * Toast Component
 */
export function ToastContainer() {
  const colors = useColors();
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastListeners.add(setCurrentToasts);
    return () => {
      toastListeners.delete(setCurrentToasts);
    };
  }, []);

  if (currentToasts.length === 0) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {currentToasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} colors={colors} />
      ))}
    </SafeAreaView>
  );
}

interface ToastItemProps {
  toast: Toast;
  colors: any;
}

function ToastItem({ toast, colors }: ToastItemProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [translateY] = useState(new Animated.Value(-20));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();
  }, []);

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (toast.type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
        return 'information-circle';
    }
  };

  const getColor = (): string => {
    switch (toast.type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'warning':
        return colors.warning;
      case 'info':
        return colors.info;
    }
  };

  const backgroundColor = getColor() + '95';

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor,
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.toastContent}>
        <Ionicons name={getIcon()} size={24} color="#FFFFFF" />
        <View style={styles.toastText}>
          <Text style={styles.toastTitle}>{toast.title}</Text>
          {toast.message && (
            <Text style={styles.toastMessage}>{toast.message}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => removeToast(toast.id)}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

/**
 * Convenience functions for common toasts
 */
export const toast = {
  success: (title: string, message?: string) => showToast('success', title, message),
  error: (title: string, message?: string) => showToast('error', title, message),
  warning: (title: string, message?: string) => showToast('warning', title, message),
  info: (title: string, message?: string) => showToast('info', title, message),
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    gap: 8,
    padding: 16,
    pointerEvents: 'box-none',
  },
  toast: {
    width: '100%',
    maxWidth: Dimensions.get('window').width - 32,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  toastText: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  toastMessage: {
    fontSize: 13,
    color: '#FFFFFF',
    marginTop: 2,
    opacity: 0.9,
  },
  closeButton: {
    padding: 4,
  },
});
