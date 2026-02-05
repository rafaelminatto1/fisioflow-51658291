import { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query as firestoreQuery, where, addDoc, deleteDoc } from '@/integrations/firebase/app';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/app';

/**
 * usePushNotifications - Migrated to Firebase
 */

export interface PushSubscription {
  id: string;
  user_id: string;
  organization_id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_info?: {
    userAgent: string;
    platform: string;
  };
  active: boolean;
  created_at: string;
}

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

      const q = firestoreQuery(
        collection(db, 'push_subscriptions'),
        where('user_id', '==', user.uid),
        where('active', '==', true)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      const profileData = profileDoc.exists() ? profileDoc.data() : null;
      const endpoint = subscriptionJson.endpoint!;

      // Use endpoint as ID or composite ID to prevent duplicates if possible, 
      // but here we just query to check existence or use a generated ID with where clause.
      // Better strategy: Use a hash of endpoint as ID, or just query first.

      // We will check if it exists:
      const q = firestoreQuery(collection(db, 'push_subscriptions'), where('user_id', '==', user.uid), where('endpoint', '==', endpoint));
      const existingSnap = await getDocs(q);

      const subscriptionData = {
        user_id: user.uid,
        organization_id: profileData?.organization_id,
        endpoint: endpoint,
        p256dh: subscriptionJson.keys?.p256dh || '',
        auth: subscriptionJson.keys?.auth || '',
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        },
        active: true,
        updated_at: new Date().toISOString()
      };

      if (!existingSnap.empty) {
        // Update existing
        const docRef = existingSnap.docs[0].ref;
        await updateDoc(docRef, subscriptionData);
      } else {
        // Create new
        await addDoc(collection(db, 'push_subscriptions'), {
          ...subscriptionData,
          created_at: new Date().toISOString()
        });
      }

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
          const q = firestoreQuery(
            collection(db, 'push_subscriptions'),
            where('user_id', '==', user.uid),
            where('endpoint', '==', subscription.endpoint)
          );
          const existingSnap = await getDocs(q);

          if (!existingSnap.empty) {
            const docRef = existingSnap.docs[0].ref;
            await updateDoc(docRef, { active: false });
          }
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
