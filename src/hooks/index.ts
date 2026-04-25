/**
 * FisioFlow - Exportações de hooks centralizadas
 *
 * @description Este arquivo serve como barrel export para todos os hooks.
 *              Para melhor organização, hooks relacionados estão agrupados em submódulos.
 *
 * @example
 * // Importar do barrel principal
 * import { useAuth, usePatients } from '@/hooks';
 *
 * // Importar de submódulo específico (recomendado para code-splitting)
 * import { useAppointments, useScheduleHandlers } from '@/hooks/appointments';
 */

// ============================================================================
// Core Hooks
// ============================================================================

export { useAuth } from "./useAuth";
export { useData } from "./useData";
export { useMobile } from "./use-mobile";

// ============================================================================
// Appointments/Schedule Hooks (Ver submódulo em ./appointments/)
// ============================================================================

// Re-exportar hooks principais de appointments para compatibilidade
export { useAppointments } from "./useAppointments";
export { useAppointmentsByPeriod } from "./useAppointmentsByPeriod";
export { useAppointmentActions } from "./useAppointmentActions";
export { useFilteredAppointments } from "./useFilteredAppointments";
export { useScheduleHandlers } from "./useScheduleHandlers";
export { useScheduleState } from "./useScheduleState";
export { usePrefetchAdjacentPeriods } from "./usePrefetchAdjacentPeriods";
export { useWaitlist, useWaitlistOffers } from "./useWaitlist";

// ============================================================================
// Quick Wins Hooks (Fase 1)
// ============================================================================

export { useQuickFilters } from "./useQuickFilters";

// ============================================================================
// AI Scheduling Hooks (Fase 3)
// ============================================================================

export { useAIScheduling } from "./useAIScheduling";

// ============================================================================
// Performance Core Hooks (Fase 2)
// ============================================================================

export {
  useThrottle,
  useThrottleFn,
  useThrottleCallback,
  requestAnimationFrameThrottle,
  useRAFThrottle,
  throttle,
} from "./useThrottle";

export {
  useIntersectionObserver,
  useIntersectionObserverCallback,
  useMultipleIntersectionObserver,
  useVisibilityRatio,
  useInfiniteScroll,
  useOnScreenExit,
} from "./useIntersectionObserver";

export { useVirtualList, useVirtualListHorizontal } from "./useVirtualList";

// ============================================================================
// UX/UI Hooks (Fase 4)
// ============================================================================

// These hooks are implemented in UI components:
// - useTheme (in @/components/ui/theme/ThemeProvider.tsx)
// - useHaptic (in @/components/schedule/HapticFeedback.tsx)
// - Responsive hooks (in @/components/responsive/ResponsiveContainer.tsx)

// ============================================================================
// Data Hooks
// ============================================================================

export { usePatients } from "./usePatients";
export { useExercises } from "./useExercises";
export { useDashboardStats } from "./useDashboardStats";

// ============================================================================
// Action Hooks
// ============================================================================

export { useAppointmentActions } from "./useAppointmentActions";
export { useAutoSave } from "./useAutoSave";
export { useWaitlist, useWaitlistOffers } from "./useWaitlist";
export { usePainMaps } from "./usePainMaps";
export { usePatientDocuments } from "./usePatientDocuments";

// ============================================================================
// Advanced Feature Hooks (Fase 5)
// ============================================================================

// These are implemented in appointment components:
// - useRecurringAppointments (in @/components/appointments/RecurringAppointment.tsx)

// ============================================================================
// Innovation Lab Hooks (Fase 7)
// ============================================================================

// These are implemented in AI components:
// - useNaturalLanguageScheduler (in @/components/ai/NaturalLanguageScheduler.tsx)

// ============================================================================
// Toast Hook
// ============================================================================

export { useToast, toast } from "@/components/ui/use-toast";
