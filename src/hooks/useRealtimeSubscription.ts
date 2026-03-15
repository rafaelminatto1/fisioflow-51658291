import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface UseRealtimeSubscriptionProps {
    table: string;
    schema?: string;
    queryKey?: unknown[];
    event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
    filter?: string;
    enabled?: boolean;
}

/**
 * Hook reutilizável para inscrições Realtime.
 * 
 * Adaptação do filtro: Tenta converter filtros simples (col=eq.val)
 */
export function useRealtimeSubscription({
    table,
    schema = 'public', // Ignored
    queryKey,
    event = '*',
    filter,
    enabled = true
}: UseRealtimeSubscriptionProps) {
    const queryClient = useQueryClient();
    const { profile } = useAuth();
    const organizationId = profile?.organization_id;
    const isSubscribedRef = useRef(false);

    useEffect(() => {
        const effectiveFilter = filter !== undefined
            ? filter
            : organizationId
                ? `organization_id=eq.${organizationId}`
                : undefined;

        if (!enabled || (filter === undefined && !organizationId)) {
            return;
        }

        const channelName = `${table}-changes-${organizationId || 'all'}`;
        logger.info(`Configurando pseudo-realtime para ${table}`, { channelName, filter: effectiveFilter }, 'useRealtimeSubscription');
        isSubscribedRef.current = true;

        const interval = window.setInterval(() => {
            if (queryKey) {
                queryClient.invalidateQueries({ queryKey });
            }
            logger.debug(`Pseudo-realtime refresh on ${table}`, { filter: effectiveFilter }, 'useRealtimeSubscription');
        }, 15000);

        return () => {
            logger.debug(`Cleanup subscription ${channelName}`, {}, 'useRealtimeSubscription');
            isSubscribedRef.current = false;
            window.clearInterval(interval);
        };
    }, [table, schema, event, filter, enabled, queryClient, organizationId, queryKey]);
}
