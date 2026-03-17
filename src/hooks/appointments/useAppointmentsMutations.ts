/**
 * useAppointmentsMutations — create/update/delete/status com optimistic updates.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AppointmentBase, AppointmentFormData, AppointmentStatus } from '@/types/appointment';
import { AppointmentService } from '@/services/appointmentService';
import { ErrorHandler } from '@/lib/errors/ErrorHandler';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { isAppointmentConflictError } from '@/utils/appointmentErrors';
import { invalidateAffectedPeriods } from '@/utils/cacheInvalidation';
import { formatDateToLocalISO } from '@/utils/dateUtils';
import { requireUserOrganizationId } from '@/utils/userHelpers';
import { AppointmentNotificationService } from '@/lib/services/AppointmentNotificationService';
import { parseUpdatesToAppointment } from '../appointmentOptimistic';
import { appointmentKeys } from './useAppointmentsData';
import { type AppointmentsQueryResult } from './useAppointmentsCache';
import { appointmentPeriodKeys } from '../useAppointmentsByPeriod';

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: AppointmentFormData & { ignoreCapacity?: boolean }) => {
      const organizationId = profile?.organization_id || (await requireUserOrganizationId());
      const currentResult = queryClient.getQueryData<AppointmentsQueryResult>(
        appointmentKeys.list(profile?.organization_id)
      );
      return AppointmentService.createAppointment(data, organizationId, currentResult?.data || []);
    },
    onMutate: async variables => {
      await queryClient.cancelQueries({ queryKey: appointmentKeys.list(profile?.organization_id) });
      const previousData = queryClient.getQueryData<AppointmentsQueryResult>(
        appointmentKeys.list(profile?.organization_id)
      );

      const tempId = `temp-${Date.now()}`;
      const optimisticAppointment: AppointmentBase = {
        id: tempId,
        patientId: variables.patient_id,
        patientName: variables.patient_name || variables.patient_id || '',
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
          data: [...(old?.data || []), optimisticAppointment],
        })
      );

      return { previousData, tempId };
    },
    onSuccess: async (data, _variables, context) => {
      queryClient.setQueryData(
        appointmentKeys.list(profile?.organization_id),
        (old: AppointmentsQueryResult | undefined) => ({
          ...old,
          data: [...(old?.data.filter(apt => apt.id !== context?.tempId) || []), data],
        })
      );

      await queryClient.invalidateQueries({ queryKey: appointmentPeriodKeys.all });
      await queryClient.invalidateQueries({ queryKey: appointmentPeriodKeys.all });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });

      toast({ title: 'Sucesso', description: 'Agendamento criado com sucesso' });

      AppointmentNotificationService.scheduleNotification(
        data.id,
        data.patientId,
        data.date,
        data.time,
        data.patientName
      );
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(appointmentKeys.list(profile?.organization_id), context.previousData);
      }
      if (isAppointmentConflictError(error)) {
        ErrorHandler.handle(error, 'useCreateAppointment', { showNotification: false });
      } else {
        ErrorHandler.handle(error, 'useCreateAppointment');
      }
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      updates,
      ignoreCapacity,
    }: {
      appointmentId: string;
      updates: Partial<AppointmentFormData>;
      ignoreCapacity?: boolean;
    }) => {
      const organizationId = profile?.organization_id || (await requireUserOrganizationId());
      return AppointmentService.updateAppointment(
        appointmentId,
        { ...updates, ignoreCapacity },
        organizationId
      );
    },
    networkMode: 'offlineFirst',
    onMutate: async variables => {
      const organizationId = profile?.organization_id;
      await queryClient.cancelQueries({ queryKey: appointmentKeys.list(organizationId) });
      await queryClient.cancelQueries({ queryKey: appointmentPeriodKeys.all });

      const previousData = queryClient.getQueryData<AppointmentsQueryResult>(
        appointmentKeys.list(organizationId)
      );
      const previousPeriodQueries = queryClient.getQueriesData({ queryKey: appointmentPeriodKeys.all });
      const parsedUpdates = parseUpdatesToAppointment(variables.updates);

      queryClient.setQueryData(
        appointmentKeys.list(organizationId),
        (old: AppointmentsQueryResult | undefined) => ({
          ...old,
          data: old?.data.map(apt =>
            apt.id === variables.appointmentId ? { ...apt, ...parsedUpdates } : apt
          ) || [],
        })
      );

      queryClient.setQueriesData(
        { queryKey: appointmentPeriodKeys.all },
        (old: AppointmentBase[] | undefined) =>
          old?.map(apt =>
            apt.id === variables.appointmentId ? { ...apt, ...parsedUpdates } : apt
          )
      );

      return { previousData, previousPeriodQueries };
    },
    onSuccess: async (data, variables) => {
      const organizationId = profile?.organization_id || '';
      const newDate = formatDateToLocalISO(data.date);
      await invalidateAffectedPeriods(newDate, queryClient, organizationId);

      if (variables.updates.appointment_date || variables.updates.date) {
        await queryClient.invalidateQueries({ queryKey: appointmentPeriodKeys.all });
      }

      queryClient.invalidateQueries({ queryKey: appointmentKeys.list(organizationId), exact: false });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(data.id) });

      await queryClient.refetchQueries({ queryKey: appointmentPeriodKeys.all, type: 'active' });

      toast({ title: 'Sucesso', description: 'Agendamento atualizado com sucesso' });
    },
    onError: (error: Error, _variables, context) => {
      const organizationId = profile?.organization_id;
      if (context?.previousData) {
        queryClient.setQueryData(appointmentKeys.list(organizationId), context.previousData);
      }
      context?.previousPeriodQueries?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (isAppointmentConflictError(error)) {
        ErrorHandler.handle(error, 'useUpdateAppointment', { showNotification: false });
      } else {
        ErrorHandler.handle(error, 'useUpdateAppointment');
      }
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const organizationId = profile?.organization_id || (await requireUserOrganizationId());
      const currentResult = queryClient.getQueryData<AppointmentsQueryResult>(
        appointmentKeys.list(profile?.organization_id)
      );
      const appointment = currentResult?.data.find(apt => apt.id === appointmentId);
      await AppointmentService.deleteAppointment(appointmentId, organizationId);
      return { appointmentId, appointment };
    },
    onSuccess: async ({ appointmentId, appointment }) => {
      if (appointment) {
        const appointmentDate = formatDateToLocalISO(appointment.date);
        await invalidateAffectedPeriods(
          appointmentDate,
          queryClient,
          profile?.organization_id || ''
        );
      }
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.removeQueries({ queryKey: appointmentKeys.detail(appointmentId) });
      await queryClient.refetchQueries({ queryKey: appointmentPeriodKeys.all });

      toast({ title: 'Sucesso', description: 'Agendamento excluído com sucesso' });
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useDeleteAppointment');
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      status,
    }: {
      appointmentId: string;
      status: AppointmentStatus;
    }) => {
      if (!appointmentId) throw new Error('ID do agendamento é obrigatório');
      if (!status) throw new Error('Status é obrigatório');
      await requireUserOrganizationId();
      return await AppointmentService.updateStatus(appointmentId, status);
    },
    onMutate: async ({ appointmentId, status }) => {
      const organizationId = profile?.organization_id;

      await queryClient.cancelQueries({ queryKey: appointmentKeys.list(organizationId) });
      await queryClient.cancelQueries({ queryKey: appointmentPeriodKeys.all });

      const previousData = queryClient.getQueryData<AppointmentsQueryResult>(
        appointmentKeys.list(organizationId)
      );
      const previousPeriodQueries = queryClient.getQueriesData({ queryKey: appointmentPeriodKeys.all });

      // Atualiza o cache principal imediatamente
      queryClient.setQueryData(
        appointmentKeys.list(organizationId),
        (old: AppointmentsQueryResult | undefined) => ({
          ...old,
          data: (old?.data || []).map(apt =>
            apt.id === appointmentId ? { ...apt, status } : apt
          ),
        })
      );

      // Atualiza todas as queries de período (visão semanal/diária do calendário)
      queryClient.setQueriesData(
        { queryKey: appointmentPeriodKeys.all },
        (old: AppointmentBase[] | undefined) =>
          old?.map(apt => apt.id === appointmentId ? { ...apt, status } : apt)
      );

      return { previousData, previousPeriodQueries };
    },
    onSuccess: (updatedData, variables) => {
      const organizationId = profile?.organization_id;
      const { appointmentId } = variables;

      // Se tivermos os dados atualizados, injetamos no cache para evitar o "flicker" de refetch
      if (updatedData) {
        queryClient.setQueryData(
          appointmentKeys.list(organizationId),
          (old: AppointmentsQueryResult | undefined) => ({
            ...old,
            data: (old?.data || []).map(apt =>
              apt.id === appointmentId ? { ...apt, ...updatedData } : apt
            ),
          })
        );

        queryClient.setQueriesData(
          { queryKey: appointmentPeriodKeys.all },
          (old: AppointmentBase[] | undefined) =>
            old?.map(apt => apt.id === appointmentId ? { ...apt, ...updatedData } : apt)
        );
      }

      queryClient.invalidateQueries({ queryKey: appointmentKeys.list(organizationId), exact: false });
      queryClient.invalidateQueries({ queryKey: appointmentPeriodKeys.all });
      // Apenas invalidamos, não forçamos refetch imediato 'active' que causaria flicker
      queryClient.invalidateQueries({ queryKey: appointmentPeriodKeys.all });
      
      toast({ title: 'Status atualizado', description: `Status alterado para ${variables.status}` });
    },
    onError: (error, _variables, context) => {
      const organizationId = profile?.organization_id;
      if (context?.previousData) {
        queryClient.setQueryData(appointmentKeys.list(organizationId), context.previousData);
      }
      context?.previousPeriodQueries?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      logger.error('Erro ao atualizar status', error, 'useAppointmentsMutations');
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
        variant: 'destructive',
      });
    },
  });
}
