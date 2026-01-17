import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { protocolsCacheService } from '@/lib/offline/ProtocolsCacheService';
import { logger } from '@/lib/errors/logger';

export interface ProtocolMilestone {
  week: number;
  description: string;
}

export interface ProtocolRestriction {
  week_start: number;
  week_end?: number;
  description: string;
}

export interface ExerciseProtocol {
  id: string;
  name: string;
  condition_name: string;
  protocol_type: 'pos_operatorio' | 'patologia';
  weeks_total?: number;
  milestones: ProtocolMilestone[] | Record<string, unknown>;
  restrictions: ProtocolRestriction[] | Record<string, unknown>;
  progression_criteria: Record<string, unknown>[] | Record<string, unknown>;
  references?: {
    title: string;
    authors: string;
    year: number;
    url?: string;
    journal?: string;
  }[];
  clinical_tests?: string[]; // Array of clinical_test_template IDs
  organization_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProtocolsQueryResult {
  data: ExerciseProtocol[];
  isFromCache: boolean;
  source: 'supabase' | 'indexeddb' | 'localstorage' | 'memory';
}

// Helpers copiados para garantir robustez (DRY seria melhor, mas evita quebra agora)
function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_reject) =>
      setTimeout(() => _reject(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  const message = (error instanceof Error ? error.message : '').toLowerCase();
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('fetch') ||
    message.includes('failed to fetch') ||
    message.includes('connection') ||
    message.includes('offline') ||
    !navigator.onLine
  );
}

// Data Fetching Logic
async function fetchProtocols(): Promise<ProtocolsQueryResult> {
  // Checar offline
  if (!navigator.onLine) {
    logger.warn('Offline mode detected for protocols', {}, 'useExerciseProtocols');
    const cacheResult = await protocolsCacheService.getFromCache();
    return {
      data: cacheResult.data,
      isFromCache: true,
      source: cacheResult.source as any
    };
  }

  try {
    const query = supabase
      .from('exercise_protocols')
      .select('*')
      .order('condition_name');

    const result = await retryWithBackoff(() =>
      withTimeout(query, 10000), // 10s timeout
      3,
      1000
    );

    const { data, error } = result;

    if (error) {
      if (isNetworkError(error)) {
        logger.warn('Network error fetching protocols, falling back to cache', { error }, 'useExerciseProtocols');
        const cacheResult = await protocolsCacheService.getFromCache();
        return {
          data: cacheResult.data,
          isFromCache: true,
          source: cacheResult.source as any
        };
      }
      throw error;
    }

    const protocols = (data || []) as ExerciseProtocol[];

    // Atualizar cache
    protocolsCacheService.saveToCache(protocols);

    return {
      data: protocols,
      isFromCache: false,
      source: 'supabase'
    };

  } catch (error) {
    logger.error('Critical error fetching protocols', error, 'useExerciseProtocols');
    const cacheResult = await protocolsCacheService.getFromCache();
    return {
      data: cacheResult.data,
      isFromCache: true,
      source: cacheResult.source as any
    };
  }
}

export const useExerciseProtocols = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['exercise-protocols'],
    queryFn: fetchProtocols,
    staleTime: 1000 * 60 * 60, // 1 hora de frescor (protocolos mudam pouco)
    gcTime: 1000 * 60 * 60 * 24, // 24 horas em memória
    placeholderData: (previousData) => previousData, // Manter dados anteriores
    retry: 3,
  });

  // Lógica de Falback Multi-camada na leitura
  const result = query.data;
  const previousData = queryClient.getQueryData<ProtocolsQueryResult>(['exercise-protocols']);

  let finalProtocols: ExerciseProtocol[] = [];

  if (result?.data && result.data.length > 0) {
    finalProtocols = result.data;
  } else if (previousData?.data && previousData.data.length > 0) {
    finalProtocols = previousData.data;
  }

  const createMutation = useMutation({
    mutationFn: async (protocol: Omit<ExerciseProtocol, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('exercise_protocols')
        .insert([protocol])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-protocols'] });
      toast.success('Protocolo criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar protocolo: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...protocol }: Partial<ExerciseProtocol> & { id: string }) => {
      const { data, error } = await supabase
        .from('exercise_protocols')
        .update(protocol)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-protocols'] });
      toast.success('Protocolo atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar protocolo: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exercise_protocols')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-protocols'] });
      toast.success('Protocolo excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir protocolo: ' + error.message);
    },
  });

  // Retornar 'loading' APENAS se não tivermos NENHUM dado (nem cache, nem anterior)
  // Se tivermos fallback, não mostramos loading para evitar flash ou bloqueio da UI
  const effectiveLoading = query.isLoading && finalProtocols.length === 0;

  return {
    protocols: finalProtocols,
    loading: effectiveLoading,
    error: query.error,
    createProtocol: createMutation.mutate,
    updateProtocol: updateMutation.mutate,
    deleteProtocol: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isOfflineMode: result?.isFromCache || false
  };
};