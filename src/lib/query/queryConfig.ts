/**
 * Query Configuration Constants
 *
 * Configurações centralizadas para TanStack Query
 * Cache times, stale times, retry policies, etc.
 */


/**
 * Tempos de cache em milissegundos
 */

import { fisioLogger as logger } from '@/lib/errors/logger';

export const CACHE_TIMES = {
  /** Dados que mudam raramente (5 minutos) */
  SHORT: 5 * 60 * 1000,
  /** Dados que mudam ocasionalmente (15 minutos) */
  MEDIUM: 15 * 60 * 1000,
  /** Dados que mudam pouco (1 hora) */
  LONG: 60 * 60 * 1000,
  /** Dados relativamente estáticos (6 horas) */
  VERY_LONG: 6 * 60 * 60 * 1000,
  /** Dados essencialmente estáticos (24 horas) */
  INFINITE: 24 * 60 * 60 * 1000,
} as const;

/**
 * Tempos de stale time em milissegundos
 */
export const STALE_TIMES = {
  /** Dados freshness crítica (30 segundos) */
  CRITICAL: 30 * 1000,
  /** Dados que devem ser atualizados frequentemente (1 minuto) */
  FREQUENT: 60 * 1000,
  /** Dados com atualização moderada (5 minutos) */
  MODERATE: 5 * 60 * 1000,
  /** Dados que não precisam ser tão frescos (15 minutos) */
  RELAXED: 15 * 60 * 1000,
} as const;

/**
 * Configurações padrão para diferentes tipos de query
 */
export const QUERY_CONFIGS = {
  /** Pacientes - mudam ocasionalmente */
  patients: {
    staleTime: STALE_TIMES.MODERATE,
    gcTime: CACHE_TIMES.LONG,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  /** Agendamentos - mudam frequentemente */
  appointments: {
    staleTime: STALE_TIMES.FREQUENT,
    gcTime: CACHE_TIMES.MEDIUM,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  /** Financeiro - mudam diariamente */
  financial: {
    staleTime: STALE_TIMES.RELAXED,
    gcTime: CACHE_TIMES.VERY_LONG,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  /** Exercícios e templates - mudam raramente */
  exercises: {
    staleTime: STALE_TIMES.RELAXED,
    gcTime: CACHE_TIMES.VERY_LONG,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  /** Relatórios - dados históricos */
  reports: {
    staleTime: STALE_TIMES.RELAXED,
    gcTime: CACHE_TIMES.LONG,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  /** Configurações e preferências do usuário */
  userSettings: {
    staleTime: STALE_TIMES.MODERATE,
    gcTime: CACHE_TIMES.LEDIUM,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  /** Organização e equipe */
  organization: {
    staleTime: STALE_TIMES.MODERATE,
    gcTime: CACHE_TIMES.LONG,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  /** Dados de lookup/enum - essencialmente estáticos */
  lookup: {
    staleTime: CACHE_TIMES.VERY_LONG,
    gcTime: CACHE_TIMES.INFINITE,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },
} as const;

/**
 * Configuração de retry padrão
 */
export const RETRY_CONFIG = {
  /** Número padrão de tentativas */
  default: 3,
  /** Para operações críticas */
  critical: 5,
  /** Para operações que não devem retry */
  none: 1,
} as const;

/**
 * Função auxiliar para determinar se deve fazer retry baseado no erro
 */
export function shouldRetry(
  failureCount: number,
  error: unknown
): boolean {
  // Não fazer retry após 3 tentativas padrão
  if (failureCount >= RETRY_CONFIG.default) {
    return false;
  }

  // Não fazer retry para erros 4xx (exceto 408, 429)
  if (error && typeof error === 'object') {
    const err = error as { status?: number; code?: string; message?: string };

    // Erros de cliente que não devem ser retry
    if (err.status) {
      if (err.status >= 400 && err.status < 500) {
        // Exceções: 408 (Request Timeout), 429 (Too Many Requests)
        if (err.status === 408 || err.status === 429) {
          return true;
        }
        return false;
      }
    }

    // Erros de autenticação/autorização não devem retry
    if (
      err.code === 'PGRST116' || // permission denied
      err.message?.includes('permission') ||
      err.message?.includes('auth')
    ) {
      return false;
    }

    // Timeout de rede pode ser retry
    if (err.message?.includes('timeout') || err.message?.includes('Timeout')) {
      return true;
    }
  }

  return true;
}

/**
 * Delay de retry com backoff exponencial
 */
export function getRetryDelay(failureCount: number): number {
  // Backoff exponencial: 1s, 2s, 4s, 8s, etc.
  // Máximo de 30 segundos entre tentativas
  return Math.min(1000 * 2 ** failureCount, 30000);
}

/**
 * Logger para queries
 */
export const queryLogger = {
  log: (message: string, context?: Record<string, unknown>) => {
    logger.debug(message, context, 'Query');
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    logger.warn(message, context, 'Query');
  },
  error: (message: string, context?: Record<string, unknown>) => {
    logger.error(message, context, 'Query');
  },
};

/**
 * Configurações padrão para mutations
 */
export const MUTATION_CONFIGS = {
  /** Mutation otimista padrão */
  optimistic: {
    onMutate: (variables: unknown) => {
      queryLogger.log('Mutation started', { variables });
      return variables;
    },
    onError: (error: Error, variables: unknown) => {
      queryLogger.error('Mutation failed', { error, variables });
    },
    onSuccess: (data: unknown, variables: unknown) => {
      queryLogger.log('Mutation succeeded', { data, variables });
    },
  },

  /** Mutation com retry automático */
  withRetry: {
    retry: RETRY_CONFIG.default,
    retryDelay: getRetryDelay,
  },

  /** Mutation para operações críticas */
  critical: {
    retry: RETRY_CONFIG.critical,
    retryDelay: getRetryDelay,
  },
} as const;

/**
 * Query keys factory para type safety e invalidação eficiente
 */
export const QUERY_KEYS = {
  // Pacientes
  patients: {
    all: ['patients'] as const,
    lists: () => [...QUERY_KEYS.patients.all, 'list'] as const,
    details: () => [...QUERY_KEYS.patients.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.patients.details(), id] as const,
    search: (query: string) => [...QUERY_KEYS.patients.all, 'search', query] as const,
  },

  // Agendamentos
  appointments: {
    all: ['appointments'] as const,
    lists: () => [...QUERY_KEYS.appointments.all, 'list'] as const,
    details: () => [...QUERY_KEYS.appointments.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.appointments.details(), id] as const,
    byDate: (date: string) => [...QUERY_KEYS.appointments.all, 'date', date] as const,
    byPatient: (patientId: string) => [...QUERY_KEYS.appointments.all, 'patient', patientId] as const,
    upcoming: () => [...QUERY_KEYS.appointments.all, 'upcoming'] as const,
  },

  // Financeiro
  financial: {
    all: ['financial'] as const,
    transactions: () => [...QUERY_KEYS.financial.all, 'transactions'] as const,
    stats: () => [...QUERY_KEYS.financial.all, 'stats'] as const,
    monthly: (month: string) => [...QUERY_KEYS.financial.all, 'monthly', month] as const,
  },

  // Exercícios
  exercises: {
    all: ['exercises'] as const,
    lists: () => [...QUERY_KEYS.exercises.all, 'list'] as const,
    detail: (id: string) => [...QUERY_KEYS.exercises.all, 'detail', id] as const,
    categories: () => [...QUERY_KEYS.exercises.all, 'categories'] as const,
  },

  // Relatórios
  reports: {
    all: ['reports'] as const,
    templates: () => [...QUERY_KEYS.reports.all, 'templates'] as const,
    generated: () => [...QUERY_KEYS.reports.all, 'generated'] as const,
  },

  // Organização
  organization: {
    all: ['organization'] as const,
    members: () => [...QUERY_KEYS.organization.all, 'members'] as const,
    settings: () => [...QUERY_KEYS.organization.all, 'settings'] as const,
  },

  // Usuário
  user: {
    all: ['user'] as const,
    profile: () => [...QUERY_KEYS.user.all, 'profile'] as const,
    settings: () => [...QUERY_KEYS.user.all, 'settings'] as const,
    permissions: () => [...QUERY_KEYS.user.all, 'permissions'] as const,
  },
} as const;
