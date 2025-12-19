/**
 * Configurações centralizadas para React Query
 * Gerencia cache, staleTime e invalidação
 */

// Tempos de cache padrão (em ms)
export const CACHE_TIMES = {
  // Dados que mudam raramente
  LONG: 1000 * 60 * 30, // 30 minutos
  
  // Dados padrão
  DEFAULT: 1000 * 60 * 5, // 5 minutos
  
  // Dados que mudam frequentemente
  SHORT: 1000 * 60 * 1, // 1 minuto
  
  // Dados em tempo real
  REALTIME: 1000 * 30, // 30 segundos
} as const;

// Tempos de stale (quando considerar dados desatualizados)
export const STALE_TIMES = {
  // Dados estáticos (exercícios, configurações)
  STATIC: 1000 * 60 * 15, // 15 minutos
  
  // Dados que mudam pouco (pacientes, perfis)
  STABLE: 1000 * 60 * 5, // 5 minutos
  
  // Dados dinâmicos (agendamentos, notificações)
  DYNAMIC: 1000 * 60 * 1, // 1 minuto
  
  // Dados em tempo real
  REALTIME: 1000 * 15, // 15 segundos
} as const;

// Query keys organizadas por domínio
export const QUERY_KEYS = {
  // Pacientes
  patients: {
    all: ['patients'] as const,
    list: () => [...QUERY_KEYS.patients.all, 'list'] as const,
    detail: (id: string) => [...QUERY_KEYS.patients.all, 'detail', id] as const,
    search: (term: string) => [...QUERY_KEYS.patients.all, 'search', term] as const,
  },
  
  // Agendamentos
  appointments: {
    all: ['appointments'] as const,
    list: () => [...QUERY_KEYS.appointments.all, 'list'] as const,
    detail: (id: string) => [...QUERY_KEYS.appointments.all, 'detail', id] as const,
    byDate: (date: string) => [...QUERY_KEYS.appointments.all, 'date', date] as const,
    byPatient: (patientId: string) => [...QUERY_KEYS.appointments.all, 'patient', patientId] as const,
    byTherapist: (therapistId: string) => [...QUERY_KEYS.appointments.all, 'therapist', therapistId] as const,
  },
  
  // Terapeutas
  therapists: {
    all: ['therapists'] as const,
    list: () => [...QUERY_KEYS.therapists.all, 'list'] as const,
    detail: (id: string) => [...QUERY_KEYS.therapists.all, 'detail', id] as const,
    availability: (id: string) => [...QUERY_KEYS.therapists.all, 'availability', id] as const,
  },
  
  // Exercícios
  exercises: {
    all: ['exercises'] as const,
    list: () => [...QUERY_KEYS.exercises.all, 'list'] as const,
    detail: (id: string) => [...QUERY_KEYS.exercises.all, 'detail', id] as const,
    byCategory: (category: string) => [...QUERY_KEYS.exercises.all, 'category', category] as const,
  },
  
  // Financeiro
  financial: {
    all: ['financial'] as const,
    transactions: () => [...QUERY_KEYS.financial.all, 'transactions'] as const,
    summary: () => [...QUERY_KEYS.financial.all, 'summary'] as const,
    cashflow: (period: string) => [...QUERY_KEYS.financial.all, 'cashflow', period] as const,
  },
  
  // Eventos
  events: {
    all: ['eventos'] as const,
    list: () => [...QUERY_KEYS.events.all, 'list'] as const,
    detail: (id: string) => [...QUERY_KEYS.events.all, 'detail', id] as const,
  },
  
  // Notificações
  notifications: {
    all: ['notifications'] as const,
    unread: () => [...QUERY_KEYS.notifications.all, 'unread'] as const,
  },
  
  // Analytics
  analytics: {
    all: ['analytics'] as const,
    dashboard: () => [...QUERY_KEYS.analytics.all, 'dashboard'] as const,
    performance: () => [...QUERY_KEYS.analytics.all, 'performance'] as const,
  },
  
  // Perfil e configurações
  profile: {
    all: ['profile'] as const,
    current: () => [...QUERY_KEYS.profile.all, 'current'] as const,
    permissions: () => [...QUERY_KEYS.profile.all, 'permissions'] as const,
  },
} as const;

// Configurações por tipo de dado
export const queryConfigs = {
  // Dados estáticos - cache longo
  static: {
    staleTime: STALE_TIMES.STATIC,
    gcTime: CACHE_TIMES.LONG,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
  
  // Dados estáveis - cache médio
  stable: {
    staleTime: STALE_TIMES.STABLE,
    gcTime: CACHE_TIMES.DEFAULT,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  },
  
  // Dados dinâmicos - cache curto
  dynamic: {
    staleTime: STALE_TIMES.DYNAMIC,
    gcTime: CACHE_TIMES.SHORT,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  },
  
  // Dados em tempo real
  realtime: {
    staleTime: STALE_TIMES.REALTIME,
    gcTime: CACHE_TIMES.REALTIME,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 30000, // 30 segundos
  },
} as const;
