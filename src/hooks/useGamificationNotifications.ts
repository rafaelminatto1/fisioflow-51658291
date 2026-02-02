/**
 * useGamificationNotifications - Migrated to Firebase
 */

import { useEffect, useCallback, useRef } from 'react';
import { collection, query as firestoreQuery, where, orderBy, limit, onSnapshot, updateDoc, deleteDoc, doc, Unsubscribe, getDocs,  } from '@/integrations/firebase/app';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/use-toast';
import { db } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';

export type NotificationType = 'achievement' | 'level_up' | 'quest_complete' | 'streak_milestone' | 'reward_unlocked';

export interface GamificationNotification {
  id: string;
  patient_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  expires_at: string;
}

export interface UseGamificationNotificationsResult {
  notifications: GamificationNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refetch: () => void;
}

// Variantes de notificação para UI
const getNotificationVariant = (type: NotificationType): 'default' | 'destructive' => {
  const variants: Record<NotificationType, 'default' | 'destructive'> = {
    level_up: 'default',
    achievement: 'default',
    quest_complete: 'default',
    streak_milestone: 'default',
    reward_unlocked: 'default',
  };
  return variants[type] || 'default';
};

const NOTIFICATION_ICONS = {
  achievement: '🏆',
  level_up: '⬆️',
  streak_milestone: '🔥',
  quest_complete: '✅',
  reward_unlocked: '🎁',
};

export const useGamificationNotifications = (patientId?: string): UseGamificationNotificationsResult => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  // Buscar notificações
  const { data: notifications = [], isLoading, error, refetch } = useQuery({
    queryKey: ['gamification-notifications', patientId],
    queryFn: async () => {
      if (!patientId) return [];

      try {
        const q = firestoreQuery(
          collection(db, 'gamification_notifications'),
          where('patient_id', '==', patientId),
          orderBy('created_at', 'desc'),
          limit(50)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as GamificationNotification[];
      } catch (err) {
        logger.error('Failed to fetch notifications', err, 'useGamificationNotifications');
        toast({
          title: "Erro ao carregar notificações",
          description: "Tente novamente mais tarde",
          variant: "destructive"
        });
        throw err;
      }
    },
    enabled: !!patientId,
    staleTime: 1000 * 30, // 30 segundos
    retry: 1,
  });

  // Contagem de não lidas
  const unreadCount = notifications.filter(n => !n.read_at).length;

  // Marcar como lido
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'gamification_notifications', notificationId);
      await updateDoc(notificationRef, {
        read_at: new Date().toISOString(),
      });

      queryClient.invalidateQueries({ queryKey: ['gamification-notifications', patientId] });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível marcar a notificação como lida",
        variant: "destructive"
      });
      throw err;
    }
  }, [patientId, queryClient, toast]);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    if (!patientId) return;

    try {
      // Buscar todas não lidas
      const q = firestoreQuery(
        collection(db, 'gamification_notifications'),
        where('patient_id', '==', patientId),
        where('read_at', '==', null)
      );

      const snapshot = await getDocs(q);

      // Marcar cada uma como lida
      const updates = snapshot.docs.map(docSnap =>
        updateDoc(docSnap.ref, { read_at: new Date().toISOString() })
      );

      await Promise.all(updates);

      queryClient.invalidateQueries({ queryKey: ['gamification-notifications', patientId] });

      toast({
        title: "Sucesso",
        description: "Todas as notificações foram marcadas como lidas",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível marcar todas as notificações como lidas",
        variant: "destructive"
      });
      throw err;
    }
  }, [patientId, queryClient, toast]);

  // Deletar notificação
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'gamification_notifications', notificationId);
      await deleteDoc(notificationRef);

      queryClient.invalidateQueries({ queryKey: ['gamification-notifications', patientId] });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível deletar a notificação",
        variant: "destructive"
      });
      throw err;
    }
  }, [patientId, queryClient, toast]);

  // Realtime subscription para novas notificações (Firestore onSnapshot)
  useEffect(() => {
    if (!patientId) return;

    // Cleanup anterior
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Criar query para listener
    const q = firestoreQuery(
      collection(db, 'gamification_notifications'),
      where('patient_id', '==', patientId),
      orderBy('created_at', 'desc'),
      limit(50)
    );

    // Inscrever em mudanças
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newNotification = {
              id: change.doc.id,
              ...change.doc.data(),
            } as GamificationNotification;

            // Verificar se é uma notificação nova (nos últimos 5 segundos)
            const createdAt = new Date(newNotification.created_at);
            const now = new Date();
            const isRecent = (now.getTime() - createdAt.getTime()) < 5000;

            if (isRecent) {
              const icon = NOTIFICATION_ICONS[newNotification.type];

              // Mostrar toast imediatamente para novas notificações
              toast({
                title: `${icon} ${newNotification.title}`,
                description: newNotification.message,
                variant: getNotificationVariant(newNotification.type),
              });

              // Invalidar query para atualizar lista
              queryClient.invalidateQueries({ queryKey: ['gamification-notifications', patientId] });

              // Tocar som de notificação (se disponível)
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(newNotification.title, {
                  body: newNotification.message,
                  icon: '/favicon.ico',
                  tag: newNotification.id
                });
              }
            }
          }
        });

        // Sempre invalidar query quando houver mudanças
        queryClient.invalidateQueries({ queryKey: ['gamification-notifications', patientId] });
      },
      (error) => {
        logger.error('Realtime subscription error', error, 'useGamificationNotifications');
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [patientId, queryClient, toast]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch,
  };
};


