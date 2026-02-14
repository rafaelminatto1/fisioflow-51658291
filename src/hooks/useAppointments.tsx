

// Query keys factory for better cache management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { AppointmentBase, AppointmentFormData, AppointmentStatus } from '@/types/appointment';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { AppointmentNotificationService } from '@/lib/services/AppointmentNotificationService';
import { requireUserOrganizationId } from '@/utils/userHelpers';
import { useAuth } from '@/contexts/AuthContext';
import { appointmentsCacheService } from '@/lib/offline/AppointmentsCacheService';
import { AppointmentService } from '@/services/appointmentService';
import { ErrorHandler } from '@/lib/errors/ErrorHandler';
import { isAppointmentConflictError } from '@/utils/appointmentErrors';

export const appointmentKeys = {
  all: ['appointments_v2'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (organizationId?: string | null) => [...appointmentKeys.lists(), organizationId] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
} as const;

// Função auxiliar para criar timeout em promises (suporta PromiseLike do Firestore)
function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// Função auxiliar para retry com backoff exponencial
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

// Constantes para backup de emergência em localStorage
const EMERGENCY_CACHE_KEY = 'fisioflow_appointments_emergency';
const EMERGENCY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 dias

// Flag para indicar se dados vieram do cache
export interface AppointmentsQueryResult {
  data: AppointmentBase[];
  isFromCache: boolean;
  cacheTimestamp: string | null;
  source?: 'firestore' | 'indexeddb' | 'localstorage' | 'memory';
}

// Salvar backup de emergência em localStorage (compactado)
function saveEmergencyBackup(appointments: AppointmentBase[], organizationId?: string) {
  try {
    // Salvar apenas campos essenciais para economizar espaço
    const minimal = appointments.map(apt => ({
      id: apt.id,
      patientId: apt.patientId,
      patientName: apt.patientName,
      phone: apt.phone,
      date: apt.date instanceof Date ? apt.date.toISOString() : apt.date,
      time: apt.time,
      duration: apt.duration,
      type: apt.type,
      status: apt.status,
      notes: apt.notes,
      therapistId: apt.therapistId,
      room: apt.room,
    }));

    const backup = {
      data: minimal,
      timestamp: new Date().toISOString(),
      organizationId,
      count: minimal.length,
    };

    localStorage.setItem(EMERGENCY_CACHE_KEY, JSON.stringify(backup));
    logger.debug(`Backup de emergência salvo: ${minimal.length} agendamentos`, {}, 'useAppointments');
  } catch (err) {
    // localStorage pode estar cheio, não quebrar por causa disso
    logger.warn('Falha ao salvar backup de emergência', err, 'useAppointments');
  }
}

// Recuperar backup de emergência do localStorage
function getEmergencyBackup(organizationId?: string): AppointmentsQueryResult {
  try {
    const raw = localStorage.getItem(EMERGENCY_CACHE_KEY);
    if (!raw) return { data: [], isFromCache: false, cacheTimestamp: null, source: 'localstorage' };

    const backup = JSON.parse(raw);

    // Verificar se é da mesma organização
    if (organizationId && backup.organizationId !== organizationId) {
      return { data: [], isFromCache: false, cacheTimestamp: null, source: 'localstorage' };
    }

    // Verificar idade do backup
    const backupAge = Date.now() - new Date(backup.timestamp).getTime();
    if (backupAge > EMERGENCY_CACHE_MAX_AGE) {
      logger.warn('Backup de emergência expirado', { ageHours: backupAge / 3600000 }, 'useAppointments');
      return { data: [], isFromCache: false, cacheTimestamp: null, source: 'localstorage' };
    }

    // Converter datas de volta
    const appointments: AppointmentBase[] = (backup.data || []).map((apt: Record<string, unknown>) => ({
      ...apt,
      date: apt.date ? new Date(apt.date as string) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    logger.info(`Backup de emergência recuperado: ${appointments.length} agendamentos`, {
      ageMinutes: Math.round(backupAge / 60000),
    }, 'useAppointments');

    return {
      data: appointments,
      isFromCache: true,
      cacheTimestamp: backup.timestamp,
      source: 'localstorage',
    };
  } catch (err) {
    logger.error('Falha ao ler backup de emergência', err, 'useAppointments');
    return { data: [], isFromCache: false, cacheTimestamp: null, source: 'localstorage' };
  }
}

// Fetch all appointments with improved error handling and validation
async function fetchAppointments(organizationIdOverride?: string | null): Promise<AppointmentsQueryResult> {
  const timer = logger.startTimer('fetchAppointments');

  logger.info('Carregando agendamentos do Firestore', {}, 'useAppointments');

  // Checar se está offline primeiro
  if (!navigator.onLine) {
    logger.warn('Dispositivo offline, usando cache', {}, 'useAppointments');
    timer();
    return getFromCacheWithMetadata();
  }

  try {
    // Obter organization_id do usuário
    const organizationId: string | null = organizationIdOverride || null;

    if (!organizationId) {
      // Se não tiver organizationId, abortar
      logger.warn('Abortando fetch: organization_id não encontrado', {}, 'useAppointments');
      return { data: [], isFromCache: false, cacheTimestamp: null, source: 'memory' };
    }

    // Usar retry com backoff para resiliência de rede
    const data = await retryWithBackoff(() =>
      withTimeout(
        AppointmentService.fetchAppointments(organizationId),
        15000
      )
    );

    // Salvar no cache atualizado (IndexedDB + localStorage backup)
    appointmentsCacheService.saveToCache(data, organizationId || undefined);
    saveEmergencyBackup(data, organizationId || undefined);

    timer();
    return { data, isFromCache: false, cacheTimestamp: null, source: 'firestore' };

  } catch (error: unknown) {
    logger.error('Erro crítico no fetchAppointments', error, 'useAppointments');

    // Verificar erros de rede/conexão para decidir sobre fallback
    if (isNetworkError(error)) {
      logger.warn('Erro de rede, usando fallback cache', {}, 'useAppointments');
      return getFromCacheWithMetadata(organizationIdOverride || undefined);
    }

    // Último recurso: tentar cache multi-camada
    timer();
    return getFromCacheWithMetadata(organizationIdOverride || undefined);
  }
}

// Função auxiliar para detectar erros de rede
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
    message.includes('load failed') ||
    error instanceof Error && error.name === 'TypeError' && message === 'failed to fetch' ||
    !navigator.onLine
  );
}

// Função auxiliar para obter dados do cache com fallback multi-camada
// Ordem: IndexedDB -> localStorage -> array vazio (NUNCA enquanto houver dados)
async function getFromCacheWithMetadata(organizationId?: string): Promise<AppointmentsQueryResult> {
  // CAMADA 1: Tentar IndexedDB (mais confiável e completo)
  try {
    const cacheResult = await appointmentsCacheService.getFromCache(organizationId);

    if (cacheResult.data.length > 0) {
      const ageMinutes = appointmentsCacheService.getCacheAgeMinutes();
      logger.info('Usando dados do IndexedDB (Fallback Camada 1)', {
        count: cacheResult.data.length,
        ageMinutes,
        isStale: cacheResult.isStale
      }, 'useAppointments');

      return {
        data: cacheResult.data,
        isFromCache: true,
        cacheTimestamp: cacheResult.metadata?.lastUpdated || null,
        source: 'indexeddb',
      };
    }
  } catch (indexedDbError) {
    logger.error('Falha ao ler IndexedDB, tentando localStorage', indexedDbError, 'useAppointments');
  }

  // CAMADA 2: Tentar localStorage (backup de emergência)
  const emergencyResult = getEmergencyBackup(organizationId);
  if (emergencyResult.data.length > 0) {
    logger.warn('Usando backup de emergência do localStorage (Fallback Camada 2)', {
      count: emergencyResult.data.length,
    }, 'useAppointments');
    return emergencyResult;
  }

  // CAMADA 3: Sem dados disponíveis
  logger.error('NENHUM CACHE DISPONÍVEL - retornando array vazio', {}, 'useAppointments');
  return { data: [], isFromCache: false, cacheTimestamp: null, source: 'memory' };
}

import { useRealtimeAppointments } from './useRealtimeAppointments';

// ... (imports remain)

// Main hook to fetch appointments with Realtime support
interface UseAppointmentsOptions {
  enabled?: boolean;
  enableRealtime?: boolean;
}

export function useAppointments(options: UseAppointmentsOptions = {}) {
  const { _toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = profile?.organization_id;
  const isHookEnabled = options.enabled ?? true;
  const shouldEnableQuery = isHookEnabled && !!organizationId;

  // Ativar listener do Realtime Database (Substitui Firestore onSnapshot)
  // Quando o backend publica no RTDB, este hook invalida a query automaticamente
  useRealtimeAppointments((options.enableRealtime ?? true) && shouldEnableQuery);

  const appointmentsQuery = useQuery({
    queryKey: appointmentKeys.list(organizationId),
    queryFn: () => fetchAppointments(organizationId),
    staleTime: 1000 * 10,
    gcTime: 1000 * 60 * 60,
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: false,
    placeholderData: (previousData) => previousData,
    enabled: shouldEnableQuery,
    throwOnError: false,
  });

  const result = appointmentsQuery.data as AppointmentsQueryResult | undefined;
  const previousData = queryClient.getQueryData<AppointmentsQueryResult>(appointmentKeys.list(organizationId));

  let finalData: AppointmentBase[] = [];
  let dataSource: 'fresh' | 'cache' | 'previous' = 'fresh';

  if (result?.data && result.data.length > 0) {
    finalData = result.data;
    dataSource = 'fresh';
  } else if (previousData?.data && previousData.data.length > 0) {
    finalData = previousData.data;
    dataSource = 'previous';
    logger.debug('Usando dados anteriores do React Query como fallback', {
      count: finalData.length,
    }, 'useAppointments');
  } else if (result?.isFromCache && result.data) {
    finalData = result.data;
    dataSource = 'cache';
  }

  const refreshAppointments = async () => {
    return await appointmentsQuery.refetch();
  };

  const isUsingStaleData = dataSource !== 'fresh' && finalData.length > 0;

  return {
    ...appointmentsQuery,
    data: finalData,
    isFromCache: result?.isFromCache || dataSource === 'cache' || dataSource === 'previous',
    cacheTimestamp: result?.cacheTimestamp || null,
    refreshAppointments,
    dataSource: result?.source || dataSource,
    isUsingStaleData,
    hasData: finalData.length > 0,
  };
}

// Create appointment mutation
export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const organizationId = profile?.organization_id || await requireUserOrganizationId();

      // Get current appointments for conflict checking
      const currentResult = queryClient.getQueryData<AppointmentsQueryResult>(appointmentKeys.list(profile?.organization_id));
      const currentAppointments = currentResult?.data || [];

      // Delegate to service
      return await AppointmentService.createAppointment(data, organizationId, currentAppointments);
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: appointmentKeys.list(profile?.organization_id) });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<AppointmentsQueryResult>(appointmentKeys.list(profile?.organization_id));

      // Optimistically update to the new value
      const tempId = `temp-${Date.now()}`;
      const optimisticAppointment: AppointmentBase = {
        id: tempId,
        patientId: variables.patient_id,
        patientName: variables.patient_name || variables.patient_id || '', // Attempt to use name if available
        phone: '',
        date: new Date(variables.appointment_date || Date.now()),
        time: variables.appointment_time || variables.start_time || '',
        duration: variables.duration || 60,
        type: variables.type || 'Fisioterapia',
        status: variables.status || 'agendado',
        notes: variables.notes || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        therapistId: variables.therapist_id || undefined,
        room: variables.room || undefined,
        payment_status: variables.payment_status || 'pending',
      };

      queryClient.setQueryData(
        appointmentKeys.list(profile?.organization_id),
        (old: AppointmentsQueryResult | undefined) => ({
          ...old,
          data: [...(old?.data || []), optimisticAppointment]
        })
      );

      // Return context with previous data and temp ID
      return { previousData, tempId };
    },
    onSuccess: (data, _variables, context) => {
      // Replace optimistic update with real data
      queryClient.setQueryData(
        appointmentKeys.list(profile?.organization_id),
        (old: AppointmentsQueryResult | undefined) => {
          const filtered = old?.data.filter(apt => apt.id !== context?.tempId) || [];
          return {
            ...old,
            data: [...filtered, data]
          };
        }
      );

      // Force refresh of lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });

      toast({
        title: 'Sucesso',
        description: 'Agendamento criado com sucesso'
      });

      // Notificação (asynchronous)
      AppointmentNotificationService.scheduleNotification(
        data.id,
        data.patientId,
        data.date,
        data.time,
        data.patientName
      );
    },
    onError: (error: Error, _variables, context) => {
      // Rollback to previous value
      if (context?.previousData) {
        queryClient.setQueryData(
          appointmentKeys.list(profile?.organization_id),
          context.previousData
        );
      }

      // 409: toast amigável já é mostrado no modal; só suprimimos a notificação genérica
      if (isAppointmentConflictError(error)) {
        ErrorHandler.handle(error, 'useCreateAppointment', { showNotification: false });
      } else {
        ErrorHandler.handle(error, 'useCreateAppointment');
      }
    }
  });
}

// Update appointment mutation
export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ appointmentId, updates }: { appointmentId: string; updates: Partial<AppointmentFormData> }) => {
      const organizationId = profile?.organization_id || await requireUserOrganizationId();
      return await AppointmentService.updateAppointment(appointmentId, updates, organizationId);
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: appointmentKeys.list(profile?.organization_id) });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<AppointmentsQueryResult>(appointmentKeys.list(profile?.organization_id));

      // Optimistically update the appointment
      queryClient.setQueryData(
        appointmentKeys.list(profile?.organization_id),
        (old: AppointmentsQueryResult | undefined) => ({
          ...old,
          data: old?.data.map(apt =>
            apt.id === variables.appointmentId
              ? { ...apt, ...parseUpdatesToAppointment(variables.updates) }
              : apt
          ) || []
        })
      );

      return { previousData };
    },
    onSuccess: (data) => {
      // Invalidate to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: appointmentKeys.list(profile?.organization_id) });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(data.id) });

      toast({
        title: 'Sucesso',
        description: 'Agendamento atualizado com sucesso'
      });
    },
    onError: (error: Error, _variables, context) => {
      // Rollback to previous value
      if (context?.previousData) {
        queryClient.setQueryData(
          appointmentKeys.list(profile?.organization_id),
          context.previousData
        );
      }

      // 409: toast amigável já é mostrado no modal ou no drag; só suprimimos a notificação genérica
      if (isAppointmentConflictError(error)) {
        ErrorHandler.handle(error, 'useUpdateAppointment', { showNotification: false });
      } else {
        ErrorHandler.handle(error, 'useUpdateAppointment');
      }
    }
  });
}

// Helper to parse form updates to appointment format
function parseUpdatesToAppointment(updates: Partial<AppointmentFormData>): Partial<AppointmentBase> {
  const result: Partial<AppointmentBase> = {};

  if (updates.appointment_date || updates.date) {
    const dateStr = updates.appointment_date || updates.date;
    result.date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr as Date;
  }
  if (updates.appointment_time || updates.start_time) {
    result.time = updates.appointment_time || updates.start_time;
  }
  if (updates.duration) result.duration = updates.duration;
  if (updates.type) result.type = updates.type;
  if (updates.status) result.status = updates.status;
  if (updates.notes !== undefined) result.notes = updates.notes;
  if (updates.therapist_id !== undefined) result.therapistId = updates.therapist_id;
  if (updates.room !== undefined) result.room = updates.room;
  if (updates.payment_status !== undefined) result.payment_status = updates.payment_status;

  return result;
}

// Delete appointment mutation
export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const organizationId = profile?.organization_id || await requireUserOrganizationId();
      await AppointmentService.deleteAppointment(appointmentId, organizationId);
      return appointmentId;
    },
    onSuccess: (deletedId) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.removeQueries({ queryKey: appointmentKeys.detail(deletedId) });

      toast({
        title: 'Sucesso',
        description: 'Agendamento excluído com sucesso'
      });
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useDeleteAppointment');
    }
  });
}
// Update appointment status
export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: string; status: AppointmentStatus }) => {
      if (!appointmentId) {
        throw new Error('ID do agendamento é obrigatório');
      }
      if (!status) {
        throw new Error('Status é obrigatório');
      }

      // Obter organization_id para garantir segurança
      await requireUserOrganizationId();

      await AppointmentService.updateStatus(appointmentId, status);

      return { id: appointmentId, status };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      // Otimistic update: atualizar na cache imediatamente
      queryClient.setQueryData(
        appointmentKeys.list(),
        (old: AppointmentsQueryResult | undefined) => ({
          ...old,
          data: (old?.data || []).map(apt =>
            apt.id === variables.appointmentId
              ? { ...apt, status: variables.status }
              : apt
          )
        })
      );
      toast({
        title: 'Status atualizado',
        description: 'Status do agendamento atualizado com sucesso'
      });
    },
    onError: (error) => {
      logger.error('Erro ao atualizar status', error, 'useAppointments');
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
        variant: 'destructive'
      });
    }
  });
}

// Reschedule appointment
export function useRescheduleAppointment() {
  const { mutateAsync } = useUpdateAppointment();

  return {
    mutateAsync: ({ appointmentId, appointment_date, appointment_time, duration }: {
      appointmentId: string;
      appointment_date?: string;
      appointment_time?: string;
      duration?: number;
    }) => mutateAsync({ appointmentId, updates: { appointment_date, appointment_time, duration } }),
    isPending: false
  };
}

// Helper hooks for compatibility
export function useAppointmentsFiltered(_filters: Record<string, unknown>) {
  const { data: appointments = [], isLoading, error } = useAppointments();
  return { data: appointments, isLoading, error };
}

export function useUpdatePaymentStatus() {
  // Payment status not in appointments table
  return {
    mutateAsync: async (_: { appointmentId: string; paymentStatus: 'paid' | 'pending' | 'partial' }) => true,
    isPending: false,
  };
}
