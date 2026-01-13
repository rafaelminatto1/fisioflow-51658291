import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Tipo genérico para variáveis de mutação
 */
export type MutationVariables<T = unknown> = T;

/**
 * Tipo para contexto de mutação otimista
 */
export interface OptimisticMutationContext<TData, TError> {
  previousData?: TData;
  rollbackData?: TData;
  error?: TError;
}

/**
 * Opções para mutação otimista
 */
export interface OptimisticMutationOptions<TData, TVariables, TError, TContext> {
  // Query keys para invalidação
  invalidateQueries?: string[][];
  // Query keys para atualização otimista
  updateQueries?: string[][];
  // Mensagem de sucesso
  successMessage?: string;
  // Mensagem de erro
  errorMessage?: string;
  // Função para atualizar dados otimistamente
  onMutate?: (variables: TVariables) => Promise<TContext> | TContext;
  // Função para atualizar cache após sucesso
  onSuccess?: (data: TData, variables: TVariables, context?: TContext) => void | Promise<void>;
  // Função para tratar erros
  onError?: (error: TError, variables: TVariables, context?: TContext) => void | Promise<void>;
  // Função executada após settling (sucesso ou erro)
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
    context?: TContext
  ) => void | Promise<void>;
}

/**
 * Hook personalizado para mutações com cache otimista
 *
 * Fornece uma forma padronizada de realizar mutações com:
 * - Atualização otimista do cache
 * - Rollback automático em caso de erro
 * - Invalidação de queries relacionadas
 * - Feedback visual com toast
 *
 * @example
 * ```tsx
 * const mutation = useOptimisticMutation({
 *   mutationFn: async (newTodo) => {
 *     return await api.createTodo(newTodo);
 *   },
 *   updateQueries: [['todos']],
 *   invalidateQueries: [['todos-stats']],
 *   successMessage: 'Tarefa criada com sucesso!',
 * });
 * ```
 */
export function useOptimisticMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = OptimisticMutationContext<TData, TError>
>(
  options: {
    mutationFn: (variables: TVariables) => Promise<TData>;
  } & OptimisticMutationOptions<TData, TVariables, TError, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const queryClient = useQueryClient();

  const {
    mutationFn,
    invalidateQueries = [],
    updateQueries = [],
    successMessage,
    errorMessage,
    onMutate: customOnMutate,
    onSuccess: customOnSuccess,
    onError: customOnError,
    onSettled: customOnSettled,
  } = options;

  return useMutation({
    mutationFn,

    onMutate: async (variables) => {
      // Cancelar queries outbound para evitar sobrescrever update otimista
      await Promise.all([
        ...updateQueries.map((queryKey) =>
          queryClient.cancelQueries({ queryKey })
        ),
      ]);

      // Snapshot dos dados anteriores para rollback
      const context: TContext = {} as TContext;

      if (updateQueries.length > 0) {
        updateQueries.forEach((queryKey) => {
          const previousData = queryClient.getQueryData(queryKey);
          if (previousData) {
            (context as any).previousData = previousData;
          }
        });
      }

      // Executar onMutate customizado se fornecido
      if (customOnMutate) {
        const customContext = await customOnMutate(variables);
        Object.assign(context, customContext);
      }

      return context;
    },

    onError: (error, variables, context) => {
      // Rollback dos dados otimistas
      if (context?.previousData && updateQueries.length > 0) {
        updateQueries.forEach((queryKey) => {
          queryClient.setQueryData(queryKey, context.previousData);
        });
      }

      // Mostrar toast de erro
      if (errorMessage) {
        toast.error(errorMessage, {
          description: error instanceof Error ? error.message : undefined,
        });
      }

      // Executar onError customizado
      if (customOnError) {
        customOnError(error, variables, context);
      }
    },

    onSuccess: async (data, variables, context) => {
      // Invalidar queries relacionadas para refrescar do servidor
      if (invalidateQueries.length > 0) {
        await Promise.all([
          ...invalidateQueries.map((queryKey) =>
            queryClient.invalidateQueries({ queryKey })
          ),
        ]);
      }

      // Mostrar toast de sucesso
      if (successMessage) {
        toast.success(successMessage);
      }

      // Executar onSuccess customizado
      if (customOnSuccess) {
        await customOnSuccess(data, variables, context);
      }
    },

    onSettled: async (data, error, variables, context) => {
      // Executar onSettled customizado
      if (customOnSettled) {
        await customOnSettled(data, error, variables, context);
      }
    },
  });
}

/**
 * Hook simplificado para mutações de criação com otimismo
 */
export function useCreateMutation<TData, TVariables = void>(
  options: {
    mutationFn: (variables: TVariables) => Promise<TData>;
    invalidateQueries?: string[][];
    successMessage?: string;
    errorMessage?: string;
    // Função para atualizar cache otimistamente
    getOptimisticData?: (variables: TVariables) => (old: TData | undefined) => TData;
  }
) {
  const queryClient = useQueryClient();

  return useOptimisticMutation<TData, Error, TVariables>({
    ...options,
    onMutate: async (variables) => {
      const context = {} as OptimisticMutationContext<TData, Error>;

      // Atualização otimista customizada
      if (options.getOptimisticData) {
        options.updateQueries?.forEach((queryKey) => {
          const previousData = queryClient.getQueryData<TData>(queryKey);
          context.previousData = previousData;

          if (previousData) {
            const optimisticData = options.getOptimisticData!(variables)(previousData);
            queryClient.setQueryData(queryKey, optimisticData);
          }
        });
      }

      return context;
    },
  });
}

/**
 * Hook simplificado para mutações de atualização com otimismo
 */
export function useUpdateMutation<TData, TVariables = void>(
  options: {
    mutationFn: (variables: TVariables) => Promise<TData>;
    invalidateQueries?: string[][];
    successMessage?: string;
    errorMessage?: string;
    // Função para atualizar item otimistamente
    getOptimisticUpdate?: (variables: TVariables) => (old: TData) => TData;
    // Função para encontrar item no array
    findItem?: (data: any[], variables: TVariables) => any;
  }
) {
  const queryClient = useQueryClient();

  return useOptimisticMutation<TData, Error, TVariables>({
    ...options,
    onMutate: async (variables) => {
      const context = {} as OptimisticMutationContext<TData, Error>;

      options.updateQueries?.forEach((queryKey) => {
        const previousData = queryClient.getQueryData(queryKey);
        context.previousData = previousData;

        // Atualização otimista de array de itens
        if (Array.isArray(previousData) && options.findItem && options.getOptimisticUpdate) {
          const optimisticData = previousData.map((item) => {
            const targetItem = options.findItem!(previousData, variables);
            return item === targetItem
              ? options.getOptimisticUpdate!(variables)(item)
              : item;
          });
          queryClient.setQueryData(queryKey, optimisticData);
        }
      });

      return context;
    },
  });
}

/**
 * Hook simplificado para mutações de deleção com otimismo
 */
export function useDeleteMutation<TData, TVariables = void>(
  options: {
    mutationFn: (variables: TVariables) => Promise<TData>;
    invalidateQueries?: string[][];
    successMessage?: string;
    errorMessage?: string;
    // Função para identificar item a ser deletado
    findItem?: (data: any[], variables: TVariables) => any;
  }
) {
  const queryClient = useQueryClient();

  return useOptimisticMutation<TData, Error, TVariables>({
    ...options,
    onMutate: async (variables) => {
      const context = {} as OptimisticMutationContext<TData, Error>;

      options.updateQueries?.forEach((queryKey) => {
        const previousData = queryClient.getQueryData(queryKey);
        context.previousData = previousData;

        // Remoção otimista de item do array
        if (Array.isArray(previousData) && options.findItem) {
          const targetItem = options.findItem!(previousData, variables);
          const optimisticData = previousData.filter((item) => item !== targetItem);
          queryClient.setQueryData(queryKey, optimisticData);
        }
      });

      return context;
    },
  });
}
