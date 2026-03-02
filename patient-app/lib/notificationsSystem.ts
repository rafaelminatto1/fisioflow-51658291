/**
 * Notifications System - Patient App
 * Handles push notifications setup and management
 */

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import notificationIcon from '@/assets/notification-icon.png';
import { auth, db } from './firebaseConfig';
import { log } from '@/lib/logger';

export interface NotificationPermission {
  granted: boolean;
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
}

export interface PushToken {
  token: string;
  platform: 'ios' | 'android';
  appVersion: string;
  deviceName?: string;
  createdAt: Date;
  updatedAt: Date;
}

type NotificationListener = (notification: Notifications.Notification) => void;
type ResponseListener = (response: Notifications.NotificationResponse) => void;

let notificationListener: Notifications.Subscription | null = null;
let responseListener: Notifications.Subscription | null = null;

function getExpoProjectId(): string | undefined {
  return (
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ||
    (Constants.easConfig?.projectId as string | undefined)
  );
}

/**
 * Request notification permissions from user
 */
export async function requestNotificationPermissions(): Promise<NotificationPermission> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return {
    granted: finalStatus === 'granted',
    canAskAgain: finalStatus !== 'denied' && finalStatus !== 'granted',
    status: finalStatus,
  };
}

// Debounce para evitar múltiplas chamadas simultâneas
let isRegistering = false;
let lastRegistrationTime = 0;

/**
 * Register push token and save to Firestore
 */
export async function registerPushToken(
  userId: string,
  appVersion: string = '1.0.0'
): Promise<string | null> {
  try {
    if (!userId) {
      log.warn('Cannot register push token without userId');
      return null;
    }

    // Evitar múltiplas chamadas em menos de 10 segundos
    const now = Date.now();
    if (isRegistering || (now - lastRegistrationTime < 10000)) {
      return null;
    }

    isRegistering = true;
    lastRegistrationTime = now;

    // Check if platform supports push notifications
    if (!Device.isDevice) {
      log.info('Push notifications only work on physical devices');
      isRegistering = false;
      return null;
    }

    // Get notification permissions
    const permission = await requestNotificationPermissions();
    if (!permission.granted) {
      log.info('Notification permission not granted');
      isRegistering = false;
      return null;
    }

    // Get the push token
    const projectId = getExpoProjectId();
    if (!projectId) {
      log.error('Expo projectId not found. Check app.json extra.eas.projectId.');
      isRegistering = false;
      return null;
    }

    let token;
    try {
      token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
    } catch (tokenError: any) {
      // Tratar erro de Keychain (comum no iOS)
      if (tokenError.message?.includes('Keychain access failed')) {
        log.warn('Keychain error during push token registration. Skipping.');
        isRegistering = false;
        return null;
      }
      throw tokenError;
    }

    const tokenData: PushToken = {
      token: token.data,
      platform: Platform.OS as 'ios' | 'android',
      appVersion,
      deviceName: Device.deviceName ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to Firestore
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const existingTokens = userData.pushTokens || [];

      // Check if token already exists
      const tokenExists = existingTokens.some((t: PushToken) => t.token === token.data);

      if (!tokenExists) {
        // Add new token
        await updateDoc(userRef, {
          pushTokens: arrayUnion(tokenData),
          'notifications.enabled': true,
          'notifications.lastTokenUpdate': new Date(),
        });
      } else {
        // Update existing token timestamp
        const tokenIndex = existingTokens.findIndex((t: PushToken) => t.token === token.data);
        if (tokenIndex >= 0) {
          existingTokens[tokenIndex].updatedAt = new Date();
        }

        await updateDoc(userRef, {
          pushTokens: existingTokens,
          'notifications.lastTokenUpdate': new Date(),
        });
      }
    }

    const profileRef = doc(db, 'profiles', userId);
    const profileDoc = await getDoc(profileRef);

    if (profileDoc.exists()) {
      const profileData = profileDoc.data();
      const existingProfileTokens = profileData.pushTokens || [];
      const profileTokenIndex = existingProfileTokens.findIndex((t: PushToken) => t.token === token.data);

      if (profileTokenIndex < 0) {
        await updateDoc(profileRef, {
          pushTokens: arrayUnion(tokenData),
          'notifications.enabled': true,
          'notifications.lastTokenUpdate': new Date(),
        });
      } else {
        existingProfileTokens[profileTokenIndex].updatedAt = new Date();

        await updateDoc(profileRef, {
          pushTokens: existingProfileTokens,
          'notifications.lastTokenUpdate': new Date(),
        });
      }
    } else {
      await setDoc(profileRef, {
        pushTokens: [tokenData],
        notifications: {
          enabled: true,
          lastTokenUpdate: new Date(),
        },
      }, { merge: true });
    }

    log.info('Push token registered:', token.data);
    isRegistering = false;
    return token.data;
  } catch (error) {
    log.error('Error registering push token:', error);
    isRegistering = false;
    return null;
  }
}

/**
 * Listen for notification responses
 */
export function useNotificationResponse() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      log.info('Notification response:', response);

      // Handle notification tap
      if (response.notification.request.content.data?.route) {
        // Navigate to specific route
        // router.push(response.notification.request.content.data.route);
        log.info('Navigate to:', response.notification.request.content.data.route);
      }
    });

    return () => subscription.remove();
  }, []);
}

/**
 * Listen for notifications received while app is running
 */
export function useNotificationReceived() {
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      log.info('Notification received:', notification);

      // Show in-app notification
      // You can update UI, play sound, vibrate, etc.
      if (notification.request.content.title) {
        // Show alert or update UI
        log.info('Title:', notification.request.content.title);
      }
    });

    return () => subscription.remove();
  }, []);
}

/**
 * Custom hook to setup notifications for a patient
 * Automatically registers token on mount
 */
export function usePatientNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    canAskAgain: true,
    status: Notifications.PermissionStatus.UNDETERMINED,
  });
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check current permission status
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPermission({
        granted: status === 'granted',
        canAskAgain: status !== 'denied',
        status,
      });
    });
  }, []);

  const requestPermission = async () => {
    setLoading(true);
    const result = await requestNotificationPermissions();
    setPermission(result);

    if (result.granted) {
      const pushToken = await registerPushToken(auth.currentUser?.uid || '');
      setToken(pushToken);
    }

    setLoading(false);
    return result.granted;
  };

  return {
    permission,
    token,
    loading,
    requestPermission,
  };
}

/**
 * Clear push token (logout)
 */
export async function clearPushToken(userId: string): Promise<void> {
  try {
    if (!userId) {
      return;
    }

    // Check if platform supports push notifications
    if (!Device.isDevice) {
      return;
    }

    const projectId = getExpoProjectId();
    if (!projectId) {
      return;
    }
    const tokenResult = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const existingTokens = userData.pushTokens || [];

      // Filter out the current token
      const updatedTokens = existingTokens.filter(
        (t: PushToken) => t.token !== tokenResult.data
      );

      await updateDoc(userRef, {
        pushTokens: updatedTokens,
      });
    }

    const profileRef = doc(db, 'profiles', userId);
    const profileDoc = await getDoc(profileRef);

    if (profileDoc.exists()) {
      const profileData = profileDoc.data();
      const existingProfileTokens = profileData.pushTokens || [];
      const updatedProfileTokens = existingProfileTokens.filter(
        (t: PushToken) => t.token !== tokenResult.data
      );

      await updateDoc(profileRef, {
        pushTokens: updatedProfileTokens,
      });
    }

    log.info('Push token cleared');
  } catch (error) {
    log.error('Error clearing push token:', error);
  }
}

/**
 * Create notification channel (Android only)
 */
export async function createNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22c55e',
    });
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Lembretes de Exercícios',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22c55e',
    });
    await Notifications.setNotificationChannelAsync('appointments', {
      name: 'Lembretes de Consultas',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
    });
  }
}

/**
 * Initialize notifications system
 */
export async function initializeNotifications(): Promise<void> {
  // Evitar inicialização nativa no Expo Go (SDK 53+ não suporta notificações nativas no Expo Go)
  const isExpoGo = Constants.executionEnvironment === 'storeClient';
  if (isExpoGo) {
    log.info('Notifications: Skipping native initialization in Expo Go');
    return;
  }

  // Create notification channels (Android)
  await createNotificationChannel();

  // Set notification handler for when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  // Listen for token updates (when token changes)
  Notifications.addPushTokenListener(async (token) => {
    if (auth.currentUser?.uid) {
      await registerPushToken(auth.currentUser.uid);
      log.info('Push token updated:', token.data);
    }
  });
}

/**
 * Add notification listeners (non-hook)
 */
export function addNotificationReceivedListener(listener: NotificationListener) {
  notificationListener = Notifications.addNotificationReceivedListener(listener);
  return notificationListener;
}

export function addNotificationResponseReceivedListener(listener: ResponseListener) {
  responseListener = Notifications.addNotificationResponseReceivedListener(listener);
  return responseListener;
}

export function removeNotificationListeners() {
  if (notificationListener) {
    notificationListener.remove();
    notificationListener = null;
  }
  if (responseListener) {
    responseListener.remove();
    responseListener = null;
  }
}

/**
 * Local notifications helpers
 */
export async function scheduleLocalNotification(notification: {
  title: string;
  body: string;
  data?: Record<string, any>;
  trigger?: Notifications.NotificationTriggerInput;
}): Promise<string> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: 'default',
      },
      trigger: notification.trigger || null,
    });
    return id;
  } catch (error) {
    log.error('Error scheduling notification:', error);
    throw error;
  }
}

export async function scheduleAppointmentReminder(
  appointmentId: string,
  patientName: string,
  appointmentDate: Date
): Promise<string> {
  const reminderDate = new Date(appointmentDate.getTime() - 60 * 60 * 1000);

  return scheduleLocalNotification({
    title: 'Lembrete de Agendamento',
    body: `Olá ${patientName}! Você tem uma sessão de fisioterapia em 1 hora.`,
    data: { type: 'appointment', appointmentId },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });
}

export async function scheduleExerciseReminder(
  exerciseName: string,
  frequency: 'daily' | 'weekly',
  hour: number = 9
): Promise<string> {
  const trigger: Notifications.NotificationTriggerInput =
    frequency === 'daily'
      ? {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute: 0,
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 1,
          hour,
          minute: 0,
        };

  return scheduleLocalNotification({
    title: 'Lembrete de Exercício',
    body: `Não se esqueça de fazer seus exercícios: ${exerciseName}`,
    data: { type: 'exercise', exerciseName },
    trigger,
  });
}

export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Badge count helpers
 */
export async function setBadgeCount(count: number): Promise<void> {
  if (Platform.OS === 'ios') {
    await Notifications.setBadgeCountAsync(count);
  }
}

export async function getBadgeCount(): Promise<number> {
  if (Platform.OS === 'ios') {
    return await Notifications.getBadgeCountAsync();
  }
  return 0;
}

/**
 * Helper functions
 */
export function formatNotificationTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 0) return 'Agora';
  if (minutes < 60) return `Em ${minutes} minutos`;
  if (hours < 24) return `Em ${hours} horas`;
  return `Em ${days} dias`;
}

export async function sendTestNotification(): Promise<void> {
  await scheduleLocalNotification({
    title: 'FisioFlow',
    body: 'Teste de notificação funcionando!',
    data: { type: 'test' },
  });
}

/**
 * Get notification icon for Android
 * Note: Using main notification icon for all types until specific icons are created
 */
export function getNotificationIcon(type: 'exercise' | 'appointment' | 'evolution' | 'general'): number {
  // For now, use the same icon for all types
  // TODO: Create specific icons for each notification type
  return notificationIcon;
}
