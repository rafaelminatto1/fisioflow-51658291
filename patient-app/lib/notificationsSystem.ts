import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { authClient } from './neonAuth';
import { notificationsApi } from './api';
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
let isRegistering = false;
let lastRegistrationTime = 0;

function getExpoProjectId(): string | undefined {
  return (
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ||
    (Constants.easConfig?.projectId as string | undefined)
  );
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await authClient.getSession();
    return (session as any)?.data?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    log.info('Push notifications only work on physical devices');
    return null;
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    log.error('Expo projectId not found. Check app.json extra.eas.projectId.');
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (error: any) {
    if (error.message?.includes('Keychain access failed')) {
      log.warn('Keychain error during push token registration. Skipping.');
      return null;
    }
    throw error;
  }
}

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

export async function registerPushToken(
  userId: string,
  appVersion: string = '1.0.0',
): Promise<string | null> {
  try {
    if (!userId) {
      log.warn('Cannot register push token without userId');
      return null;
    }

    const now = Date.now();
    if (isRegistering || now - lastRegistrationTime < 10000) {
      return null;
    }

    isRegistering = true;
    lastRegistrationTime = now;

    const permission = await requestNotificationPermissions();
    if (!permission.granted) {
      isRegistering = false;
      return null;
    }

    const token = await getExpoPushToken();
    if (!token) {
      isRegistering = false;
      return null;
    }

    await notificationsApi.registerFcmToken({
      token,
      userId,
      deviceInfo: {
        platform: Platform.OS,
        model: Device.modelName,
        osVersion: Device.osVersion,
        appVersion,
        deviceName: Device.deviceName,
      },
      active: true,
    });

    isRegistering = false;
    return token;
  } catch (error) {
    log.error('Error registering push token:', error);
    isRegistering = false;
    return null;
  }
}

export function useNotificationResponse() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      log.info('Notification response:', response);
      if (response.notification.request.content.data?.route) {
        log.info('Navigate to:', response.notification.request.content.data.route);
      }
    });

    return () => subscription.remove();
  }, []);
}

export function useNotificationReceived() {
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      log.info('Notification received:', notification);
    });

    return () => subscription.remove();
  }, []);
}

export function usePatientNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    canAskAgain: true,
    status: Notifications.PermissionStatus.UNDETERMINED,
  });
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
      const userId = await getCurrentUserId();
      if (userId) {
        const pushToken = await registerPushToken(userId);
        setToken(pushToken);
      }
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

export async function clearPushToken(userId: string): Promise<void> {
  try {
    if (!userId) return;

    const token = await getExpoPushToken();
    if (!token) return;

    await notificationsApi.deactivateFcmToken(token);
    log.info('Push token cleared');
  } catch (error) {
    log.error('Error clearing push token:', error);
  }
}

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

export async function initializeNotifications(): Promise<void> {
  const isExpoGo = Constants.executionEnvironment === 'storeClient';
  if (isExpoGo) {
    log.info('Notifications: Skipping native initialization in Expo Go');
    return;
  }

  await createNotificationChannel();

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  Notifications.addPushTokenListener(async () => {
    const userId = await getCurrentUserId();
    if (userId) {
      await registerPushToken(userId);
    }
  });
}

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

export async function scheduleLocalNotification(notification: {
  title: string;
  body: string;
  data?: Record<string, any>;
  trigger?: Notifications.NotificationTriggerInput;
}): Promise<string> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: 'default',
      },
      trigger: notification.trigger || null,
    });
  } catch (error) {
    log.error('Error scheduling notification:', error);
    throw error;
  }
}

export async function scheduleAppointmentReminder(
  appointmentId: string,
  patientName: string,
  appointmentDate: Date,
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
  hour: number = 9,
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
