import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppointmentService } from '@/lib/services/AppointmentService';
import { agendaKeys } from './useAgenda';
import { getWeekStart, formatDate } from '@/utils/agendaUtils';
import type { 
  Appointment, 
  CreateAppointmentData, 
  UpdateAppointmentData,
  AgendaFilters 
} from '@/types/agenda';

// Query keys for appointments
export const appointmentKeys = {
  all: ['appointments'] as const,
  byId: (id: string) => [...appointmentKeys.all, 'byId', id] as const,
  byPatient: (patientId: string) => [...appointmentKeys.all, 'byPatient', patientId] as const,
  byTherapist: (therapistId: string) => [...appointmentKeys.all, 'byTherapist', therapistId] as const,
  filtered: (filters: AgendaFilters) => [...appointmentKeys.all, 'filtered', filters] as const,
};

interface UseAppointmentsOptions {
  enableOptimisticUpdates?: boolean;
  enableRealtime?: boolean;
}

/**
 * Hook for getting a single appointment
 */
export function useAppointment(appointmentId: string | undefined) {
  return useQuery({
    queryKey: appointmentKeys.byId(appointmentId || ''),
    queryFn: () => AppointmentService.getAppointment(appointmentId!),
    enabled: !!appointmentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for getting appointments with filters
 */
export function useAppointmentsFiltered(filters: AgendaFilters = {}) {
  return useQuery({
    queryKey: appointmentKeys.filtered(filters),
    queryFn: () => AppointmentService.getAppointments(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook for getting patient appointments
 */
export function usePatientAppointments(
  patientId: string | undefined, 
  filters: Partial<AgendaFilters> = {}
) {
  return useQuery({
    queryKey: appointmentKeys.byPatient(patientId || ''),
    queryFn: () => AppointmentService.getPatientAppointments(patientId!, filters),
    enabled: !!patientId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for getting therapist appointments
 */
export function useTherapistAppointments(
  therapistId: string | undefined,
  filters: Partial<AgendaFilters> = {}
) {
  return useQuery({
    queryKey: appointmentKeys.byTherapist(therapistId || ''),
    queryFn: () => AppointmentService.getTherapistAppointments(therapistId!, filters),
    enabled: !!therapistId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for creating appointments with optimistic updates
 */
export function useCreateAppointment(options: UseAppointmentsOptions = {}) {
  const { enableOptimisticUpdates = true } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAppointmentData) => AppointmentService.createAppointment(data),
    
    onMutate: async (newAppointment) => {
      if (!enableOptimisticUpdates) return;

      // Cancel outgoing refetches
      const weekStart = getWeekStart(new Date(newAppointment.date));
      await queryClient.cancelQueries({ queryKey: agendaKeys.weekly(weekStart) });

      // Snapshot previous value
      const previousWeekData = queryClient.getQueryData(agendaKeys.weekly(weekStart));

      // Optimistically update the cache
      if (previousWeekData) {
        const optimisticAppointment: Appointment = {
          id: `temp-${Date.now()}`, // Temporary ID
          ...newAppointment,
          status: 'scheduled',
          payment_status: 'pending',
          notes: newAppointment.notes || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData(agendaKeys.weekly(weekStart), (old: any) => ({
          ...old,
          appointments: [...(old?.appointments || []), optimisticAppointment]
        }));
      }

      return { previousWeekData, weekStart };
    },

    onError: (err, newAppointment, context) => {
      // Rollback optimistic update on error
      if (context?.previousWeekData && context?.weekStart) {
        queryClient.setQueryData(agendaKeys.weekly(context.weekStart), context.previousWeekData);
      }
    },

    onSuccess: (createdAppointment, variables, context) => {
      // Update the optimistic appointment with real data
      const weekStart = getWeekStart(new Date(createdAppointment.date));
      
      queryClient.setQueryData(agendaKeys.weekly(weekStart), (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          appointments: old.appointments.map((apt: Appointment) => 
            apt.id.startsWith('temp-') ? createdAppointment : apt
          )
        };
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.byPatient(createdAppointment.patient_id) });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.byTherapist(createdAppointment.therapist_id) });
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: agendaKeys.all });
    },
  });
}

/**
 * Hook for updating appointments with optimistic updates
 */
export function useUpdateAppointment(options: UseAppointmentsOptions = {}) {
  const { enableOptimisticUpdates = true } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, updates }: { appointmentId: string; updates: UpdateAppointmentData }) =>
      AppointmentService.updateAppointment(appointmentId, updates),

    onMutate: async ({ appointmentId, updates }) => {
      if (!enableOptimisticUpdates) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: appointmentKeys.byId(appointmentId) });

      // Snapshot previous value
      const previousAppointment = queryClient.getQueryData(appointmentKeys.byId(appointmentId));

      // Optimistically update the appointment
      if (previousAppointment) {
        const optimisticAppointment = {
          ...previousAppointment as Appointment,
          ...updates,
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData(appointmentKeys.byId(appointmentId), optimisticAppointment);

        // Update in weekly data if date is changing
        if (updates.date) {
          const oldWeekStart = getWeekStart(new Date((previousAppointment as Appointment).date));
          const newWeekStart = getWeekStart(new Date(updates.date));

          // Remove from old week
          queryClient.setQueryData(agendaKeys.weekly(oldWeekStart), (old: any) => {
            if (!old) return old;
            return {
              ...old,
              appointments: old.appointments.filter((apt: Appointment) => apt.id !== appointmentId)
            };
          });

          // Add to new week
          queryClient.setQueryData(agendaKeys.weekly(newWeekStart), (old: any) => {
            if (!old) return old;
            return {
              ...old,
              appointments: [...old.appointments, optimisticAppointment]
            };
          });
        } else {
          // Update in current week
          const weekStart = getWeekStart(new Date((previousAppointment as Appointment).date));
          queryClient.setQueryData(agendaKeys.weekly(weekStart), (old: any) => {
            if (!old) return old;
            return {
              ...old,
              appointments: old.appointments.map((apt: Appointment) =>
                apt.id === appointmentId ? optimisticAppointment : apt
              )
            };
          });
        }
      }

      return { previousAppointment };
    },

    onError: (err, { appointmentId }, context) => {
      // Rollback optimistic update on error
      if (context?.previousAppointment) {
        queryClient.setQueryData(appointmentKeys.byId(appointmentId), context.previousAppointment);
      }
    },

    onSuccess: (updatedAppointment, { appointmentId }) => {
      // Update with real data
      queryClient.setQueryData(appointmentKeys.byId(appointmentId), updatedAppointment);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: appointmentKeys.byPatient(updatedAppointment.patient_id) });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.byTherapist(updatedAppointment.therapist_id) });
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: agendaKeys.all });
    },
  });
}

/**
 * Hook for deleting appointments
 */
export function useDeleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentId: string) => AppointmentService.deleteAppointment(appointmentId),

    onMutate: async (appointmentId) => {
      // Get appointment data before deletion for rollback
      const appointment = queryClient.getQueryData(appointmentKeys.byId(appointmentId)) as Appointment;
      
      if (appointment) {
        // Remove from weekly data optimistically
        const weekStart = getWeekStart(new Date(appointment.date));
        
        queryClient.setQueryData(agendaKeys.weekly(weekStart), (old: any) => {
          if (!old) return old;
          return {
            ...old,
            appointments: old.appointments.filter((apt: Appointment) => apt.id !== appointmentId)
          };
        });

        // Remove from individual query
        queryClient.removeQueries({ queryKey: appointmentKeys.byId(appointmentId) });
      }

      return { appointment };
    },

    onError: (err, appointmentId, context) => {
      // Rollback on error
      if (context?.appointment) {
        const weekStart = getWeekStart(new Date(context.appointment.date));
        
        queryClient.setQueryData(agendaKeys.weekly(weekStart), (old: any) => {
          if (!old) return old;
          return {
            ...old,
            appointments: [...old.appointments, context.appointment]
          };
        });

        queryClient.setQueryData(appointmentKeys.byId(appointmentId), context.appointment);
      }
    },

    onSuccess: (_, appointmentId, context) => {
      // Invalidate related queries
      if (context?.appointment) {
        queryClient.invalidateQueries({ queryKey: appointmentKeys.byPatient(context.appointment.patient_id) });
        queryClient.invalidateQueries({ queryKey: appointmentKeys.byTherapist(context.appointment.therapist_id) });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.all });
    },
  });
}

/**
 * Hook for updating appointment status with optimistic updates
 */
export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, status }: { appointmentId: string; status: Appointment['status'] }) =>
      AppointmentService.updateAppointmentStatus(appointmentId, status),

    onMutate: async ({ appointmentId, status }) => {
      // Optimistically update status
      const previousAppointment = queryClient.getQueryData(appointmentKeys.byId(appointmentId));
      
      if (previousAppointment) {
        const optimisticAppointment = {
          ...previousAppointment as Appointment,
          status,
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData(appointmentKeys.byId(appointmentId), optimisticAppointment);

        // Update in weekly data
        const weekStart = getWeekStart(new Date((previousAppointment as Appointment).date));
        queryClient.setQueryData(agendaKeys.weekly(weekStart), (old: any) => {
          if (!old) return old;
          return {
            ...old,
            appointments: old.appointments.map((apt: Appointment) =>
              apt.id === appointmentId ? optimisticAppointment : apt
            )
          };
        });
      }

      return { previousAppointment };
    },

    onError: (err, { appointmentId }, context) => {
      if (context?.previousAppointment) {
        queryClient.setQueryData(appointmentKeys.byId(appointmentId), context.previousAppointment);
      }
    },

    onSuccess: (updatedAppointment, { appointmentId }) => {
      queryClient.setQueryData(appointmentKeys.byId(appointmentId), updatedAppointment);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.all });
    },
  });
}

/**
 * Hook for updating payment status
 */
export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, paymentStatus }: { 
      appointmentId: string; 
      paymentStatus: Appointment['payment_status'] 
    }) => AppointmentService.updatePaymentStatus(appointmentId, paymentStatus),

    onSuccess: (updatedAppointment, { appointmentId }) => {
      queryClient.setQueryData(appointmentKeys.byId(appointmentId), updatedAppointment);
      queryClient.invalidateQueries({ queryKey: agendaKeys.all });
    },
  });
}

/**
 * Hook for rescheduling appointments
 */
export function useRescheduleAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      appointmentId, 
      newDate, 
      newStartTime, 
      newEndTime 
    }: { 
      appointmentId: string; 
      newDate: string; 
      newStartTime: string; 
      newEndTime: string; 
    }) => AppointmentService.rescheduleAppointment(appointmentId, newDate, newStartTime, newEndTime),

    onSuccess: (updatedAppointment, { appointmentId }) => {
      queryClient.setQueryData(appointmentKeys.byId(appointmentId), updatedAppointment);
      queryClient.invalidateQueries({ queryKey: agendaKeys.all });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.byPatient(updatedAppointment.patient_id) });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.byTherapist(updatedAppointment.therapist_id) });
    },
  });
}

/**
 * Utility hook for invalidating appointment queries
 */
export function useInvalidateAppointments() {
  const queryClient = useQueryClient();

  return useCallback((scope?: 'all' | 'agenda' | string) => {
    if (scope === 'all') {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    } else if (scope === 'agenda') {
      queryClient.invalidateQueries({ queryKey: agendaKeys.all });
    } else if (scope) {
      // Invalidate specific appointment
      queryClient.invalidateQueries({ queryKey: appointmentKeys.byId(scope) });
    } else {
      // Invalidate everything
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.invalidateQueries({ queryKey: agendaKeys.all });
    }
  }, [queryClient]);
}

/**
 * Hook for bulk operations on appointments
 */
export function useBulkAppointmentOperations() {
  const queryClient = useQueryClient();

  const bulkUpdateStatus = useMutation({
    mutationFn: async ({ appointmentIds, status }: { 
      appointmentIds: string[]; 
      status: Appointment['status'] 
    }) => {
      const promises = appointmentIds.map(id => 
        AppointmentService.updateAppointmentStatus(id, status)
      );
      return Promise.all(promises);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.invalidateQueries({ queryKey: agendaKeys.all });
    },
  });

  const bulkDelete = useMutation({
    mutationFn: async (appointmentIds: string[]) => {
      const promises = appointmentIds.map(id => 
        AppointmentService.deleteAppointment(id)
      );
      return Promise.all(promises);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.invalidateQueries({ queryKey: agendaKeys.all });
    },
  });

  return {
    bulkUpdateStatus,
    bulkDelete,
  };
}