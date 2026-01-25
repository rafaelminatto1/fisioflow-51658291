/**
 * useNotifications - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.auth.getUser() → getFirebaseAuth().currentUser
 * - supabase.from('notifications') → Firestore collection 'notifications'
 * - supabase.realtime → Firestore onSnapshot
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getFirebaseAuth, getFirebaseDb } from '@/integrations/firebase/app';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  QueryDocumentSnapshot
} from 'firebase/firestore';

const db = getFirebaseDb();
const auth = getFirebaseAuth();

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
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as Notification;
};

export const useNotifications = (limitValue = 10) => {
  const queryClient = useQueryClient();
  const [realtimeNotifications, setRealtimeNotifications] = useState<Notification[]>([]);

  // Fetch notifications
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications', limitValue],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return [];

      const q = query(
        collection(db, 'notifications'),
        where('user_id', '==', user.uid),
        orderBy('created_at', 'desc'),
        limit(limitValue)
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(convertDocToNotification);
      return data;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update realtime notifications when query data changes
  useEffect(() => {
    if (notifications.length > 0) {
      setRealtimeNotifications(notifications);
    }
  }, [notifications]);

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
      const user = auth.currentUser;
      if (!user) return;

      // First, fetch all unread notifications
      const q = query(
        collection(db, 'notifications'),
        where('user_id', '==', user.uid),
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
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc'),
      limit(limitValue)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(convertDocToNotification);
        setRealtimeNotifications(docs);

        // Check for new notifications (docChanges)
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newNotification = convertDocToNotification(change.doc);
            // Only show toast if it's a truly new notification (not initial load)
            if (snapshot.docChanges().length === 1) {
              toast(newNotification.title, {
                description: newNotification.message,
              });
            }
          }
        });

        // Invalidate queries to keep data in sync
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      },
      (error) => {
        console.error('Real-time notifications error:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [queryClient, limitValue]);

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
