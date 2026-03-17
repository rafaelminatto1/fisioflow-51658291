/**
 * useAppointments — barrel de retrocompatibilidade.
 * Consumers que importam de '@/hooks/useAppointments' continuam funcionando.
 * Implementação real em '@/hooks/appointments/'.
 */

export {
  appointmentKeys,
  useAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
  useUpdateAppointmentStatus,
  useRescheduleAppointment,
  useAppointmentsFiltered,
  useUpdatePaymentStatus,
  useAppointmentsData,
} from './appointments/useAppointments';

export type { AppointmentsQueryResult } from './appointments/useAppointmentsCache';
