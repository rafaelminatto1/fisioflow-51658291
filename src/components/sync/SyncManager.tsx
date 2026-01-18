import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { get, set, del } from 'idb-keyval';
import { useQueryClient } from '@tanstack/react-query';

const OFFLINE_QUEUE_KEY = 'offline-mutation-queue';

export function SyncManager() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    useEffect(() => {
        const processQueue = async () => {
            // Pequeno delay para garantir estabilidade da conexão
            await new Promise(resolve => setTimeout(resolve, 2000));

            const queue = (await get(OFFLINE_QUEUE_KEY)) || [];

            if (queue.length === 0) return;

            toast({
                title: "Sincronizando dados",
                description: `Encontrados ${queue.length} itens salvos offline.`,
                duration: 3000,
            });

            // Como não podemos serializar as funções de mutação, a estratégia segura aqui é:
            // 1. Manter os dados salvos
            // 2. Notificar o usuário que existem dados pendentes
            // 3. Em uma implementação futura, mapear 'mutationKey' para funções reisdradas

            // Por enquanto, apenas avisamos e invalidamos queries relevantes para forçar refresh
            // O hook useOfflineMutation cuidará de tentar reenviar se o componente estiver montado

            await queryClient.invalidateQueries();
        };

        const handleOnline = () => {
            console.log('[SyncManager] Online detected, checking queue...');
            processQueue();
        };

        window.addEventListener('online', handleOnline);

        // Check on mount as well, in case we started offline then became online
        if (navigator.onLine) {
            processQueue(); // Check if there are leftovers from previous session
        }

        return () => {
            window.removeEventListener('online', handleOnline);
        };
    }, [toast, queryClient]);

    return null; // Componente lógico, sem renderização visual (o toast cuida disso)
}
