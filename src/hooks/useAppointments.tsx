import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VerifiedAppointmentSchema } from '@/schemas/appointment';
import { useToast } from '@/hooks/use-toast';
import { AppointmentBase, AppointmentFormData, AppointmentStatus, AppointmentType } from '@/types/appointment';
import { checkAppointmentConflict } from '@/utils/appointmentValidation';
import { logger } from '@/lib/errors/logger';
import { useEffect } from 'react';
import { AppointmentNotificationService } from '@/lib/services/AppointmentNotificationService';
import { requireUserOrganizationId, getUserOrganizationId } from '@/utils/userHelpers';

// Query keys factory for better cache management
export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (organizationId?: string | null) => [...appointmentKeys.lists(), organizationId] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
} as const;

// Função auxiliar para criar timeout em promises (suporta PromiseLike do Supabase)
function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_reject) =>
      setTimeout(() => _reject(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs)
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

// Fetch all appointments with improved error handling and validation
import { useAuth } from '@/contexts/AuthContext';
import { appointmentsCacheService } from '@/lib/offline/AppointmentsCacheService';
import { dateSchema, timeSchema } from '@/lib/validations/agenda';

// Constantes para backup de emergência em localStorage
const EMERGENCY_CACHE_KEY = 'fisioflow_appointments_emergency';
const EMERGENCY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 dias

// Flag para indicar se dados vieram do cache
export interface AppointmentsQueryResult {
  data: AppointmentBase[];
  isFromCache: boolean;
  cacheTimestamp: string | null;
  source?: 'supabase' | 'indexeddb' | 'localstorage' | 'memory';
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

  logger.info('Carregando agendamentos do Supabase', {}, 'useAppointments');

  // Checar se está offline primeiro
  if (!navigator.onLine) {
    logger.warn('Dispositivo offline, usando cache', {}, 'useAppointments');
    timer();
    return getFromCacheWithMetadata();
  }

  try {
    // Obter organization_id do usuário para filtrar (usar override ou fallback para função utilitária)
    let organizationId: string | null = organizationIdOverride || null;

    if (!organizationId) {
      try {
        organizationId = await getUserOrganizationId();
      } catch (orgError) {
        logger.warn('Não foi possível obter organization_id, usando RLS', orgError, 'useAppointments');
      }
    }

    // Construir query - Buscando relacionamentos essenciais
    let query = supabase
      .from('appointments')
      .select(`
        *,
        patients!inner(
          id,
          full_name,
          phone,
          email
        ),
        profiles:therapist_id(
          full_name
        )
      `);

    // Filtrar por organização se disponível (melhora performance e segurança)
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    // Usar retry com timeout forçado
    const result = await retryWithBackoff(() =>
      withTimeout(
        query
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true }),
        15000 // 15 segundos de timeout para garantir em conexões lentas
      ),
      3, // 3 tentativas
      1000 // delay inicial
    );

    const { data, error } = result;

    if (error) {
      logger.error('Erro ao buscar agendamentos', error, 'useAppointments');

      // Verificar erros de rede/conexão
      if (isNetworkError(error)) {
        logger.warn('Erro de rede identificado, fallback para cache', { error: error.message }, 'useAppointments');
        timer();
        return getFromCacheWithMetadata();
      }

      // Tratar erros específicos de permissão/schema
      if (error.code === 'PGRST116' || error.message?.includes('permission')) {
        logger.error('Erro de permissão ou dados não encontrados.', error, 'useAppointments');
        return { data: [], isFromCache: false, cacheTimestamp: null };
      }

      throw error;
    }

    // Validar e transformar dados usando Zod
    const transformedAppointments: AppointmentBase[] = [];
    const validationErrors: { id: string; error: unknown }[] = [];

    (data || []).forEach((item) => {
      // Mapear estrutura do banco para estrutura esperada pelo Zod Schema se necessário
      // O Schema espera 'patient' mas o retorno do supabase é 'patients' (plural) ou mapeado
      const itemToValidate = {
        ...item,
        patient: item.patients, // flat map para validação
        professional: item.profiles // flat map
      };

      const validation = VerifiedAppointmentSchema.safeParse(itemToValidate);

      if (validation.success) {
        const validData = validation.data;

        // Converter para AppointmentBase (Interface legada da UI)
        transformedAppointments.push({
          id: validData.id,
          patientId: validData.patient_id || '',
          patientName: validData.patientName, // Campo computado pelo Zod
          phone: item.patients?.phone || '',
          date: validData.date,
          time: validData.start_time || validData.appointment_time || '00:00',
          duration: validData.duration || 60,
          type: (validData.type || 'Fisioterapia') as AppointmentType,
          status: (validData.status || 'agendado') as AppointmentStatus,
          notes: validData.notes || '',
          createdAt: validData.created_at ? new Date(validData.created_at) : new Date(),
          updatedAt: validData.updated_at ? new Date(validData.updated_at) : new Date(),
          therapistId: validData.therapist_id,
          room: validData.room,
        });
      } else {
        validationErrors.push({ id: item.id, error: validation.error });
        logger.warn(`Agendamento ${item.id} inválido`, { error: validation.error }, 'useAppointments');

        // Opcional: tentar recuperar parcialmente ou ignorar
        // Por segurança, ignoramos dados inválidos para não quebrar a UI
      }
    });

    if (validationErrors.length > 0) {
      logger.warn(`Ignorados ${validationErrors.length} agendamentos inválidos`, {}, 'useAppointments');
    }

    // Salvar no cache atualizado (IndexedDB + localStorage backup)
    appointmentsCacheService.saveToCache(transformedAppointments, organizationId || undefined);
    saveEmergencyBackup(transformedAppointments, organizationId || undefined);

    timer();
    return { data: transformedAppointments, isFromCache: false, cacheTimestamp: null, source: 'supabase' };

  } catch (error: unknown) {
    logger.error('Erro crítico no fetchAppointments', error, 'useAppointments');

    // Último recurso: tentar cache multi-camada
    timer();
    return getFromCacheWithMetadata(organizationIdOverride || undefined);
  }
}

// Função auxiliar para detectar erros de rede
function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  // Log message para debug
  // console.log('Checking network error:', error); 

  const message = (error instanceof Error ? error.message : '').toLowerCase();

  // Lista extensiva de erros de rede
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

// Main hook to fetch appointments with Realtime support
export function useAppointments() {
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = profile?.organization_id;

  // Setup Realtime subscription using custom hook
  // Esta inscrição já gerencia a invalidação de queries quando há mudanças
  // Não precisamos de uma inscrição duplicada para toasts
  const channelName = `appointments-changes-${organizationId || 'all'}`;

  useEffect(() => {
    if (!organizationId) return;

    // FIX: Track subscription state to avoid WebSocket errors
    let isSubscribed = false;
    const channel = supabase.channel(channelName);

    (channel as any)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          logger.info(`Realtime event: appointments ${payload.eventType}`, {}, 'useAppointments');

          // Invalidar queries para atualizar os dados
          queryClient.invalidateQueries({ queryKey: appointmentKeys.all });

          // Show toast notification for changes made by other users
          if (payload.eventType === 'INSERT') {
            toast({
              title: '🔄 Novo agendamento',
              description: 'Um novo agendamento foi criado por outro usuário',
            });
          } else if (payload.eventType === 'UPDATE') {
            toast({
              title: '🔄 Agendamento atualizado',
              description: 'Um agendamento foi atualizado por outro usuário',
            });
          } else if (payload.eventType === 'DELETE') {
            toast({
              title: '🔄 Agendamento removido',
              description: 'Um agendamento foi removido por outro usuário',
            });
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          isSubscribed = true;
          logger.debug(`Realtime conectado: ${channelName}`, {}, 'useAppointments');
        }
        if (status === 'CHANNEL_ERROR') {
          logger.error(`Erro no canal Realtime: ${channelName}`, {}, 'useAppointments');
        }
        if (status === 'CLOSED') {
          isSubscribed = false;
          logger.debug(`Canal Realtime fechado: ${channelName}`, {}, 'useAppointments');
        }
      });

    return () => {
      logger.debug(`Cleanup subscription ${channelName}`, { isSubscribed }, 'useAppointments');
      if (isSubscribed) {
        supabase.removeChannel(channel).catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, [toast, organizationId, queryClient]);

  const query = useQuery({
    queryKey: appointmentKeys.list(organizationId), // Use appointmentKeys factory
    queryFn: () => fetchAppointments(organizationId),
    staleTime: 1000 * 10, // 10 segundos (dados mais frescos)
    gcTime: 1000 * 60 * 60, // 1 hora (mantém cache em memória por mais tempo)
    retry: 5, // Mais retries para conexões instáveis
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: false, // Não refetch automático, apenas em eventos
    // CRÍTICO: Manter dados anteriores para NUNCA mostrar lista vazia durante recarregamento
    placeholderData: (previousData) => previousData,
    enabled: !!organizationId || !!user, // Enable if we have org ID OR if user is logged in
    // Não lançar erro para o componente se falhar - usar fallback silencioso
    throwOnError: false,
  });

  // Extrair dados do resultado
  const result = query.data as AppointmentsQueryResult | undefined;

  // SISTEMA DE FALLBACK MULTI-CAMADA para NUNCA retornar array vazio
  // Ordem de prioridade:
  // 1. Dados frescos da query atual
  // 2. Dados anteriores do React Query cache
  // 3. Nunca retornar vazio se teve dados antes
  const previousData = queryClient.getQueryData<AppointmentsQueryResult>(appointmentKeys.list(organizationId));

  // Determinar os dados finais com fallback defensivo
  let finalData: AppointmentBase[] = [];
  let dataSource: 'fresh' | 'cache' | 'previous' = 'fresh';

  if (result?.data && result.data.length > 0) {
    // Dados frescos disponíveis
    finalData = result.data;
    dataSource = 'fresh';
  } else if (previousData?.data && previousData.data.length > 0) {
    // Fallback para dados anteriores do React Query
    finalData = previousData.data;
    dataSource = 'previous';
    logger.debug('Usando dados anteriores do React Query como fallback', {
      count: finalData.length,
    }, 'useAppointments');
  } else if (result?.isFromCache && result.data) {
    // Dados do cache (IndexedDB ou localStorage)
    finalData = result.data;
    dataSource = 'cache';
  }

  // Função helper para forçar atualização como Promise
  const refreshAppointments = async () => {
    return await query.refetch();
  };

  // Verificar se está usando dados stale
  const isUsingStaleData = dataSource !== 'fresh' && finalData.length > 0;

  return {
    ...query,
    data: finalData,
    isFromCache: result?.isFromCache || dataSource === 'cache' || dataSource === 'previous',
    cacheTimestamp: result?.cacheTimestamp || null,
    refreshAppointments,
    // Novos campos para UI
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
      logger.info('Criando novo agendamento', { patientId: data.patient_id, date: data.appointment_date || data.date }, 'useAppointments');

      // Obter organization_id do usuário (usar contexto ou fallback)
      const organizationId = profile?.organization_id || await requireUserOrganizationId();

      // Check for conflicts with current data
      const currentAppointments = queryClient.getQueryData<AppointmentsQueryResult>(appointmentKeys.list(profile?.organization_id))?.data || [];
      checkAppointmentConflict({
        date: new Date(data.appointment_date),
        time: data.appointment_time,
        duration: data.duration,
        appointments: currentAppointments
      });

      logger.warn('Conflito de horário detectado, mas permitindo criação (controle de capacidade no frontend)', { appointmentData: data }, 'useAppointments');
      // Não lançar erro aqui para permitir sobreposição controlada pela capacidade
      // throw new Error('Conflito de horário');

      // Validar dados antes de inserir
      if (!data.patient_id) {
        throw new Error('ID do paciente é obrigatório');
      }

      // Normalização e Validação com Zod
      const rawDate = data.appointment_date || data.date;
      const rawTime = data.appointment_time || data.start_time;

      if (!rawDate) throw new Error('Data do agendamento é obrigatória');
      if (!rawTime) throw new Error('Horário do agendamento é obrigatório');

      const dateValidation = dateSchema.safeParse(rawDate);
      if (!dateValidation.success) {
        throw new Error(`Formato de data inválido: ${rawDate || 'vazio'}. Use YYYY-MM-DD.`);
      }

      const timeValidation = timeSchema.safeParse(rawTime);
      if (!timeValidation.success) {
        // Tentar recuperar formato HH:MM simples se falhar (embora o schema já deva cobrir)
        const simpleTimeRegex = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
        if (!simpleTimeRegex.test(rawTime)) {
          throw new Error(`Formato de horário inválido: ${rawTime || 'vazio'}. Use HH:MM.`);
        }
      }

      const { data: newAppointment, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: data.patient_id,
          // Dual Write Strategy: Gravar em ambas as colunas para garantir compatibilidade
          appointment_date: rawDate,
          date: rawDate,
          appointment_time: rawTime,
          start_time: rawTime,
          duration: data.duration || 60,
          type: data.type || 'fisioterapia',
          status: data.status || 'agendado',
          notes: data.notes || null,
          therapist_id: data.therapist_id || null,
          room: data.room || null,
          organization_id: organizationId,
        })
        .select(`
          *,
          patients!inner(
            id,
            full_name,
            phone,
            email
          )
        `)
        .single();



      if (error) {
        logger.error('Erro ao inserir agendamento no Supabase', error, 'useAppointments');

        // Melhorar mensagens de erro
        if (error.message?.includes('violates row-level security')) {
          throw new Error('Você não tem permissão para criar agendamentos nesta organização.');
        }
        if (error.message?.includes('foreign key')) {
          throw new Error('Paciente ou terapeuta não encontrado.');
        }
        if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
          throw new Error('Já existe um agendamento com estes dados.');
        }

        throw error;
      }

      const appointment: AppointmentBase = {
        id: newAppointment.id,
        patientId: newAppointment.patient_id,
        patientName: newAppointment.patients.full_name || newAppointment.patients.name,
        phone: newAppointment.patients.phone,
        date: new Date(newAppointment.date || newAppointment.appointment_date),
        time: newAppointment.start_time || newAppointment.appointment_time,
        duration: newAppointment.duration,
        type: newAppointment.type as AppointmentType,
        status: newAppointment.status as AppointmentStatus,
        notes: newAppointment.notes || '',
        createdAt: new Date(newAppointment.created_at),
        updatedAt: new Date(newAppointment.updated_at)
      };

      logger.info('Agendamento criado com sucesso', { appointmentId: appointment.id }, 'useAppointments');

      // Enviar notificação (não bloquear se falhar)
      AppointmentNotificationService.scheduleNotification(
        appointment.id,
        appointment.patientId,
        appointment.date,
        appointment.time,
        appointment.patientName
      );

      return appointment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.list(profile?.organization_id) });
      // Otimistic update: adicionar o novo agendamento à cache imediatamente
      queryClient.setQueryData(
        appointmentKeys.list(profile?.organization_id),
        (old: AppointmentsQueryResult | undefined) => ({
          ...old,
          data: [...(old?.data || []), data]
        })
      );
      toast({
        title: 'Sucesso',
        description: 'Agendamento criado com sucesso'
      });
    },
    onError: (error: Error) => {
      logger.error('Erro ao criar agendamento', error, 'useAppointments');

      let errorMessage = 'Não foi possível criar o agendamento.';

      if (error.message === 'Conflito de horário') {
        errorMessage = 'Já existe um agendamento neste horário.';
      } else if (error.message.includes('Organização não encontrada')) {
        errorMessage = 'Organização não encontrada. Você precisa estar vinculado a uma organização.';
      } else if (error.message.includes('não autenticado')) {
        errorMessage = 'Sessão expirada. Por favor, faça login novamente.';
      }

      toast({
        title: error.message === 'Conflito de horário' ? 'Conflito de Horário' : 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
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
      logger.info('Atualizando agendamento', { appointmentId, updates }, 'useAppointments');

      // Obter organization_id do usuário para garantir segurança
      const organizationId = profile?.organization_id || await requireUserOrganizationId();

      // Check for conflicts if date/time is being changed
      if (updates.appointment_date || updates.appointment_time || updates.duration) {
        const currentAppointments = queryClient.getQueryData<AppointmentBase[]>(['appointments']) || [];
        const existing = currentAppointments.find(apt => apt.id === appointmentId);

        if (existing) {
          checkAppointmentConflict({
            date: updates.appointment_date ? new Date(updates.appointment_date) : existing.date,
            time: updates.appointment_time || existing.time,
            duration: updates.duration || existing.duration,
            excludeId: appointmentId,
            appointments: currentAppointments
          });

          logger.warn('Conflito de horário detectado na atualização, permitindo (controle no frontend)', { appointmentId }, 'useAppointments');
          // throw new Error('Conflito de horário');
        }
      }

      // Normalize update data
      const updateDate = updates.appointment_date || updates.date;
      const updateTime = updates.appointment_time || updates.start_time;

      const updateData: Record<string, unknown> = {};

      // Strict validation for date with Zod
      if (updateDate) {
        const dateValidation = dateSchema.safeParse(updateDate);
        if (!dateValidation.success) {
          throw new Error(`Formato de data inválido: ${updateDate}. Use YYYY-MM-DD.`);
        }
        // Dual Write Strategy
        updateData.appointment_date = updateDate;
        updateData.date = updateDate;
      }

      // Strict validation for time with Zod
      if (updateTime) {
        const timeValidation = timeSchema.safeParse(updateTime);
        if (!timeValidation.success) {
          // Fallback regex logic from original code preserved/adapted if schema is too strict, 
          // but keeping consistent with Zod as primary.
          const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
          if (!timeRegex.test(updateTime)) {
            throw new Error(`Formato de horário inválido: ${updateTime}. Use HH:MM.`);
          }
        }
        // Dual Write Strategy
        updateData.appointment_time = updateTime;
        updateData.start_time = updateTime;
      }

      if (updates.patient_id) updateData.patient_id = updates.patient_id;
      if (updates.duration) updateData.duration = updates.duration;
      if (updates.type) updateData.type = updates.type;
      if (updates.status) updateData.status = updates.status;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;
      if (updates.therapist_id !== undefined) updateData.therapist_id = updates.therapist_id;
      if (updates.room !== undefined) updateData.room = updates.room;

      // Validar que há dados para atualizar
      if (Object.keys(updateData).length === 0) {
        throw new Error('Nenhum dado para atualizar');
      }

      logger.debug('Enviando atualização para Supabase', { appointmentId, updateData, organizationId }, 'useAppointments');

      // Primeiro fazer o update sem select (evitar erro 400 com JOIN)
      const { error: updateError } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)
        .eq('organization_id', organizationId);

      if (updateError) {
        logger.error('Erro ao atualizar agendamento no Supabase', updateError, 'useAppointments');

        // Melhorar mensagens de erro
        if (updateError.message?.includes('violates row-level security')) {
          throw new Error('Você não tem permissão para atualizar este agendamento.');
        }
        if (updateError.code === 'PGRST116') {
          throw new Error('Agendamento não encontrado ou você não tem permissão para acessá-lo.');
        }
        // Tratamento para erro 400 data inválida
        if (updateError.code === '22007' || updateError.code === '22008' || updateError.message?.includes('invalid input syntax')) {
          throw new Error('Dados inválidos ao atualizar agendamento. Verifique data e hora.');
        }

        throw updateError;
      }

      // Agora buscar os dados atualizados com JOIN
      const { data: updatedAppointment, error: selectError } = await supabase
        .from('appointments')
        .select(`
          *,
          patients!inner(
            id,
            full_name,
            phone,
            email
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (selectError) {
        logger.error('Erro ao buscar agendamento atualizado', selectError, 'useAppointments');
        throw new Error('Erro ao buscar dados atualizados do agendamento.');
      }

      // Verificar se o agendamento foi encontrado
      if (!updatedAppointment) {
        throw new Error('Agendamento não encontrado após atualização');
      }

      const transformedAppointment: AppointmentBase = {
        id: updatedAppointment.id,
        patientId: updatedAppointment.patient_id,
        patientName: updatedAppointment.patients?.full_name || updatedAppointment.patients?.name || 'Paciente não identificado',
        phone: updatedAppointment.patients?.phone || '',
        // Use local component parsing to avoid UTC offset issues
        date: (() => {
          const dateStr = updatedAppointment.date || updatedAppointment.appointment_date;
          if (!dateStr) return new Date();
          const [y, m, d] = dateStr.split('-').map(Number);
          return new Date(y, m - 1, d, 12, 0, 0);
        })(),
        time: updatedAppointment.start_time || updatedAppointment.appointment_time,
        duration: updatedAppointment.duration || 60,
        type: updatedAppointment.type as AppointmentType,
        status: updatedAppointment.status as AppointmentStatus,
        notes: updatedAppointment.notes || '',
        createdAt: new Date(updatedAppointment.created_at),
        updatedAt: new Date(updatedAppointment.updated_at)
      };

      logger.info('Agendamento atualizado com sucesso', { appointmentId: transformedAppointment.id }, 'useAppointments');

      // Se data/hora mudou, notificar reagendamento
      if (updates.date || updates.appointment_date || updates.start_time || updates.appointment_time) {
        AppointmentNotificationService.notifyReschedule(
          transformedAppointment.id,
          transformedAppointment.patientId,
          transformedAppointment.date,
          transformedAppointment.time,
          transformedAppointment.patientName
        );
      }

      return transformedAppointment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.list(profile?.organization_id) });
      queryClient.setQueryData(
        appointmentKeys.detail(data.id),
        data
      );
      toast({
        title: 'Sucesso',
        description: 'Agendamento atualizado com sucesso'
      });
    },
    onError: (error: Error) => {
      logger.error('Erro ao atualizar agendamento', error, 'useAppointments');

      let errorMessage = 'Não foi possível atualizar o agendamento.';

      if (error.message === 'Conflito de horário') {
        errorMessage = 'Já existe um agendamento neste horário.';
      } else if (error.message.includes('Organização não encontrada')) {
        errorMessage = 'Organização não encontrada. Você precisa estar vinculado a uma organização.';
      } else if (error.message.includes('não autenticado')) {
        errorMessage = 'Sessão expirada. Por favor, faça login novamente.';
      } else if (error.message.includes('Dados inválidos')) {
        errorMessage = error.message;
      }

      toast({
        title: error.message === 'Conflito de horário' ? 'Conflito de Horário' : 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  });
}

// Delete appointment mutation
export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      if (!appointmentId) {
        throw new Error('ID do agendamento é obrigatório');
      }

      // Obter organization_id para garantir segurança
      const organizationId = await requireUserOrganizationId();

      // Buscar dados do agendamento antes de deletar (para notificação)
      const currentAppointments = queryClient.getQueryData<AppointmentsQueryResult>(appointmentKeys.list())?.data || [];
      const appointment = currentAppointments.find(apt => apt.id === appointmentId);

      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId)
        .eq('organization_id', organizationId); // Garantir que só deleta da própria organização

      if (error) {
        logger.error('Erro ao deletar agendamento', error, 'useAppointments');

        if (error.message?.includes('violates row-level security')) {
          throw new Error('Você não tem permissão para deletar este agendamento.');
        }
        if (error.code === 'PGRST116') {
          throw new Error('Agendamento não encontrado ou já foi deletado.');
        }

        throw error;
      }

      // Notificar cancelamento se encontrou os dados
      if (appointment) {
        AppointmentNotificationService.notifyCancellation(
          appointment.id,
          appointment.patientId,
          appointment.date,
          appointment.time,
          appointment.patientName
        );
      }

      return appointmentId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      // Otimistic update: remover da cache imediatamente
      queryClient.setQueryData(
        appointmentKeys.list(),
        (old: AppointmentsQueryResult | undefined) => ({
          ...old,
          data: (old?.data || []).filter(apt => apt.id !== variables.appointmentId)
        })
      );
      toast({
        title: 'Sucesso',
        description: 'Agendamento excluído com sucesso'
      });
    },
    onError: (error) => {
      logger.error('Erro ao excluir agendamento', error, 'useAppointments');
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o agendamento',
        variant: 'destructive'
      });
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
      const organizationId = await requireUserOrganizationId();

      const { data, error } = await supabase
        .from('appointments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', appointmentId)
        .eq('organization_id', organizationId) // Garantir segurança
        .select()
        .single();

      if (error) {
        logger.error('Erro ao atualizar status do agendamento', error, 'useAppointments');

        if (error.message?.includes('violates row-level security')) {
          throw new Error('Você não tem permissão para atualizar este agendamento.');
        }
        if (error.code === 'PGRST116') {
          throw new Error('Agendamento não encontrado.');
        }

        throw error;
      }

      if (!data) {
        throw new Error('Agendamento não encontrado após atualização');
      }

      return data;
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
