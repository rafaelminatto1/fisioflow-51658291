
/**
 * Hook que escuta o Firebase Realtime DB para saber quando atualizar a agenda.
 * Substitui o Ably para sinalização de refresh.
 * Se o Realtime Database não estiver configurado/disponível no projeto Firebase,
 * o hook não faz nada (a agenda continua funcionando via Firestore).
 */

import { useEffect } from 'react';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { useQueryClient } from '@tanstack/react-query';
import { app } from '@/integrations/firebase/app';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { fisioLogger as logger } from '@/lib/errors/logger';

export const useRealtimeAppointments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const orgId = localStorage.getItem('fisioflow_org_id') || 'default';
    if (!user || !orgId) return;

    let db;
    try {
      db = getDatabase(app);
    } catch (error) {
      // Realtime Database não configurado ou indisponível (ex.: projeto só com Firestore)
      logger.debug(
        'Realtime Database não disponível; agenda usa apenas Firestore',
        error instanceof Error ? error.message : undefined,
        'useRealtimeAppointments'
      );
      return;
    }

    // Escuta o nó de "gatilho" da agenda dessa organização
    const triggerRef = ref(db, `orgs/${orgId}/agenda/refresh_trigger`);

    const unsubscribe = onValue(triggerRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        logger.debug('[Realtime] Agenda refresh signal received', val, 'useRealtimeAppointments');
        queryClient.invalidateQueries({ queryKey: ['appointments_v2'] });
        const now = Date.now();
        if (val._timestamp && (now - val._timestamp < 5000)) {
          toast({
            title: 'Agenda atualizada',
            description: 'Novos dados sincronizados em tempo real.',
            duration: 2000,
          });
        }
      }
    });

    return () => {
      off(triggerRef, 'value', unsubscribe);
    };
  }, [user, queryClient, toast]);
};
