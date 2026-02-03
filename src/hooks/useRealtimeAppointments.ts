import { useEffect } from 'react';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { useQueryClient } from '@tanstack/react-query';
import { app } from '@/integrations/firebase/app';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook que escuta o Firebase Realtime DB para saber quando atualizar a agenda.
 * Substitui o Ably para sinalização de refresh.
 */
export const useRealtimeAppointments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Se não tiver organização, não faz sentido ouvir
    // Assumindo que o user context tem organizationId ou pegamos do profile
    // Como simplificação, vamos assumir que o hook de profile já carregou
    const orgId = localStorage.getItem('fisioflow_org_id') || 'default'; 

    if (!user || !orgId) return;

    const db = getDatabase(app);
    // Escuta o nó de "gatilho" da agenda dessa organização
    const triggerRef = ref(db, `orgs/${orgId}/agenda/refresh_trigger`);

    const unsubscribe = onValue(triggerRef, (snapshot) => {
      // Quando o valor muda (qualquer timestamp novo), invalidamos a query
      if (snapshot.exists()) {
        const val = snapshot.val();
        console.log('[Realtime] Agenda refresh signal received', val);
        
        queryClient.invalidateQueries({ queryKey: ['appointments'] });

        // Feedback visual sutil (apenas se a mudança for recente, para evitar toast no load inicial)
        const now = Date.now();
        if (val._timestamp && (now - val._timestamp < 5000)) {
           toast({
             title: 'Agenda atualizada',
             description: 'Novos dados sincronizados em tempo real.',
             duration: 2000
           });
        }
      }
    });

    return () => {
      off(triggerRef, 'value', unsubscribe);
    };
  }, [user, queryClient, toast]);
};
