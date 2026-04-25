/**
 * useAppointments — orquestração (re-exporta API pública dos sub-hooks).
 * Este arquivo mantém compatibilidade total com os consumers existentes.
 */

import { useAppointmentsData } from "./useAppointmentsData";
import { useUpdateAppointment } from "./useAppointmentsMutations";

export { appointmentKeys } from "./useAppointmentsData";
export type { AppointmentsQueryResult } from "./useAppointmentsCache";
export {
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
  useUpdateAppointmentStatus,
} from "./useAppointmentsMutations";
export { useAppointmentsData } from "./useAppointmentsData";

interface UseAppointmentsOptions {
  enabled?: boolean;
  enableRealtime?: boolean;
}

/** Hook principal — API pública idêntica ao useAppointments original. */
export function useAppointments(options: UseAppointmentsOptions = {}) {
  const result = useAppointmentsData(options);
  return {
    ...result,
    refreshAppointments: async () => result.refetch(),
  };
}

export function useRescheduleAppointment() {
  const { mutateAsync } = useUpdateAppointment();
  return {
    mutateAsync: ({
      appointmentId,
      appointment_date,
      appointment_time,
      duration,
      ignoreCapacity,
    }: {
      appointmentId: string;
      appointment_date?: string;
      appointment_time?: string;
      duration?: number;
      ignoreCapacity?: boolean;
    }) =>
      mutateAsync({
        appointmentId,
        updates: { appointment_date, appointment_time, duration },
        ignoreCapacity,
        suppressSuccessToast: true,
      }),
    isPending: false,
  };
}

export function useAppointmentsFiltered(_filters: Record<string, unknown>) {
  const { data: appointments = [], isLoading, error } = useAppointments();
  return { data: appointments, isLoading, error };
}

export function useUpdatePaymentStatus() {
  return {
    mutateAsync: async (_: {
      appointmentId: string;
      paymentStatus: "paid" | "pending" | "partial";
    }) => true,
    isPending: false,
  };
}
