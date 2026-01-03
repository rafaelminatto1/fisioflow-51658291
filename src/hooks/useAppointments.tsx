import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AppointmentBase, AppointmentFormData, AppointmentStatus, AppointmentType } from '@/types/appointment';
import { checkAppointmentConflict } from '@/utils/appointmentValidation';
import { logger } from '@/lib/errors/logger';
import { useEffect } from 'react';
import { AppointmentNotificationService } from '@/lib/services/AppointmentNotificationService';
import { requireUserOrganizationId } from '@/utils/userHelpers';

// Fetch all appointments
async function fetchAppointments(): Promise<AppointmentBase[]> {
  const timer = logger.startTimer('fetchAppointments');
  
  logger.info('Carregando agendamentos do Supabase', {}, 'useAppointments');
  
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patients!inner(
        id,
        name,
        phone,
        email
      )
    `)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true });

  if (error) {
    logger.error('Erro ao buscar agendamentos', error, 'useAppointments');
    throw error;
  }

  const transformedAppointments: AppointmentBase[] = (data || []).map(apt => ({
    id: apt.id,
    patientId: apt.patient_id,
    patientName: apt.patients?.name || 'Paciente não identificado',
    phone: apt.patients?.phone || '',
    date: new Date(apt.appointment_date),
    time: apt.appointment_time,
    duration: apt.duration || 60,
    type: apt.type as AppointmentType,
    status: apt.status as AppointmentStatus,
    notes: apt.notes || '',
    createdAt: new Date(apt.created_at),
    updatedAt: new Date(apt.updated_at)
  }));
  
  logger.info(`Agendamentos carregados: ${transformedAppointments.length} registros`, { count: transformedAppointments.length }, 'useAppointments');
  timer();
  
  return transformedAppointments;
}

// Main hook to fetch appointments with Realtime support
export function useAppointments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Setup Realtime subscription
  useEffect(() => {
    logger.info('Configurando Supabase Realtime para appointments', {}, 'useAppointments');
    
    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          logger.info('Realtime event recebido', { event: payload.eventType }, 'useAppointments');
          
          // Invalidate and refetch appointments when changes occur
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
          
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
      logger.info('Removendo subscription Realtime', {}, 'useAppointments');
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  return useQuery({
    queryKey: ['appointments'],
    queryFn: fetchAppointments,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Create appointment mutation
export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      logger.info('Criando novo agendamento', { patientId: data.patient_id, date: data.appointment_date }, 'useAppointments');

      // Obter organization_id do usuário
      const organizationId = await requireUserOrganizationId();

      // Check for conflicts with current data
      const currentAppointments = queryClient.getQueryData<AppointmentBase[]>(['appointments']) || [];
      const conflict = checkAppointmentConflict({
        date: new Date(data.appointment_date),
        time: data.appointment_time,
        duration: data.duration,
        appointments: currentAppointments
      });

      if (conflict.hasConflict) {
        logger.warn('Conflito de horário detectado', { appointmentData: data }, 'useAppointments');
        throw new Error('Conflito de horário');
      }

      const { data: newAppointment, error} = await supabase
        .from('appointments')
        .insert({
          patient_id: data.patient_id,
          appointment_date: data.appointment_date,
          appointment_time: data.appointment_time,
          duration: data.duration,
          type: data.type,
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
            name,
            phone,
            email
          )
        `)
        .single();

      if (error) {
        logger.error('Erro ao inserir agendamento no Supabase', error, 'useAppointments');
        throw error;
      }

      const appointment: AppointmentBase = {
        id: newAppointment.id,
        patientId: newAppointment.patient_id,
        patientName: newAppointment.patients.name,
        phone: newAppointment.patients.phone,
        date: new Date(newAppointment.appointment_date),
        time: newAppointment.appointment_time,
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

  return useMutation({
    mutationFn: async ({ appointmentId, updates }: { appointmentId: string; updates: Partial<AppointmentFormData> }) => {
      logger.info('Atualizando agendamento', { appointmentId, updates }, 'useAppointments');

      // Obter organization_id do usuário para garantir segurança
      const organizationId = await requireUserOrganizationId();

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

          if (conflict.hasConflict) {
            throw new Error('Conflito de horário');
          }
        }
      }

      const updateData: any = {};
      if (updates.patient_id) updateData.patient_id = updates.patient_id;
      if (updates.appointment_date) updateData.appointment_date = updates.appointment_date;
      if (updates.appointment_time) updateData.appointment_time = updates.appointment_time;
      if (updates.duration) updateData.duration = updates.duration;
      if (updates.type) updateData.type = updates.type;
      if (updates.status) updateData.status = updates.status;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;
      if (updates.therapist_id !== undefined) updateData.therapist_id = updates.therapist_id;
      if (updates.room !== undefined) updateData.room = updates.room;

      const { data: updatedAppointment, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)
        .eq('organization_id', organizationId) // Garantir que só atualiza da própria organização
        .select(`
          *,
          patients!inner(
            id,
            name,
            phone,
            email
          )
        `)
        .single();

      if (error) {
        logger.error('Erro ao atualizar agendamento no Supabase', error, 'useAppointments');
        throw error;
      }

      const transformedAppointment: AppointmentBase = {
        id: updatedAppointment.id,
        patientId: updatedAppointment.patient_id,
        patientName: updatedAppointment.patients?.name || 'Paciente não identificado',
        phone: updatedAppointment.patients?.phone || '',
        date: new Date(updatedAppointment.appointment_date),
        time: updatedAppointment.appointment_time,
        duration: updatedAppointment.duration || 60,
        type: updatedAppointment.type as AppointmentType,
        status: updatedAppointment.status as AppointmentStatus,
        notes: updatedAppointment.notes || '',
        createdAt: new Date(updatedAppointment.created_at),
        updatedAt: new Date(updatedAppointment.updated_at)
      };

      logger.info('Agendamento atualizado com sucesso', { appointmentId: transformedAppointment.id }, 'useAppointments');
      
      // Se data/hora mudou, notificar reagendamento
      if (updates.appointment_date || updates.appointment_time) {
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
      // Buscar dados do agendamento antes de deletar (para notificação)
      const currentAppointments = queryClient.getQueryData<AppointmentBase[]>(['appointments']) || [];
      const appointment = currentAppointments.find(apt => apt.id === appointmentId);

      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;
      
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
      const { data, error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;
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
