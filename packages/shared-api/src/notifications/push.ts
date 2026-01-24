import { messaging, getToken, onMessage, NotificationPayload } from 'firebase/messaging';
import { Platform } from 'react-native';
import { db } from '../firebase/config';

// Request notification permissions
export async function requestNotificationPermissions() {
  if (!Platform.OS === 'web') {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('Notification permissions not granted');
      return false;
    }
  }

  return true;
}

// Get FCM token
export async function getFCMToken(): Promise<string | null> {
  try {
    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    // Get FCM token
    const token = await getToken();
    if (!token) {
      console.log('No FCM token available');
      return null;
    }

    // TODO: Save token to Firestore for the user
    // This allows sending push notifications to specific users

    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

// Listen for messages when app is in foreground
export function setupForegroundMessageHandler() {
  const unsubscribe = onMessage(async (remoteMessage: NotificationPayload) => {
    console.log('Received foreground message:', remoteMessage);

    // Handle different types of notifications
    const { notification, data } = remoteMessage;

    if (notification) {
      // Show local notification
      // TODO: Display in-app notification or navigation
      const { title, body } = notification;

      // You could use expo-notifications to show a local notification
      // or navigate to a specific screen based on the notification type
    }

    if (data) {
      // Handle data-only messages
      handleDataMessage(data);
    }
  });

  return unsubscribe;
}

// Handle data-only messages (silent push)
function handleDataMessage(data: any) {
  const { type, ...params } = data;

  switch (type) {
    case 'NEW_APPOINTMENT':
      // Refresh appointments list
      // Could trigger a global event or update a specific store
      break;

    case 'APPOINTMENT_REMINDER':
      // Show reminder UI
      break;

    case 'EXERCICE_REMINDER':
      // Navigate to exercises screen
      break;

    case 'NEW_MESSAGE':
      // Update badge count
      break;

    case 'LOW_ADHERENCE_ALERT':
      // Show alert to professional
      break;

    default:
      console.log('Unknown message type:', type);
  }
}

// Send push notification to a user (Cloud Function)
export async function sendPushNotification(
  userId: string,
  data: {
    title: string;
    body: string;
    type?: string;
    [key: string]: any;
  }
): Promise<void> {
  // This would be called from a Cloud Function
  // The Cloud Function would use the FCM token stored for the user

  try {
    // Call your Cloud Function endpoint
    // await fetch('https://your-cloud-function-url/sendPush', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userId, data }),
    // });

    console.log('Push notification sent to user:', userId);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

// Send daily exercise reminder to patients
export async function sendExerciseReminder(patientId: string, patientName: string): Promise<void> {
  await sendPushNotification(patientId, {
    title: 'Hora do exercício! 🏃',
    body: `Olá ${patientName}! Não esqueça de fazer seus exercícios de hoje.`,
    type: 'EXERCISE_REMINDER',
    screen: 'exercises',
  });
}

// Send appointment reminder
export async function sendAppointmentReminder(
  userId: string,
  appointmentData: {
    patientName: string;
    time: string;
    type: string;
  }
): Promise<void> {
  await sendPushNotification(userId, {
    title: 'Lembrete de consulta 📅',
    body: `Consulta com ${appointmentData.patientName} às ${appointmentData.time} - ${appointmentData.type}`,
    type: 'APPOINTMENT_REMINDER',
    screen: 'appointments',
  });
}

// Send low adherence alert to professional
export async function sendLowAdherenceAlert(
  professionalId: string,
  patientData: {
    patientName: string;
    adherenceRate: number;
  }
): Promise<void> {
  await sendPushNotification(professionalId, {
    title: 'Alerta de Baixa Adesão ⚠️',
    body: `${patientData.patientName} está com apenas ${adherenceRate}% de adesão esta semana.`,
    type: 'LOW_ADHERENCE_ALERT',
    screen: 'patients',
    patientId: patientData.patientName,
  });
}

// Register device for push notifications
export async function registerDeviceForPush(userId: string): Promise<void> {
  try {
    const token = await getFCMToken();
    if (!token) {
      return;
    }

    // Save device token to Firestore
    const deviceId = await getDeviceId();

    await setDoc(doc(db, 'userDevices', deviceId), {
      userId,
      token,
      platform: Platform.OS,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error registering device for push:', error);
  }
}

// Get device ID (using expo-constants or a generated UUID)
async function getDeviceId(): Promise<string> {
  // Use expo-constants.deviceId or generate a unique ID
  // For simplicity, generating a UUID
  // In production, use expo-device or expo-constants
  return 'device_' + Math.random().toString(36).substring(2, 15);
}

import { doc, setDoc } from 'firebase/firestore';
