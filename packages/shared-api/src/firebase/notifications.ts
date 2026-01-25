/**
 * FisioFlow - Notification Service
 *
 * Firebase Cloud Messaging (FCM) + Expo Notifications
 * Handles push notifications for iOS and Android
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { messaging, isSupported } from './config';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './config';
import { COLLECTIONS } from '@fisioflow/shared-constants';

// ============================================
// Types
// ============================================

export interface PushTokenData {
  token: string;
  platform: 'ios' | 'android';
  createdAt: string;
  updatedAt: string;
}

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface FcmMessage {
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
  token?: string;
  topic?: string;
  condition?: string;
}

// ============================================
// Notification Behavior Configuration
// ============================================

/**
 * Configure how notifications are displayed when app is in foreground
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ============================================
// Push Token Management
// ============================================

/**
 * Register for push notifications and get the token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Check if device is physical (not simulator)
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  // Check platform support
  const supported = await isSupported();
  if (!supported) {
    console.warn('FCM not supported on this platform');
    return null;
  }

  try {
    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }

    // For iOS: get APNs token
    if (Platform.OS === 'ios') {
      const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
      if (!projectId) {
        throw new Error('EXPO_PUBLIC_FIREBASE_PROJECT_ID not set');
      }

      token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
    } else {
      // For Android: get FCM token
      if (messaging) {
        const fcmToken = await messaging.getToken();
        token = fcmToken;
      }
    }

    console.log('Push notification token:', token);
    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Save push token to Firestore for the user
 */
export async function savePushToken(
  userId: string,
  token: string
): Promise<void> {
  try {
    const tokenData: PushTokenData = {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Use subcollection 'push_tokens' for better scalability and consistency with backend
    const tokenRef = doc(db, COLLECTIONS.users, userId, 'push_tokens', token);

    await setDoc(tokenRef, tokenData, { merge: true });
    console.log(`Token saved/updated in users/${userId}/push_tokens/${token}`);
  } catch (error) {
    console.error('Error saving push token:', error);
    throw error;
  }
}

/**
 * Remove push token from user (when logging out)
 */
export async function removePushToken(userId: string, token: string): Promise<void> {
  try {
    // Remove from subcollection
    const tokenRef = doc(db, COLLECTIONS.users, userId, 'push_tokens', token);
    await deleteDoc(tokenRef);
    console.log(`Token removed from users/${userId}/push_tokens/${token}`);
  } catch (error) {
    console.error('Error removing push token:', error);
    throw error;
  }
}

// ============================================
// Notification Listeners
// ============================================

type NotificationHandler = (notification: Notifications.Notification) => void;

/**
 * Listen for notifications received while app is in foreground
 */
export function subscribeToForegroundNotifications(
  handler: NotificationHandler
): () => void {
  const subscription = Notifications.addNotificationReceivedListener(handler);
  return () => subscription.remove();
}

/**
 * Listen for notification response (user tapped on notification)
 */
export function subscribeToNotificationResponses(
  handler: (response: Notifications.NotificationResponse) => void
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(handler);
  return () => subscription.remove();
}

// ============================================
// Local Notifications
// ============================================

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
      badge: 1,
    },
    trigger: trigger || null, // null = show immediately
  });

  return notificationId;
}

/**
 * Schedule a repeating notification (e.g., daily exercise reminder)
 */
export async function scheduleRepeatingNotification(
  title: string,
  body: string,
  hour: number,
  minute: number,
  data?: Record<string, unknown>
): Promise<string> {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      identifier: 'daily-reminder',
      hour,
      minute,
      repeats: true,
    } as Notifications.NotificationTriggerInput,
  });

  return notificationId;
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Dismiss a presented notification
 */
export async function dismissNotification(notificationId: string): Promise<void> {
  await Notifications.dismissNotificationAsync(notificationId);
}

/**
 * Dismiss all presented notifications
 */
export async function dismissAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

// ============================================
// Badge Management
// ============================================

/**
 * Set the app badge number
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Get the current badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

// ============================================
// Notification Channels (Android only)
// ============================================

/**
 * Set up notification channels for Android
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3B82F6',
  });

  await Notifications.setNotificationChannelAsync('appointments', {
    name: 'Agendamentos',
    description: 'Notificações sobre agendamentos e consultas',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3B82F6',
  });

  await Notifications.setNotificationChannelAsync('exercises', {
    name: 'Exercícios',
    description: 'Lembretes de exercícios diários',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#10B981',
  });

  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Mensagens',
    description: 'Notificações de mensagens do profissional',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#8B5CF6',
  });

  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Lembretes',
    description: 'Lembretes gerais do aplicativo',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#F59E0B',
  });
}

// ============================================
// FCM Message Listening (for background/terminated)
// ============================================

/**
 * Listen to FCM messages when app is in background
 * This should be called at app startup
 */
export function listenToFcmMessages(
  onMessage: (message: { data?: Record<string, string>; notification?: { title: string; body: string } }) => void
): () => void | null {
  if (!messaging) {
    console.warn('Messaging not supported on this platform');
    return () => { };
  }

  const unsubscribe = messaging.onMessage(onMessage);
  return unsubscribe;
}

// ============================================
// Export notification service
// ============================================

export const notificationService = {
  // Push token management
  registerForPushNotificationsAsync,
  savePushToken,
  removePushToken,

  // Listeners
  subscribeToForegroundNotifications,
  subscribeToNotificationResponses,
  listenToFcmMessages,

  // Local notifications
  scheduleLocalNotification,
  scheduleRepeatingNotification,
  cancelNotification,
  cancelAllNotifications,
  dismissNotification,
  dismissAllNotifications,

  // Badge
  setBadgeCount,
  getBadgeCount,

  // Channels
  setupNotificationChannels,
};

export default notificationService;
