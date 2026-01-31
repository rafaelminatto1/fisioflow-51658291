import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { db } from '@/integrations/firebase/app';
import {
    collection,
    query,
    where,
    onSnapshot,
    Query,
    limit
} from 'firebase/firestore';


interface UseRealtimeSubscriptionProps {
    table: string;
    schema?: string;
    queryKey?: unknown[];
    event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
    filter?: string;
    enabled?: boolean;
}

/**
 * Hook reutilizável para inscrições no Firebase Firestore Realtime.
 * Substitui o Supabase Realtime.
 * 
 * Adaptação do filtro: Tenta converter filtros simples do Supabase (col=eq.val)
 */
export function useRealtimeSubscription({
    table,
    schema = 'public', // Ignored in Firebase
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
        // Só inscrever se estiver habilitado e tivermos o ID da organização (se necessário)
        const effectiveFilter = filter !== undefined
            ? filter
            : organizationId
                ? `organization_id=eq.${organizationId}`
                : undefined;

        if (!enabled || (filter === undefined && !organizationId)) {
            return;
        }

        const channelName = `${table}-changes-${organizationId || 'all'}`;
        logger.info(`Configurando Realtime (Firestore) para ${table}`, { channelName, filter: effectiveFilter }, 'useRealtimeSubscription');

        isSubscribedRef.current = true; // Optimistic

        // Build Query
        const colRef = collection(db, table);
        let q: Query = colRef;

        // Try to parse Supabase filter: "field=eq.value"
        if (effectiveFilter) {
            const match = effectiveFilter.match(/^(.+)=eq\.(.+)$/);
            if (match) {
                const [, field, value] = match;
                // Clean quotes if present
                const effectiveValue = value.replace(/^['"]|['"]$/g, '');
                if (effectiveValue) {
                    q = query(colRef, where(field, '==', effectiveValue));
                }
            } else if (effectiveFilter === 'organization_id=eq.undefined') {
                // Skip if organization_id is undefined string
                isSubscribedRef.current = false;
                return;
            }
        }

        // Firestore listener
        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Check if there are changes (though snapshot always means update or local init)
            // Invalidating queries
            if (queryKey) {
                queryClient.invalidateQueries({ queryKey });
            }
            logger.debug(`Realtime update on ${table}`, { docs: snapshot.size }, 'useRealtimeSubscription');

        }, (error) => {
            logger.error(`Erro no listener Realtime: ${channelName}`, error, 'useRealtimeSubscription');
            isSubscribedRef.current = false;
        });

        return () => {
            logger.debug(`Cleanup subscription ${channelName}`, {}, 'useRealtimeSubscription');
            isSubscribedRef.current = false;
            unsubscribe();
        };
    }, [table, schema, event, filter, enabled, queryClient, organizationId, queryKey]);
}
