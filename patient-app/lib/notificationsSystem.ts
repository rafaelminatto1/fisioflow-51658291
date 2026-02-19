/**
 * Notifications System - Patient App
 * Handles push notifications setup and management
 */

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import notificationIcon from '@/assets/notification-icon.png';
import { auth, db } from '@/lib/firebase';

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

/**
 * Register push token and save to Firestore
 */
export async function registerPushToken(
  userId: string,
  appVersion: string = '1.0.0'
): Promise<string | null> {
  try {
    // Check if platform supports push notifications
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    // Get notification permissions
    const permission = await requestNotificationPermissions();
    if (!permission.granted) {
      console.log('Notification permission not granted');
      return null;
    }

    // Get the push token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '8e006901-c021-464d-bbcd-96d821ab62d0', // EAS Project ID
    });

    const tokenData: PushToken = {
      token: token.data,
      platform: Platform.OS as 'ios' | 'android',
      appVersion,
      deviceName: Device.deviceName,
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
          pushTokens: arrayUnion([tokenData]),
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

    console.log('Push token registered:', token.data);
    return token.data;
  } catch (error) {
    console.error('Error registering push token:', error);
    return null;
  }
}

/**
 * Listen for notification responses
 */
export function useNotificationResponse() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      console.log('Notification response:', response);

      // Handle notification tap
      if (response.notification.request.content.data?.route) {
        // Navigate to specific route
        // router.push(response.notification.request.content.data.route);
        console.log('Navigate to:', response.notification.request.content.data.route);
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
      console.log('Notification received:', notification);

      // Show in-app notification
      // You can update UI, play sound, vibrate, etc.
      if (notification.request.content.title) {
        // Show alert or update UI
        console.log('Title:', notification.request.content.title);
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
    status: 'undetermined',
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
    const tokenResult = await Notifications.getExpoPushTokenAsync({
      projectId: '8e006901-c021-464d-bbcd-96d821ab62d0',
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

    console.log('Push token cleared');
  } catch (error) {
    console.error('Error clearing push token:', error);
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
  // Create notification channels (Android)
  await createNotificationChannel();

  // Set notification handler for when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  // Listen for token updates (when token changes)
  Notifications.addPushTokenListener(async (token) => {
    if (auth.currentUser?.uid) {
      await registerPushToken(auth.currentUser.uid);
      console.log('Push token updated:', token.data);
    }
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
