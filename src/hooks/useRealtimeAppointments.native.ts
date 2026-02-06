
/**
 * Versão Native do Hook de Sincronização
 */

import { useEffect } from 'react';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { useQueryClient } from '@tanstack/react-query';
import { app } from '@/integrations/firebase/app';
import { useAuth } from '@/contexts/AuthContext';

export const useRealtimeAppointments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    // No mobile, pegamos o orgId do profile/context
    const orgId = 'default'; // Idealmente viria do context

    if (!user) return;

    const db = getDatabase(app);
    const triggerRef = ref(db, `orgs/${orgId}/agenda/refresh_trigger`);

    const unsubscribe = onValue(triggerRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        queryClient.invalidateQueries({ queryKey: ['appointments'] });

        const now = Date.now();
        if (val._timestamp && (now - val._timestamp < 5000)) {
           // Feedback silencioso no mobile ou um log
           console.log('[Realtime] Agenda synced');
        }
      }
    });

    return () => off(triggerRef, 'value', unsubscribe);
  }, [user, queryClient]);
};
