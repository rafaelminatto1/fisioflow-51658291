import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/errors/logger';
import { useAuth } from '@/contexts/AuthContext';
import { getFirebaseDb } from '@/integrations/firebase/app';
import { doc, getDoc } from 'firebase/firestore';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    setIsSupported('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window);

    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Fetch user's push subscriptions
  const { data: subscriptions } = useQuery({
    queryKey: ['push-subscriptions'],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.uid)
        .eq('active', true);

      if (error) throw error;
      return data;
    },
    enabled: !!user
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

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        // Note: In production, you'd use a VAPID public key from your server
        const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey
        });
      }

      const subscriptionJson = subscription.toJSON();

      // Save subscription to database
      if (!user) throw new Error('User not authenticated');

      const db = getFirebaseDb();
      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      const profileData = profileDoc.exists() ? profileDoc.data() : null;

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.uid,
          organization_id: profileData?.organization_id,
          endpoint: subscriptionJson.endpoint!,
          p256dh: subscriptionJson.keys?.p256dh || '',
          auth: subscriptionJson.keys?.auth || '',
          device_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
          },
          active: true,
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) throw error;

      return subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] });
      toast.success('Notificações push ativadas!');
    },
    onError: (error) => {
      logger.error('Erro ao inscrever em notificações push', error, 'usePushNotifications');
      toast.error('Erro ao ativar notificações');
    }
  });

  // Unsubscribe from push notifications
  const unsubscribe = useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Deactivate in database
        if (user) {
          await supabase
            .from('push_subscriptions')
            .update({ active: false })
            .eq('user_id', user.uid)
            .eq('endpoint', subscription.endpoint);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] });
      toast.success('Notificações desativadas');
    }
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
