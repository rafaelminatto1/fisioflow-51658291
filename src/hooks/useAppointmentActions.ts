import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ErrorHandler } from '@/lib/errors/ErrorHandler';
import { AppointmentService } from '@/services/appointmentService';

export const useAppointmentActions = () => {
  const queryClient = useQueryClient();

  const confirmAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      await AppointmentService.updateStatus(appointmentId, 'confirmado');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Agendamento confirmado com sucesso');
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useAppointmentActions.confirm');
    },
  });

  const cancelAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      await AppointmentService.updateStatus(appointmentId, 'cancelado');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Agendamento cancelado');
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useAppointmentActions.cancel');
    },
  });

  const rescheduleAppointment = useMutation({
    mutationFn: async ({
      appointmentId,
      newDate,
      newTime
    }: {
      appointmentId: string;
      newDate: string;
      newTime: string;
    }) => {
      // NOTE: Reschedule is an update, so we need to use updateAppointment which requires organizationId.
      // However, we don't have it easily available here without fetching it or using auth context.
      // Since reschedule is a complex operation (update date/time + status), it's better handled by updateAppointment.
      // But updateAppointment needs OrganizationID.
      // For now, I will keep reschedule as is OR better, delegate to useUpdateAppointment logic or similar if possible.
      // BUT, since we want to extract logic, let's keep it consistent.
      // We can fetch org ID inside the service if we change the service signature, OR we assume we can get it via helper.
      // Given the previous pattern in useAppointments, we can use requireUserOrganizationId() inside the mutation here too.
      // Let's defer to service but we need orgId.
      // Actually, standard updateStatus works by ID. updateAppointment works by ID + OrgID.
      // Let's refactor this hook to just wrap the service calls properly.
      // For reschedule, I'll invoke AppointmentService.updateAppointment.
      // To get orgId, I need strict auth.

      const { getUserOrganizationId } = await import('@/utils/userHelpers');
      const organizationId = await getUserOrganizationId();

      return await AppointmentService.updateAppointment(appointmentId, {
        appointment_date: newDate,
        appointment_time: newTime,
        status: 'reagendado'
      }, organizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Agendamento reagendado com sucesso');
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useAppointmentActions.reschedule');
    },
  });

  const completeAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      await AppointmentService.updateStatus(appointmentId, 'concluido');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Consulta marcada como concluída');
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useAppointmentActions.complete');
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: string; status: string }) => {
      await AppointmentService.updateStatus(appointmentId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Status atualizado com sucesso');
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useAppointmentActions.updateStatus');
    },
  });

  return {
    confirmAppointment: confirmAppointment.mutate,
    cancelAppointment: cancelAppointment.mutate,
    rescheduleAppointment: rescheduleAppointment.mutate,
    completeAppointment: completeAppointment.mutate,
    updateStatus: updateStatus.mutate,
    isConfirming: confirmAppointment.isPending,
    isCanceling: cancelAppointment.isPending,
    isRescheduling: rescheduleAppointment.isPending,
    isCompleting: completeAppointment.isPending,
    isUpdatingStatus: updateStatus.isPending,
  };
};
