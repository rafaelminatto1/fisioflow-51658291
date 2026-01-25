/**
 * FisioFlow - useNotifications Hook
 *
 * React hook for managing push notifications
 * Handles token registration, listeners, and local notifications
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationService } from '../firebase/notifications';
import type { NotificationResponse } from 'expo-notifications';

export interface UseNotificationsOptions {
  /**
   * Auto-register for push notifications on mount
   */
  autoRegister?: boolean;

  /**
   * User ID for saving push token
   */
  userId?: string;

  /**
   * Enable notification channels setup (Android only)
   */
  setupChannels?: boolean;

  /**
   * Custom handler for notification taps
   */
  onNotificationTap?: (response: NotificationResponse) => void;

  /**
   * App type for navigation ('patient' or 'professional')
   */
  appType?: 'patient' | 'professional';
}

export interface UseNotificationsReturn {
  /**
   * Push notification token
   */
  pushToken: string | null;

  /**
   * Is push token being registered
   */
  registering: boolean;

  /**
   * Permission status
   */
  permission: Notifications.PermissionStatus;

  /**
   * Request notification permission
   */
  requestPermission: () => Promise<Notifications.PermissionStatus>;

  /**
   * Register for push notifications
   */
  registerForPush: () => Promise<string | null>;

  /**
   * Schedule a local notification
   */
  scheduleLocal: (
    title: string,
    body: string,
    data?: Record<string, unknown>
  ) => Promise<string>;

  /**
   * Schedule a repeating notification
   */
  scheduleRepeating: (
    title: string,
    body: string,
    hour: number,
    minute: number
  ) => Promise<string>;

  /**
   * Cancel all scheduled notifications
   */
  cancelAll: () => Promise<void>;

  /**
   * Set badge count
   */
  setBadge: (count: number) => Promise<void>;

  /**
   * Get current badge count
   */
  getBadge: () => Promise<number>;

  /**
   * Last notification received (when app was in foreground)
   */
  lastNotification: Notifications.Notification | null;

  /**
   * Last notification response (user tap)
   */
  lastResponse: NotificationResponse | null;
}

/**
 * useNotifications Hook
 *
 * Manages push notifications and local notifications
 */
export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const {
    autoRegister = false,
    userId,
    setupChannels = true,
    onNotificationTap,
    appType = 'patient',
  } = options;

  const router = useRouter();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [permission, setPermission] = useState<Notifications.PermissionStatus>(
    Notifications.PermissionStatus.UNDETERMINED
  );
  const [lastNotification, setLastNotification] =
    useState<Notifications.Notification | null>(null);
  const [lastResponse, setLastResponse] =
    useState<NotificationResponse | null>(null);

  // Track if listeners have been set up
  const listenersSetup = useRef(false);

  /**
   * Default handler for notification taps
   * Must be defined before the useEffect that uses it
   */
  const handleDefaultNotificationTap = useCallback(
    (response: NotificationResponse) => {
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined;

      const basePath = appType === 'patient' ? '/(tabs)' : '/(drawer)';

      // Navigate based on notification type
      if (data?.type === 'appointment') {
        router.push(`${basePath}/calendar`);
      } else if (data?.type === 'exercise') {
        router.push(`${basePath}/exercises`);
      } else if (data?.type === 'message') {
        router.push(`${basePath}/patients`);
      } else if (data?.type === 'profile') {
        router.push(`${basePath}/settings`);
      } else if (data?.type === 'dashboard') {
        router.push(`${basePath}/dashboard`);
      } else if (data?.screen) {
        router.push(data.screen as string);
      }
    },
    [router, appType]
  );

  /**
   * Setup notification channels (Android only)
   */
  useEffect(() => {
    if (setupChannels && Platform.OS === 'android') {
      notificationService.setupNotificationChannels();
    }
  }, [setupChannels]);

  /**
   * Get initial permission status
   */
  useEffect(() => {
    Notifications.getPermissionsAsync().then((status) => {
      setPermission(status);
    });
  }, []);

  /**
   * Request notification permission
   */
  const requestPermission = useCallback(async (): Promise<Notifications.PermissionStatus> => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermission(status);
      return status;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return Notifications.PermissionStatus.DENIED;
    }
  }, []);

  /**
   * Register for push notifications
   */
  const registerForPush = useCallback(async (): Promise<string | null> => {
    if (registering) return pushToken;

    setRegistering(true);

    try {
      const token = await notificationService.registerForPushNotificationsAsync();

      if (token) {
        setPushToken(token);

        // Save token to Firestore if userId provided
        if (userId) {
          await notificationService.savePushToken(userId, token);
        }
      }

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    } finally {
      setRegistering(false);
    }
  }, [registering, pushToken, userId]);

  /**
   * Auto-register if enabled and permission granted
   */
  useEffect(() => {
    if (autoRegister && permission === Notifications.PermissionStatus.GRANTED) {
      registerForPush();
    }
  }, [autoRegister, permission, registerForPush]);

  /**
   * Setup notification listeners (only once)
   */
  useEffect(() => {
    if (listenersSetup.current) return;

    // Listen for notifications received while app is in foreground
    const unsubscribeForeground = notificationService.subscribeToForegroundNotifications(
      (notification) => {
        setLastNotification(notification);
      }
    );

    // Listen for notification taps
    const unsubscribeResponse = notificationService.subscribeToNotificationResponses(
      (response) => {
        setLastResponse(response);

        // Call custom handler if provided
        if (onNotificationTap) {
          onNotificationTap(response);
        } else {
          // Default navigation handling
          handleDefaultNotificationTap(response);
        }
      }
    );

    listenersSetup.current = true;

    return () => {
      unsubscribeForeground();
      unsubscribeResponse();
    };
  }, [onNotificationTap, handleDefaultNotificationTap]);

  /**
   * Schedule a local notification
   */
  const scheduleLocal = useCallback(
    async (
      title: string,
      body: string,
      data?: Record<string, unknown>
    ): Promise<string> => {
      return await notificationService.scheduleLocalNotification(
        title,
        body,
        data
      );
    },
    []
  );

  /**
   * Schedule a repeating notification
   */
  const scheduleRepeating = useCallback(
    async (
      title: string,
      body: string,
      hour: number,
      minute: number
    ): Promise<string> => {
      return await notificationService.scheduleRepeatingNotification(
        title,
        body,
        hour,
        minute
      );
    },
    []
  );

  /**
   * Cancel all scheduled notifications
   */
  const cancelAll = useCallback(async () => {
    await notificationService.cancelAllNotifications();
  }, []);

  /**
   * Set badge count
   */
  const setBadge = useCallback(async (count: number) => {
    await notificationService.setBadgeCount(count);
  }, []);

  /**
   * Get current badge count
   */
  const getBadge = useCallback(async () => {
    return await notificationService.getBadgeCount();
  }, []);

  return {
    pushToken,
    registering,
    permission,
    requestPermission,
    registerForPush,
    scheduleLocal,
    scheduleRepeating,
    cancelAll,
    setBadge,
    getBadge,
    lastNotification,
    lastResponse,
  };
}

/**
 * useNotificationObserver Hook
 *
 * Simpler hook that just observes notifications without managing them
 * Useful for components that need to react to incoming notifications
 */
export function useNotificationObserver() {
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [response, setResponse] = useState<NotificationResponse | null>(null);

  useEffect(() => {
    const unsubscribeForeground = notificationService.subscribeToForegroundNotifications(
      setNotification
    );

    const unsubscribeResponse = notificationService.subscribeToNotificationResponses(
      setResponse
    );

    return () => {
      unsubscribeForeground();
      unsubscribeResponse();
    };
  }, []);

  return { notification, response };
}
