import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VerifiedAppointmentSchema } from '@/schemas/appointment';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { AppointmentBase, AppointmentFormData, AppointmentStatus, AppointmentType } from '@/types/appointment';
import { checkAppointmentConflict } from '@/utils/appointmentValidation';
import { logger } from '@/lib/errors/logger';
import { useEffect } from 'react';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { AppointmentNotificationService } from '@/lib/services/AppointmentNotificationService';
import { requireUserOrganizationId, getUserOrganizationId } from '@/utils/userHelpers';
import { dateSchema, timeSchema } from '@/lib/validations/agenda';

// Função auxiliar para criar timeout em promises (suporta PromiseLike do Supabase)
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

// Fetch all appointments with improved error handling and validation
import { useAuth } from '@/contexts/AuthContext';
import { appointmentsCacheService } from '@/lib/offline/AppointmentsCacheService';

// Flag para indicar se dados vieram do cache
export interface AppointmentsQueryResult {
  data: AppointmentBase[];
  isFromCache: boolean;
  cacheTimestamp: string | null;
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
    const validationErrors: any[] = [];

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

    // Salvar no cache atualizado
    appointmentsCacheService.saveToCache(transformedAppointments, organizationId || undefined);

    timer();
    return { data: transformedAppointments, isFromCache: false, cacheTimestamp: null };

  } catch (error: any) {
    logger.error('Erro crítico no fetchAppointments', error, 'useAppointments');

    // Último recurso: tentar cache se algo crítico falhou
    timer();
    return getFromCacheWithMetadata();
  }
}

// Função auxiliar para detectar erros de rede
function isNetworkError(error: any): boolean {
  if (!error) return false;
  // Log message para debug
  // console.log('Checking network error:', error); 

  const message = (error.message || '').toLowerCase();

  // Lista extensiva de erros de rede
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('fetch') ||
    message.includes('failed to fetch') ||
    message.includes('connection') ||
    message.includes('offline') ||
    message.includes('load failed') ||
    error.name === 'TypeError' && message === 'failed to fetch' ||
    !navigator.onLine
  );
}

// Função auxiliar para obter dados do cache com metadata
async function getFromCacheWithMetadata(organizationId?: string): Promise<AppointmentsQueryResult> {
  try {
    const cacheResult = await appointmentsCacheService.getFromCache(organizationId);

    if (cacheResult.data.length > 0) {
      const ageMinutes = appointmentsCacheService.getCacheAgeMinutes();
      logger.info('Usando dados do cache (Fallback)', {
        count: cacheResult.data.length,
        ageMinutes,
        isStale: cacheResult.isStale
      }, 'useAppointments');

      return {
        data: cacheResult.data,
        isFromCache: true,
        cacheTimestamp: cacheResult.metadata?.lastUpdated || null,
      };
    }
  } catch (cacheError) {
    logger.error('Falha ao ler cache', cacheError, 'useAppointments');
  }
  return { data: [], isFromCache: false, cacheTimestamp: null };
}

// Main hook to fetch appointments with Realtime support
export function useAppointments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const organizationId = profile?.organization_id;

  // Setup Realtime subscription using custom hook
  useRealtimeSubscription({
    table: 'appointments',
    queryKey: ['appointments'],
    enabled: !!organizationId
  });

  // Listener específico para toasts (opcional, mantendo comportamento anterior se desejado, 
  // mas idealmente movido para um lugar central ou mantido aqui apenas para UX específica)
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel('appointments-toasts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast, organizationId]);

  const query = useQuery({
    queryKey: ['appointments', organizationId], // Include organizationId in query key
    queryFn: () => fetchAppointments(organizationId),
    staleTime: 1000 * 10, // 10 segundos (dados mais frescos conforme solicitado)
    gcTime: 1000 * 60 * 5, // 5 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Garantir que sempre retorne um resultado válido
    placeholderData: { data: [], isFromCache: false, cacheTimestamp: null },
    enabled: !!organizationId || !!user, // Enable if we have org ID OR if user is logged in (we can fetch org ID)
  });

  // Extrair dados do resultado
  const result = query.data as AppointmentsQueryResult | undefined;

  // Função helper para forçar atualização como Promise
  const refreshAppointments = async () => {
    return await query.refetch();
  };

  return {
    ...query,
    data: result?.data || [],
    isFromCache: result?.isFromCache || false,
    cacheTimestamp: result?.cacheTimestamp || null,
    refreshAppointments, // Expose promise-based refresh
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
      const currentAppointments = queryClient.getQueryData<AppointmentBase[]>(['appointments']) || [];
      const conflict = checkAppointmentConflict({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
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
          const conflict = checkAppointmentConflict({
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

      const updateData: any = {};

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

      const { data: updatedAppointment, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)
        .eq('organization_id', organizationId) // Garantir que só atualiza da própria organização
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
        logger.error('Erro ao atualizar agendamento no Supabase', error, 'useAppointments');

        // Melhorar mensagens de erro
        if (error.message?.includes('violates row-level security')) {
          throw new Error('Você não tem permissão para atualizar este agendamento.');
        }
        if (error.code === 'PGRST116') {
          throw new Error('Agendamento não encontrado ou você não tem permissão para acessá-lo.');
        }
        // Tratamento para erro 400 data inválida
        if (error.code === '22007' || error.code === '22008' || error.message?.includes('invalid input syntax')) {
          throw new Error('Dados inválidos ao atualizar agendamento. Verifique data e hora.');
        }

        throw error;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
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
      const currentAppointments = queryClient.getQueryData<AppointmentBase[]>(['appointments']) || [];
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
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
export function useAppointmentsFiltered(_filters: any) {
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
