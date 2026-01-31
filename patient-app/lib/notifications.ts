import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './firebase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ============================================
// TYPES
// ============================================

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | 'default_critical' | boolean;
  priority?: 'high' | 'normal' | 'max';
  channelId?: string;
}

// ============================================
// NOTIFICATION PERMISSIONS
// ============================================

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token: string | undefined;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0D9488',
    });

    // Appointment reminders channel
    await Notifications.setNotificationChannelAsync('appointments', {
      name: 'Agendamentos',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0D9488',
    });

    // Exercise reminders channel
    await Notifications.setNotificationChannelAsync('exercises', {
      name: 'Exercícios',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0D9488',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.error('Failed to get push token for push notification!');
      return undefined;
    }

    try {
      // Get Expo push token
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID || 'fisioflow-patient';
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;

      console.log('Expo Push Token:', token);

      // Also get FCM token for Firebase Cloud Messaging
      // Note: FCM requires additional setup with expo-dev-client
      if (Platform.OS === 'android') {
        try {
          const messaging = getMessaging(app);
          const fcmToken = await getToken(messaging);
          console.log('FCM Token:', fcmToken);
        } catch (fcmError) {
          console.log('FCM not available (requires expo-dev-client):', fcmError);
        }
      }
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  } else {
    console.error('Must use physical device for Push Notifications');
  }

  return token;
}

export async function getNotificationPermissionStatus(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ============================================
// LOCAL NOTIFICATIONS
// ============================================

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
    console.error('Error scheduling notification:', error);
    throw error;
  }
}

export async function scheduleAppointmentReminder(
  appointmentId: string,
  patientName: string,
  appointmentDate: Date
): Promise<string> {
  // Schedule reminder 1 hour before
  const reminderDate = new Date(appointmentDate.getTime() - 60 * 60 * 1000);

  return scheduleLocalNotification({
    title: 'Lembrete de Agendamento',
    body: `Olá ${patientName}! Você tem uma sessão de fisioterapia em 1 hora.`,
    data: { type: 'appointment', appointmentId },
    trigger: reminderDate,
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
          weekday: 1, // Monday
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

// ============================================
// NOTIFICATION LISTENERS
// ============================================

type NotificationListener = (notification: Notifications.Notification) => void;
type ResponseListener = (response: Notifications.NotificationResponse) => void;

let notificationListener: Notifications.Subscription | null = null;
let responseListener: Notifications.Subscription | null = null;

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
    Notifications.removeNotificationSubscription(notificationListener);
    notificationListener = null;
  }
  if (responseListener) {
    Notifications.removeNotificationSubscription(responseListener);
    responseListener = null;
  }
}

// ============================================
// BADGE COUNT
// ============================================

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

// ============================================
// HELPER FUNCTIONS
// ============================================

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
