/**
 * Schedule Components - Exportações centralizadas
 */

export { ScheduleGrid } from './ScheduleGrid';
export { WeekNavigation } from './WeekNavigation';
export { AppointmentModal } from './AppointmentModal';
export { DailyAppointmentList } from './DailyAppointmentList';

// View Components
export { CalendarView } from './CalendarView';
export { AppointmentListView } from './AppointmentListView';

// Card Components
export { AppointmentCard } from './AppointmentCard';
export { SwipeableAppointmentCard } from './SwipeableAppointmentCard';
export { ScheduleStatsCard } from './ScheduleStatsCard';

// UI Components
export { AppointmentAvatar } from './AppointmentAvatar';
export { MiniCalendar } from './MiniCalendar';
export { AppointmentSearch } from './AppointmentSearch';
export { AdvancedFilters } from './AdvancedFilters';
export { GoogleCalendarButton, GoogleCalendarStatus, GoogleCalendarBadge } from './GoogleCalendarButton';

// ============================================================================
// Fase 1: Quick Wins
// ============================================================================

export { CalendarHeatMap } from './CalendarHeatMap';
export type { HeatMapSlot } from './CalendarHeatMap';

export { QuickFilters } from './QuickFilters';
export type { QuickFilterType } from './QuickFilters';

export { PullToRefresh } from './PullToRefresh';

export { SwipeNavigation } from './SwipeNavigation';

export {
  hapticFeedback,
  hapticLight,
  hapticMedium,
  hapticHeavy,
  hapticSuccess,
  hapticError,
  hapticWarning,
  hapticCustom,
  useHaptic
} from './HapticFeedback';

// Skeleton Components
export { CalendarSkeleton } from './skeletons/CalendarSkeleton';
export { AppointmentCardSkeleton } from './skeletons/AppointmentCardSkeleton';
export { AppointmentListSkeleton } from './skeletons/AppointmentListSkeleton';
export { CalendarSkeletonEnhanced, PulseLoader } from './skeletons/CalendarSkeletonEnhanced';

export { KeyboardShortcutsEnhanced } from './KeyboardShortcutsEnhanced';

// ============================================================================
// Fase 2: Performance Core
// ============================================================================

export { VirtualizedAppointmentList } from './VirtualizedAppointmentList';
export { useAppointmentListScroll } from './VirtualizedAppointmentList';

export { VirtualizedDayView } from './VirtualizedDayView';

export { VirtualizedWeekView } from './VirtualizedWeekView';

export { LazyAppointmentModal, useAppointmentModalPreload } from './LazyAppointmentModal';

export { OptimizedImageLoader, OptimizedAvatar } from './OptimizedImageLoader';

export {
  useBackgroundSync,
  BackgroundSyncProvider,
  useOfflineQueue,
  registerSyncServiceWorker,
  type SyncOperation
} from './BackgroundSync';

export { DebouncedSearch, DebouncedSearchAdvanced, useDebouncedSearch } from './DebouncedSearch';

// ============================================================================
// UI Components
// ============================================================================

export { EmptyStateEnhanced } from '../ui/EmptyStateEnhanced';

export { PerformanceMonitor } from '../ui/PerformanceMonitor';

export { RichTextEditor } from '../ui/RichTextEditor';

export { RichTextToolbar } from '../ui/RichTextToolbar';
