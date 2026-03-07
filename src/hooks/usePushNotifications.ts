
/**
 * usePushNotifications - Migrated to Neon/Workers
 */

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { useAuth } from '@/contexts/AuthContext';
import { pushSubscriptionsApi } from '@/lib/api/workers-client';

type PushSubscriptionJSON = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export const usePushNotifications = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const { data: subscriptions } = useQuery({
    queryKey: ['push-subscriptions', user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const res = await pushSubscriptionsApi.list({ userId: user.uid, activeOnly: true });
      return res?.data ?? [];
    },
    enabled: !!user?.uid,
  });

  // Request notification permission
  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Notificações push não são suportadas neste navegador');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('Notificações ativadas!');
        return true;
      } else {
        toast.error('Permissão negada para notificações');
        return false;
      }
    } catch (error) {
      logger.error('Erro ao solicitar permissão de notificações', error, 'usePushNotifications');
      toast.error('Erro ao solicitar permissão');
      return false;
    }
  };

  // Subscribe to push notifications
  const subscribe = useMutation({
    mutationFn: async () => {
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) throw new Error('Permission not granted');
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        });
      }

      const subscriptionJson = subscription?.toJSON() as PushSubscriptionJSON;
      const endpoint = subscriptionJson?.endpoint;

      if (!endpoint) {
        throw new Error('Push endpoint not available');
      }

      await pushSubscriptionsApi.upsert({
        endpoint,
        userId: user.uid,
        organizationId: profile?.organization_id,
        p256dh: subscriptionJson.keys?.p256dh,
        auth: subscriptionJson.keys?.auth,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        },
        active: true,
      });

      return subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscriptions', user?.uid] });
      toast.success('Notificações push ativadas!');
    },
    onError: (error) => {
      logger.error('Erro ao inscrever em notificações push', error, 'usePushNotifications');
      toast.error('Erro ao ativar notificações');
    },
  });

  // Unsubscribe from push notifications
  const unsubscribe = useMutation({
    mutationFn: async () => {
      if (!user) return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) return;

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await pushSubscriptionsApi.deactivate(endpoint, user.uid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscriptions', user?.uid] });
      toast.success('Notificações desativadas');
    },
  });

  // Send a test notification
  const sendTestNotification = async () => {
    if (permission !== 'granted') {
      toast.error('Ative as notificações primeiro');
      return;
    }

    try {
      new Notification('FisioFlow', {
        body: 'Notificações funcionando corretamente!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'test-notification',
      });
    } catch (error) {
      logger.error('Erro ao enviar notificação de teste', error, 'usePushNotifications');
    }
  };

  return {
    isSupported,
    permission,
    subscriptions,
    isSubscribed: (subscriptions?.length || 0) > 0,
    requestPermission,
    subscribe: subscribe.mutate,
    unsubscribe: unsubscribe.mutate,
    isSubscribing: subscribe.isPending,
    sendTestNotification,
  };
};

export default usePushNotifications;
