/**
 * FisioFlow - Notification Service
 *
 * Firebase Cloud Messaging (FCM) + Expo Notifications
 * Handles push notifications for iOS and Android
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { messaging, isSupported, db } from './config';
import { getToken as firebaseGetToken, onMessage as firebaseOnMessage } from 'firebase/messaging';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { COLLECTIONS } from '@fisioflow/shared-constants';

// ... (types)
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

// ... (No changes to setNotificationHandler)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ... (registerForPushNotificationsAsync)
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  const supported = await isSupported();
  if (!supported) {
    console.warn('FCM not supported on this platform');
    return null;
  }

  try {
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

    if (Platform.OS === 'ios') {
      const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
      if (!projectId) {
        throw new Error('EXPO_PUBLIC_FIREBASE_PROJECT_ID not set');
      }

      const expoToken = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      token = expoToken.data;
    } else {
      if (messaging) {
        token = await firebaseGetToken(messaging);
      }
    }

    console.log('Push notification token:', token);
    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

// ... (savePushToken, removePushToken, listeners)
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

    const tokenRef = doc(db, COLLECTIONS.USERS, userId, 'push_tokens', token);
    await setDoc(tokenRef, tokenData, { merge: true });
    console.log(`Token saved/updated in users/${userId}/push_tokens/${token}`);
  } catch (error) {
    console.error('Error saving push token:', error);
    throw error;
  }
}

export async function removePushToken(userId: string, token: string): Promise<void> {
  try {
    const tokenRef = doc(db, COLLECTIONS.USERS, userId, 'push_tokens', token);
    await deleteDoc(tokenRef);
    console.log(`Token removed from users/${userId}/push_tokens/${token}`);
  } catch (error) {
    console.error('Error removing push token:', error);
    throw error;
  }
}

type NotificationHandler = (notification: Notifications.Notification) => void;

export function subscribeToForegroundNotifications(
  handler: NotificationHandler
): () => void {
  const subscription = Notifications.addNotificationReceivedListener(handler);
  return () => subscription.remove();
}

export function subscribeToNotificationResponses(
  handler: (response: Notifications.NotificationResponse) => void
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(handler);
  return () => subscription.remove();
}

// ... (local notifications)
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
    trigger: trigger || null,
  });

  return notificationId;
}

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

export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function dismissNotification(notificationId: string): Promise<void> {
  await Notifications.dismissNotificationAsync(notificationId);
}

export async function dismissAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

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

export function listenToFcmMessages(
  onMessage: (message: any) => void
): () => void {
  if (!messaging) {
    console.warn('Messaging not supported on this platform');
    return () => { };
  }

  const unsubscribe = firebaseOnMessage(messaging, onMessage);
  return unsubscribe;
}

export const notificationService = {
  registerForPushNotificationsAsync,
  savePushToken,
  removePushToken,
  subscribeToForegroundNotifications,
  subscribeToNotificationResponses,
  listenToFcmMessages,
  scheduleLocalNotification,
  scheduleRepeatingNotification,
  cancelNotification,
  cancelAllNotifications,
  dismissNotification,
  dismissAllNotifications,
  setBadgeCount,
  getBadgeCount,
  setupNotificationChannels,
};

export default notificationService;

