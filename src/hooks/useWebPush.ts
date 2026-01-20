/**
 * Web Push Notifications Hook
 *
 * Manages browser push notifications:
 * - Request permission
 * - Subscribe/unsubscribe
 * - Handle incoming push events
 * - Sync with Supabase
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface PushSubscriptionState {
  permission: NotificationPermission;
  supported: boolean;
  subscribed: boolean;
  subscription: PushSubscription | null;
  loading: boolean;
  error: string | null;
}

export interface UseWebPushOptions {
  autoSubscribe?: boolean;
  onSubscriptionChange?: (subscribed: boolean) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// VAPID KEY CONFIGURATION
// ============================================================================

// In production, this should come from environment variables
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/**
 * Convert base64 string to Uint8Array for VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// ============================================================================
// HOOK
// ============================================================================

export function useWebPush(options: UseWebPushOptions = {}) {
  const { autoSubscribe = false, onSubscriptionChange, onError } = options;

  const [state, setState] = useState<PushSubscriptionState>({
    permission: 'default',
    supported: 'serviceWorker' in navigator && 'PushManager' in window,
    subscribed: false,
    subscription: null,
    loading: false,
    error: null,
  });

  /**
   * Initialize push notification support check
   */
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      const permission = supported ? Notification.permission : 'denied';

      setState((prev) => ({
        ...prev,
        supported,
        permission,
      }));

      // If already subscribed, get the subscription
      if (supported) {
        await refreshSubscription();
      }
    };

    checkSupport();
  }, []);

  /**
   * Auto-subscribe if enabled and not subscribed
   */
  useEffect(() => {
    if (autoSubscribe && state.supported && state.permission === 'default' && !state.subscribed) {
      requestPermission();
    }
  }, [autoSubscribe, state.supported, state.permission, state.subscribed]);

  /**
   * Request notification permission
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!state.supported) {
      const error = new Error('Push notifications not supported');
      setState((prev) => ({ ...prev, error: error.message }));
      onError?.(error);
      return 'denied';
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const permission = await Notification.requestPermission();

      setState((prev) => ({ ...prev, permission, loading: false }));

      if (permission === 'granted') {
        await subscribe();
      }

      return permission;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request permission';
      setState((prev) => ({ ...prev, error: errorMessage, loading: false }));
      onError?.(error as Error);
      return 'denied';
    }
  }, [state.supported, onError]);

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async (): Promise<PushSubscription | null> => {
    if (!state.supported || state.permission !== 'granted') {
      const error = new Error('Permission not granted');
      setState((prev) => ({ ...prev, error: error.message }));
      onError?.(error);
      return null;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[useWebPush] Service Worker registered');

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Save subscription to Supabase
      await saveSubscriptionToSupabase(subscription);

      setState((prev) => ({
        ...prev,
        subscribed: true,
        subscription,
        loading: false,
      }));

      onSubscriptionChange?.(true);

      return subscription;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to subscribe';
      setState((prev) => ({ ...prev, error: errorMessage, loading: false }));
      onError?.(error as Error);
      return null;
    }
  }, [state.supported, state.permission, onSubscriptionChange, onError]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      if (state.subscription) {
        await state.subscription.unsubscribe();
      }

      // Remove from Supabase
      await removeSubscriptionFromSupabase();

      setState((prev) => ({
        ...prev,
        subscribed: false,
        subscription: null,
        loading: false,
      }));

      onSubscriptionChange?.(false);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unsubscribe';
      setState((prev) => ({ ...prev, error: errorMessage, loading: false }));
      onError?.(error as Error);
      return false;
    }
  }, [state.subscription, onSubscriptionChange, onError]);

  /**
   * Refresh current subscription state
   */
  const refreshSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      const subscribed = !!subscription;

      setState((prev) => ({
        ...prev,
        subscribed,
        subscription: subscription || null,
      }));

      onSubscriptionChange?.(subscribed);
    } catch (error) {
      console.error('[useWebPush] Failed to refresh subscription:', error);
    }
  }, [onSubscriptionChange]);

  /**
   * Save push subscription to Supabase
   */
  const saveSubscriptionToSupabase = async (subscription: PushSubscription): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const subscriptionData = subscription.toJSON();

      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscriptionData.endpoint,
        keys_p256dh: subscriptionData.keys?.p256dh,
        keys_auth: subscriptionData.keys?.auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[useWebPush] Failed to save subscription:', error);
      throw error;
    }
  };

  /**
   * Remove push subscription from Supabase
   */
  const removeSubscriptionFromSupabase = async (): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);
    } catch (error) {
      console.error('[useWebPush] Failed to remove subscription:', error);
      throw error;
    }
  };

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    refreshSubscription,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Get current permission status
 */
export function getPermissionStatus(): NotificationPermission {
  if (!isPushNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Test notification (for development)
 */
export async function testNotification(): Promise<void> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications not supported');
  }

  if (Notification.permission !== 'granted') {
    throw new Error('Permission not granted');
  }

  // Send via service worker
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    throw new Error('Service worker not registered');
  }

  // Use a simple notification for testing
  new Notification('FisioFlow Test', {
    body: 'This is a test notification from FisioFlow!',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/badge-72x72.svg',
    tag: 'test-notification',
  });
}

/**
 * Send push notification via API
 */
export async function sendPushNotification(data: {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
}): Promise<void> {
  await fetch('/api/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/**
 * Broadcast notification to all subscribed users
 */
export async function broadcastNotification(data: {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
}): Promise<void> {
  await fetch('/api/push/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
