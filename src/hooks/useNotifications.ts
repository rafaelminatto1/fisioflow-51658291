/**
 * useNotifications - Migrated to Firebase
 *
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, addDoc, updateDoc, query as firestoreQuery, where, onSnapshot, writeBatch, QueryDocumentSnapshot, db } from '@/integrations/firebase/app';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { normalizeFirestoreData } from '@/utils/firestoreData';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  type: 'info' | 'success' | 'warning' | 'error' | 'appointment' | 'payment' | 'whatsapp' | 'waitlist';
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Helper: Convert Firestore doc to Notification
const convertDocToNotification = (doc: QueryDocumentSnapshot): Notification => {
  const data = normalizeFirestoreData(doc.data());
  return {
    id: doc.id,
    ...data,
  } as Notification;
};

const isPermissionDeniedError = (error: unknown): boolean => {
  const code = (error as { code?: string })?.code;
  const message = (error as Error)?.message?.toLowerCase?.() ?? '';
  return (
    code === 'permission-denied' ||
    code === 'failed-precondition' ||
    message.includes('insufficient permissions') ||
    message.includes('requires an index')
  );
};

export const useNotifications = (limitValue = 10) => {
  const { user } = useAuth();
  const userId = user?.uid;
  const queryClient = useQueryClient();
  const [realtimeNotifications, setRealtimeNotifications] = useState<Notification[]>([]);
  const [realtimeDisabled, setRealtimeDisabled] = useState(false);

  useEffect(() => {
    setRealtimeNotifications([]);
    setRealtimeDisabled(false);
  }, [userId]);

  // Fetch notifications
  const { data: notificationsData, isLoading, refetch } = useQuery({
    queryKey: ['notifications', userId, limitValue],
    queryFn: async () => {
      if (!userId) return [];

      try {
        const q = firestoreQuery(
          collection(db, 'notifications'),
          where('user_id', '==', userId)
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs
          .map(convertDocToNotification)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limitValue);
        return data;
      } catch (error) {
        if (isPermissionDeniedError(error)) {
          logger.warn('[useNotifications] Sem permissão para listar notificações', error, 'useNotifications');
          return [];
        }
        logger.warn('[useNotifications] Falha ao carregar notificações', error, 'useNotifications');
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // Update realtime notifications when query data changes
  useEffect(() => {
    if (!notificationsData) {
      setRealtimeNotifications((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    setRealtimeNotifications((prev) => {
      if (prev.length === notificationsData.length) {
        const unchanged = prev.every((item, index) => {
          const incoming = notificationsData[index];
          return (
            incoming &&
            item.id === incoming.id &&
            item.is_read === incoming.is_read &&
            item.created_at === incoming.created_at
          );
        });
        if (unchanged) return prev;
      }
      return notificationsData;
    });
  }, [notificationsData]);

  // Count unread notifications
  const unreadCount = realtimeNotifications.filter((n) => !n.is_read).length;

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;

      // First, fetch all unread notifications
      const q = firestoreQuery(
        collection(db, 'notifications'),
        where('user_id', '==', userId),
        where('is_read', '==', false)
      );

      const snapshot = await getDocs(q);

      // Use batch to update all (max 500 operations per batch)
      const batchSize = 500;
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = snapshot.docs.slice(i, i + batchSize);

        chunk.forEach((doc) => {
          batch.update(doc.ref, { is_read: true });
        });

        await batch.commit();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Todas notificações marcadas como lidas');
    },
  });

  // Real-time subscription using Firestore onSnapshot
  useEffect(() => {
    if (!userId || realtimeDisabled) return;

    const q = firestoreQuery(
      collection(db, 'notifications'),
      where('user_id', '==', userId)
    );

    let isInitialSnapshot = true;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs
          .map(convertDocToNotification)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limitValue);
        setRealtimeNotifications(docs);

        if (isInitialSnapshot) {
          isInitialSnapshot = false;
          return;
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type !== 'added') return;
          const newNotification = convertDocToNotification(change.doc);
          toast(newNotification.title, {
            description: newNotification.message,
          });
        });
      },
      (error) => {
        if (isPermissionDeniedError(error)) {
          logger.warn('Real-time notifications permission denied; desativando listener', error, 'useNotifications');
          setRealtimeDisabled(true);
          setRealtimeNotifications([]);
          return;
        }
        logger.error('Real-time notifications error', error, 'useNotifications');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId, limitValue, realtimeDisabled]);

  return {
    notifications: realtimeNotifications,
    unreadCount,
    isLoading,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
};

// Helper function to create notifications (can be used in cloud functions or client)
export const createNotification = async (params: {
  userId: string;
  type: Notification['type'];
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}) => {
  const notificationData = {
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link || null,
    metadata: params.metadata || {},
    is_read: false,
    created_at: new Date().toISOString(),
  };

  await addDoc(collection(db, 'notifications'), notificationData);
};
