import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { set, get } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';

export interface OfflineMutation<TData = unknown, TError = unknown, TVariables = void, TContext = unknown> {
    id: string;
    mutationKey: unknown[];
    variables: TVariables;
    createdAt: number;
}

const OFFLINE_QUEUE_KEY = 'offline-mutation-queue';

export function useOfflineMutation<TData = unknown, TError = unknown, TVariables = void, TContext = unknown>(
    options: UseMutationOptions<TData, TError, TVariables, TContext>
) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const isOnline = navigator.onLine; // Simplificado, idealmente usar um hook useNetwork

    return useMutation<TData, TError, TVariables, TContext>({
        ...options,
        mutationFn: async (variables) => {
            if (!navigator.onLine) {
                // Modo Offline: Salvar na fila
                const mutationRecord: OfflineMutation<TData, TError, TVariables, TContext> = {
                    id: uuidv4(),
                    mutationKey: options.mutationKey || ['unknown'],
                    variables,
                    createdAt: Date.now(),
                };

                const currentQueue = (await get(OFFLINE_QUEUE_KEY)) || [];
                await set(OFFLINE_QUEUE_KEY, [...currentQueue, mutationRecord]);

                // Simular sucesso para UI otimista
                // Em um cenário real, precisaríamos retornar um dado mockado ou o que a UI espera
                throw new Error('OFFLINE_SAVED'); // Usamos erro controlado para tratar especificamente
            }

            // Modo Online: Executar normal
            return options.mutationFn ? options.mutationFn(variables) : Promise.reject('No mutationFn');
        },
        onError: (error, variables, context) => {
            if (error instanceof Error && error.message === 'OFFLINE_SAVED') {
                toast({
                    title: "Salvo offline",
                    description: "Sua alteração será sincronizada quando a conexão voltar.",
                    variant: "default",
                });
                // Chamar onSuccess original se existir para update otimista da UI?
                // Depende da implementação, mas geralmente o onSuccess espera dados reais.
                // Aqui poderíamos chamar um onOfflineSuccess customizado se precisasse.
                return;
            }

            if (options.onError) {
                options.onError(error, variables, context);
            }
        },
    });
}
