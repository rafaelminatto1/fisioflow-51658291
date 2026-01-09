import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/errors/logger';
import { useToast } from '@/hooks/use-toast';

interface UseRealtimeSubscriptionProps {
    table: string;
    schema?: string;
    queryKey?: unknown[];
    event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
    filter?: string;
    enabled?: boolean;
}

/**
 * Hook reutilizável para inscrições no Supabase Realtime.
 * Gerencia automaticamente o filtro por organização e invalidação de queries.
 */
export function useRealtimeSubscription({
    table,
    schema = 'public',
    queryKey,
    event = '*',
    filter,
    enabled = true
}: UseRealtimeSubscriptionProps) {
    const queryClient = useQueryClient();
    const { profile } = useAuth();
    const { toast } = useToast();
    const organizationId = profile?.organization_id;

    useEffect(() => {
        // Só inscrever se estiver habilitado e tivermos o ID da organização (se necessário)
        // Se um filtro específico for passado, usamos ele. Se não, tentamos filtrar por organização automaticamente.
        const effectiveFilter = filter !== undefined
            ? filter
            : organizationId
                ? `organization_id=eq.${organizationId}`
                : undefined;

        if (!enabled || (filter === undefined && !organizationId)) {
            return;
        }

        const channelName = `${table}-changes-${organizationId || 'all'}`;
        logger.info(`Configurando Realtime para ${table}`, { channelName, filter: effectiveFilter }, 'useRealtimeSubscription');

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event,
                    schema,
                    table,
                    filter: effectiveFilter
                },
                (payload) => {
                    logger.info(`Realtime event: ${table} ${payload.eventType}`, {}, 'useRealtimeSubscription');

                    // Invalidar queries se queryKey for fornecida
                    if (queryKey) {
                        queryClient.invalidateQueries({ queryKey });
                    }

                    // Notificações básicas (pode ser expandido ou customizado)
                    // Isso substitui a lógica repetida no useAppointments e outros
                    // Futuramente pode aceitar um callback 'onEvent' para customização
                }
            )
            .subscribe();

        return () => {
            logger.debug(`Removendo subscription ${channelName}`, {}, 'useRealtimeSubscription');
            supabase.removeChannel(channel);
        };
    }, [table, schema, event, filter, enabled, queryClient, organizationId, queryKey]);
}
