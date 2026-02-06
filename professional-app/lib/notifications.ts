
// Configure notification behavior

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getMessaging, getToken } from 'firebase/messaging';
import { app } from './firebase';

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
      lightColor: '#1E40AF',
    });

    // Appointment notifications channel
    await Notifications.setNotificationChannelAsync('appointments', {
      name: 'Agendamentos',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1E40AF',
    });

    // Patient messages channel
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Mensagens',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1E40AF',
    });

    // System alerts channel
    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Alertas',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 100, 250, 100, 250],
      lightColor: '#EF4444',
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
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID || 'fisioflow-professional';
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;

      console.log('Expo Push Token:', token);

      // Also get FCM token for Firebase Cloud Messaging
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
  channelId?: string;
}): Promise<string> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: 'default',
        channelId: notification.channelId,
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
    title: 'Lembrete de Atendimento',
    body: `Sessão com ${patientName} em 1 hora.`,
    data: { type: 'appointment', appointmentId },
    trigger: reminderDate,
    channelId: 'appointments',
  });
}

export async function sendNewAppointmentAlert(
  patientName: string,
  appointmentTime: Date
): Promise<string> {
  return scheduleLocalNotification({
    title: 'Novo Agendamento',
    body: `${patientName} agendou para ${formatDate(appointmentTime)}`,
    data: { type: 'new_appointment' },
    channelId: 'appointments',
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

export function formatDate(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
    title: 'FisioFlow Pro',
    body: 'Teste de notificação funcionando!',
    data: { type: 'test' },
  });
}

// ============================================
// CLOUD MESSAGING (Firebase FCM)
// ============================================

export async function sendPushNotification(
  targetToken: string,
  notification: PushNotificationData
): Promise<void> {
  // This would typically call your Cloud Function to send FCM notification
  // For now, we'll store it locally or call an API endpoint
  console.log('Sending push notification:', notification);

  // Example implementation would call:
  // await fetch('https://your-cloud-function-url/sendPush', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     token: targetToken,
  //     notification,
  //   }),
  // });
}

export async function sendAppointmentNotificationToPatient(
  patientPushToken: string,
  appointmentDetails: {
    date: Date;
    type: string;
    professionalName: string;
  }
): Promise<void> {
  await sendPushNotification(patientPushToken, {
    title: 'Novo Agendamento',
    body: `Sua sessão de ${appointmentDetails.type} com ${appointmentDetails.professionalName} foi agendada.`,
    data: {
      type: 'appointment',
      date: appointmentDetails.date.toISOString(),
    },
    sound: true,
    priority: 'high',
  });
}

export async function sendExerciseReminderNotification(
  patientPushToken: string,
  exerciseName: string
): Promise<void> {
  await sendPushNotification(patientPushToken, {
    title: 'Lembrete de Exercício',
    body: `Não se esqueça de fazer: ${exerciseName}`,
    data: {
      type: 'exercise_reminder',
      exerciseName,
    },
    sound: true,
  });
}
