/**
 * FisioFlow - NotificationProvider
 *
 * Provider component for managing push notifications
 * Registers device, handles token management, and sets up listeners
 */

import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useNotifications, useAuth } from '../hooks';

export interface NotificationProviderProps {
  children: React.ReactNode;
  /**
   * Automatically request permission on mount
   */
  requestOnMount?: boolean;
  /**
   * Register for push notifications on mount
   */
  registerOnMount?: boolean;
  /**
   * App type for navigation routing
   */
  appType?: 'patient' | 'professional';
}

/**
 * Configure notification behavior
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * NotificationProvider Component
 *
 * Wraps the app to handle push notification setup
 */
export function NotificationProvider({
  children,
  requestOnMount = true,
  registerOnMount = true,
  appType = 'patient',
}: NotificationProviderProps) {
  const { userData, isAuthenticated } = useAuth();
  const [permissionRequested, setPermissionRequested] = useState(false);

  // Initialize notifications
  const {
    permission,
    pushToken,
    requestPermission,
    registerForPush,
  } = useNotifications({
    autoRegister: false, // We'll handle manually
    userId: userData?.id,
    setupChannels: true,
    appType,
  });

  /**
   * Request permission on mount (if enabled)
   */
  useEffect(() => {
    if (requestOnMount && !permissionRequested && permission !== Notifications.PermissionStatus.GRANTED) {
      requestPermission().then(() => {
        setPermissionRequested(true);
      });
    }
  }, [requestOnMount, permissionRequested, permission, requestPermission]);

  /**
   * Register for push notifications when authenticated
   */
  useEffect(() => {
    if (registerOnMount && isAuthenticated && userData && permission === Notifications.PermissionStatus.GRANTED) {
      registerForPush();
    }
  }, [registerOnMount, isAuthenticated, userData, permission, registerForPush]);

  return <>{children}</>;
}
