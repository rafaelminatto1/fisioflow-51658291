/**
 * FisioFlow - Exportações de hooks centralizadas
 */

// ============================================================================
// Core Hooks
// ============================================================================

export { useAuth } from './useAuth';
export { useData } from './useData';
export { useMobile } from './use-mobile';

// ============================================================================
// Schedule Hooks
// ============================================================================

export { useAppointments } from './useAppointments';
export { useAppointmentsByPeriod } from './useAppointmentsByPeriod';

// ============================================================================
// Quick Wins Hooks (Fase 1)
// ============================================================================

export { useQuickFilters } from './useQuickFilters';

// ============================================================================
// AI Scheduling Hooks (Fase 3)
// ============================================================================

export { useAIScheduling } from './useAIScheduling';

// ============================================================================
// Performance Core Hooks (Fase 2)
// ============================================================================

export {
  useOptimizedQuery,
  useAppointmentsQuery,
  usePatientsQuery,
  useExercisesQuery,
  useOptimizedMutation,
  usePrefetchOnHover,
  prefetchAppointments,
  prefetchPatients,
  prefetchExercises,
  useCacheManagement,
  useCacheStats,
  CACHE_CONFIG
} from './useReactQueryOptimization';

export {
  useThrottle,
  useThrottleFn,
  useThrottleCallback,
  requestAnimationFrameThrottle,
  useRAFThrottle,
  throttle
} from './useThrottle';

export {
  useIntersectionObserver,
  useIntersectionObserverCallback,
  useMultipleIntersectionObserver,
  useVisibilityRatio,
  useInfiniteScroll,
  useOnScreenExit
} from './useIntersectionObserver';

export { useVirtualList, useVirtualListHorizontal } from './useVirtualList';

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

export { usePatients } from './usePatients';
export { useExercises } from './useExercises';
export { useDashboardStats } from './useDashboardStats';

// ============================================================================
// Action Hooks
// ============================================================================

export { useAppointmentActions } from './useAppointmentActions';
export { useAutoSave } from './useAutoSave';
export { useWaitlist, useWaitlistOffers } from './useWaitlist';
export { usePainMaps } from './usePainMaps';
export { usePatientDocuments } from './usePatientDocuments';

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

export { useToast, toast } from '@/components/ui/use-toast';
