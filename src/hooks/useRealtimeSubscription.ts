import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/errors/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
 *
 * FIX: Tracka o estado da subscription para evitar erros de WebSocket
 * "WebSocket is closed before the connection is established"
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
    const organizationId = profile?.organization_id;
    const channelRef = useRef<RealtimeChannel | null>(null);
    const isSubscribedRef = useRef(false);

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

        // Reset subscription state
        isSubscribedRef.current = false;

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
            .subscribe((status, error) => {
                if (status === 'SUBSCRIBED') {
                    isSubscribedRef.current = true;
                    logger.debug(`Realtime conectado: ${channelName}`, {}, 'useRealtimeSubscription');
                }
                if (status === 'CHANNEL_ERROR') {
                    logger.error(`Erro no canal Realtime: ${channelName}`, error, 'useRealtimeSubscription');
                }
                if (status === 'TIMED_OUT') {
                    logger.warn(`Timeout no canal Realtime: ${channelName}`, {}, 'useRealtimeSubscription');
                }
                if (status === 'CLOSED') {
                    isSubscribedRef.current = false;
                    logger.debug(`Canal Realtime fechado: ${channelName}`, {}, 'useRealtimeSubscription');
                }
            });

        channelRef.current = channel;

        return () => {
            logger.debug(`Cleanup subscription ${channelName}`, { isSubscribed: isSubscribedRef.current }, 'useRealtimeSubscription');

            // Só chama removeChannel se a subscription foi estabelecida
            // Isso previne o erro "WebSocket is closed before the connection is established"
            if (isSubscribedRef.current && channelRef.current) {
                supabase.removeChannel(channelRef.current).catch((err) => {
                    // Ignora erros de cleanup - o canal pode já ter sido fechado
                    logger.debug(`Erro ao remover canal (ignorado): ${channelName}`, err, 'useRealtimeSubscription');
                });
            }

            isSubscribedRef.current = false;
            channelRef.current = null;
        };
    }, [table, schema, event, filter, enabled, queryClient, organizationId, queryKey]);
}
