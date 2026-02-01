/**
 * Push Notification Manager
 * Handles local and push notifications using Expo
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'appointment' | 'patient_message' | 'protocol_update' | 'system' | 'reminder';
  title: string;
  body: string;
  data?: Record<string, any>;
  scheduledAt?: Date;
  channelId?: string;
}

export interface AppointmentReminderData {
  appointmentId: string;
  patientId: string;
  patientName: string;
  appointmentTime: Date;
  location?: string;
}

export interface NotificationSettings {
  appointments: boolean;
  reminders: boolean;
  patientMessages: boolean;
  protocolUpdates: boolean;
  system: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
}

const DEFAULT_SETTINGS: NotificationSettings = {
  appointments: true,
  reminders: true,
  patientMessages: true,
  protocolUpdates: true,
  system: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
};

class NotificationManager {
  private pushToken: string | null = null;
  private listeners: Set<() => void> = new Set();
  private foregroundSubscription: Notifications.Subscription | null = null;
  private responseSubscription: Notifications.Subscription | null = null;
  private navigationCallback: ((data: any) => void) | null = null;

  /**
   * Initialize notifications
   */
  async initialize(userId: string): Promise<boolean> {
    try {
      // Check if device supports notifications
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return false;
      }

      // Check permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }

      // Get project ID from app config
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ||
                       Constants.easConfig?.projectId;

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      this.pushToken = tokenData.data;

      // Save token to Firestore
      await this.savePushToken(userId, this.pushToken);

      // Setup notification listeners
      this.setupListeners(userId);

      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  /**
   * Set navigation callback for handling notification taps
   */
  setNavigationCallback(callback: (data: any) => void) {
    this.navigationCallback = callback;
  }

  /**
   * Setup notification listeners
   */
  private setupListeners(userId: string) {
    // Listen for notifications received while app is foregrounded
    this.foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        this.handleForegroundNotification(notification);
      }
    );

    // Listen for notification responses (user tapped)
    this.responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        this.handleNotificationResponse(response, userId);
      });
  }

  /**
   * Handle notification received while app is in foreground
   */
  private handleForegroundNotification(notification: Notifications.Notification) {
    const data = notification.request.content.data;

    // Show in-app notification or update UI
    this.notifyListeners();

    // Optionally play sound or vibrate
    if (data.type !== 'system') {
      // Don't vibrate for system notifications
    }
  }

  /**
   * Handle notification response (user tapped)
   */
  private handleNotificationResponse(
    response: Notifications.NotificationResponse,
    userId: string
  ) {
    const data = response.notification.request.content.data;

    // Use navigation callback if set
    if (this.navigationCallback) {
      this.navigationCallback(data);
    }

    // Mark as read in Firestore (note: notification IDs are ephemeral for local notifications)
    // For push notifications, the ID would be in the data payload
    if (data.notificationId) {
      this.markAsRead(userId, data.notificationId);
    }
  }

  /**
   * Save push token to Firestore
   */
  private async savePushToken(userId: string, token: string) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushToken: token,
        pushTokenUpdatedAt: new Date(),
        platform: Platform.OS,
      });
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(data: NotificationData): Promise<string | null> {
    try {
      const trigger: Notifications.NotificationTriggerInput = data.scheduledAt
        ? {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: data.scheduledAt,
          }
        : null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: {
            ...data.data,
            type: data.type,
          },
          sound: 'default',
          badge: 1,
          categoryId: data.channelId || 'default',
        },
        trigger,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      return null;
    }
  }

  /**
   * Send a push notification via Firebase Cloud Functions
   */
  async sendPushNotification(
    recipientUserId: string,
    data: NotificationData
  ): Promise<boolean> {
    try {
      // Get recipient's push token
      const userDoc = await getDoc(doc(db, 'users', recipientUserId));
      if (!userDoc.exists()) {
        return false;
      }

      const pushToken = userDoc.data()?.pushToken;
      if (!pushToken) {
        return false;
      }

      // Check quiet hours
      const settings = await this.getNotificationSettings(recipientUserId);
      if (this.isQuietHours(settings)) {
        console.log('Quiet hours - skipping notification');
        return false;
      }

      // Send notification via push API
      await this.callPushAPI({
        to: pushToken,
        title: data.title,
        body: data.body,
        data: {
          ...data.data,
          type: data.type,
        },
        sound: 'default',
      });

      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Call Expo Push API directly
   * In production, this should go through your backend Cloud Function
   */
  private async callPushAPI(message: any) {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Accept-encoding': 'gzip, deflate',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Push API error:', errorText);
      }
    } catch (error) {
      console.error('Error calling push API:', error);
    }
  }

  /**
   * Schedule appointment reminder
   */
  async scheduleAppointmentReminder(
    userId: string,
    data: AppointmentReminderData
  ): Promise<void> {
    // Reminder 24 hours before
    const oneDayBefore = new Date(data.appointmentTime);
    oneDayBefore.setHours(oneDayBefore.getHours() - 24);

    await this.scheduleLocalNotification({
      type: 'reminder',
      title: 'Lembrete de Consulta',
      body: `Você tem uma consulta com ${data.patientName} amanhã às ${this.formatTime(
        data.appointmentTime
      )}`,
      data: {
        appointmentId: data.appointmentId,
        patientId: data.patientId,
      },
      scheduledAt: oneDayBefore,
    });

    // Reminder 1 hour before
    const oneHourBefore = new Date(data.appointmentTime);
    oneHourBefore.setHours(oneHourBefore.getHours() - 1);

    await this.scheduleLocalNotification({
      type: 'reminder',
      title: 'Consulta em breve',
      body: `Consulta com ${data.patientName} em 1 hora${data.location ? ` em ${data.location}` : ''}`,
      data: {
        appointmentId: data.appointmentId,
        patientId: data.patientId,
      },
      scheduledAt: oneHourBefore,
    });
  }

  /**
   * Cancel scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  /**
   * Get notification settings
   */
  async getNotificationSettings(userId: string): Promise<NotificationSettings> {
    try {
      const settingsDoc = await getDoc(doc(db, 'users', userId, 'settings', 'notifications'));
      if (settingsDoc.exists()) {
        return settingsDoc.data() as NotificationSettings;
      }
    } catch (error) {
      console.error('Error getting notification settings:', error);
    }
    return DEFAULT_SETTINGS;
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    userId: string,
    settings: Partial<NotificationSettings>
  ): Promise<void> {
    try {
      const settingsRef = doc(db, 'users', userId, 'settings', 'notifications');
      await setDoc(settingsRef, settings, { merge: true });
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private isQuietHours(settings: NotificationSettings): boolean {
    if (!settings.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = settings.quietHours.start.split(':').map(Number);
    const [endHour, endMinute] = settings.quietHours.end.split(':').map(Number);

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    // Handle case where quiet hours span midnight
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }

    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * Mark notification as read
   */
  private async markAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      // For local notifications, we can't mark them as read in the same way
      // This would be used for push notifications stored in Firestore
      const notificationRef = doc(
        db,
        'users',
        userId,
        'notifications',
        notificationId
      );
      await updateDoc(notificationRef, { read: true, readAt: new Date() });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Get unread notification count from Firestore
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'users', userId, 'notifications'),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Clear badge count
   */
  async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    });
  }

  /**
   * Format time for display
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.foregroundSubscription) {
      this.foregroundSubscription.remove();
      this.foregroundSubscription = null;
    }
    if (this.responseSubscription) {
      this.responseSubscription.remove();
      this.responseSubscription = null;
    }
    this.listeners.clear();
    this.navigationCallback = null;
  }
}

// Singleton instance
let notificationManagerInstance: NotificationManager | null = null;

export function getNotificationManager(): NotificationManager {
  if (!notificationManagerInstance) {
    notificationManagerInstance = new NotificationManager();
  }
  return notificationManagerInstance;
}

export function destroyNotificationManager() {
  if (notificationManagerInstance) {
    notificationManagerInstance.destroy();
    notificationManagerInstance = null;
  }
}
