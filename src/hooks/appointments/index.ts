/**
 * FisioFlow - Appointments Hooks
 *
 * Este módulo centraliza todos os hooks relacionados a agendamentos.
 * Os arquivos originais permanecem em src/hooks/ para compatibilidade.
 *
 * @module hooks/appointments
 */

// ============================================================================
// Core Appointment Hooks
// ============================================================================

// Hook principal de agendamentos
export { useAppointments } from "../useAppointments";

// Hook de agendamentos por período
export { useAppointmentsByPeriod } from "../useAppointmentsByPeriod";

// Hook de ações de agendamento (CRUD)
export { useAppointmentActions } from "../useAppointmentActions";

// Hook de dados de agendamento
export { useAppointmentData } from "../useAppointmentData";

// Hook de agendamentos filtrados
export { useFilteredAppointments } from "../useFilteredAppointments";

// ============================================================================
// Schedule Hooks
// ============================================================================

// Hook de handlers da agenda
export { useScheduleHandlers } from "../useScheduleHandlers";

// Hook de estado da agenda
export { useScheduleState } from "../useScheduleState";

// Hook de prefetch de períodos adjacentes
export { usePrefetchAdjacentPeriods } from "../usePrefetchAdjacentPeriods";

// Hook de disponibilidade de horários
export { useAvailableTimeSlots } from "../useAvailableTimeSlots";

// ============================================================================
// Calendar Hooks
// ============================================================================

// Hooks de calendário (do subdiretório calendar/)
export {
	useAppointmentGroups,
	useDayAppointments,
	useAppointmentOverlap,
} from "../calendar/useAppointmentGroups";
export {
	useAppointmentPositioning,
	useAppointmentPositions,
} from "../calendar/useAppointmentPositioning";

// ============================================================================
// Recurring Appointments
// ============================================================================

export {
	useRecurringSeries,
	useRecurringSeriesById,
	useSeriesOccurrences,
	useCreateRecurringSeries,
	useUpdateRecurringSeries,
	useCancelRecurringSeries,
	useCancelOccurrence,
	useModifyOccurrence,
} from "../useRecurringAppointments";

// ============================================================================
// Realtime Hooks
// ============================================================================

export { useRealtimeAppointments } from "../useRealtimeAppointments";

// ============================================================================
// Optimistic Updates
// ============================================================================

export { useAppointmentOptimistic } from "../appointmentOptimistic";

// ============================================================================
// Waitlist Hooks
// ============================================================================

export {
	useWaitlist,
	useWaitlistCounts,
	useAddToWaitlist,
	useRemoveFromWaitlist,
	useOfferSlot,
	useAcceptOffer,
	useRejectOffer,
	useUpdatePriority,
	useWaitlistOffers,
} from "../useWaitlist";

// ============================================================================
// Types
// ============================================================================

// Re-exportar tipos relevantes se necessário
export type {
	Appointment,
	AppointmentStatus,
	AppointmentUnified,
} from "@/types";
