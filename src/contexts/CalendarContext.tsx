/**
 * Context API para estado compartilhado do calendário
 * @module contexts/CalendarContext
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Date } from 'date-fns';
import {

  DragState,
  DropTarget,
  CalendarFilters,
  CalendarViewSettings,
  SelectionState,
} from '@/lib/calendar/types';
import { Appointment } from '@/types/appointment';

// =====================================================================
// CONTEXT VALUE
// =====================================================================

interface CalendarContextValue {
  // Drag & Drop State
  dragState: DragState;
  dropTarget: DropTarget | null;
  setDragState: (state: DragState) => void;
  setDropTarget: (target: DropTarget | null) => void;

  // Selection State
  selectionState: SelectionState;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setSelectionMode: (active: boolean) => void;

  // Filter State
  filters: CalendarFilters;
  setFilters: (filters: CalendarFilters) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;

  // View Settings
  viewSettings: CalendarViewSettings;
  updateViewSettings: (settings: Partial<CalendarViewSettings>) => void;
  setViewType: (type: 'day' | 'week' | 'month') => void;
  setCurrentDate: (date: Date) => void;

  // Actions
  onTimeSlotClick?: (date: Date, time: string) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
  onEditAppointment?: (appointment: Appointment) => void;
  onDeleteAppointment?: (appointment: Appointment) => void;
  onAppointmentReschedule?: (
    appointment: Appointment,
    newDate: Date,
    newTime: string
  ) => Promise<void>;
}

// =====================================================================
// CONTEXT
// =====================================================================

const CalendarContext = createContext<CalendarContextValue | null>(null);

// =====================================================================
// PROVIDER
// =====================================================================

interface CalendarProviderProps {
  children: ReactNode;
  initialViewSettings?: Partial<CalendarViewSettings>;
  onTimeSlotClick?: (date: Date, time: string) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
  onEditAppointment?: (appointment: Appointment) => void;
  onDeleteAppointment?: (appointment: Appointment) => void;
  onAppointmentReschedule?: (
    appointment: Appointment,
    newDate: Date,
    newTime: string
  ) => Promise<void>;
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({
  children,
  initialViewSettings,
  onTimeSlotClick,
  onAppointmentClick,
  onEditAppointment,
  onDeleteAppointment,
  onAppointmentReschedule,
}) => {
  // =================================================================
  // DRAG & DROP STATE
  // =================================================================

  const [dragState, setDragState] = useState<DragState>({
    appointment: null,
    isDragging: false,
  });

  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  // =================================================================
  // SELECTION STATE
  // =================================================================

  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedIds: new Set<string>(),
    isSelectionMode: false,
  });

  const toggleSelection = useCallback((id: string) => {
    setSelectionState((prev) => {
      const newSelectedIds = new Set(prev.selectedIds);
      if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id);
      } else {
        newSelectedIds.add(id);
      }
      return { ...prev, selectedIds: newSelectedIds };
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectionState((prev) => ({
      ...prev,
      selectedIds: new Set(ids),
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionState((prev) => ({
      ...prev,
      selectedIds: new Set(),
    }));
  }, []);

  const setSelectionMode = useCallback((active: boolean) => {
    setSelectionState((prev) => ({
      ...prev,
      isSelectionMode: active,
      selectedIds: active ? prev.selectedIds : new Set(),
    }));
  }, []);

  // =================================================================
  // FILTER STATE
  // =================================================================

  const [filters, setFiltersState] = useState<CalendarFilters>({
    status: [],
    types: [],
    therapists: [],
  });

  const setFilters = useCallback((newFilters: CalendarFilters) => {
    setFiltersState(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({
      status: [],
      types: [],
      therapists: [],
    });
  }, []);

  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.types.length > 0 ||
    filters.therapists.length > 0;

  // =================================================================
  // VIEW SETTINGS
  // =================================================================

  const [viewSettings, setViewSettingsState] = useState<CalendarViewSettings>({
    viewType: 'week',
    currentDate: new Date(),
    zoomLevel: 1,
    showWeekends: true,
    showBlockedSlots: true,
    startHour: 7,
    endHour: 21,
    ...initialViewSettings,
  });

  const updateViewSettings = useCallback((settings: Partial<CalendarViewSettings>) => {
    setViewSettingsState((prev) => ({ ...prev, ...settings }));
  }, []);

  const setViewType = useCallback((type: 'day' | 'week' | 'month') => {
    setViewSettingsState((prev) => ({ ...prev, viewType: type }));
  }, []);

  const setCurrentDate = useCallback((date: Date) => {
    setViewSettingsState((prev) => ({ ...prev, currentDate: date }));
  }, []);

  // =================================================================
  // CONTEXT VALUE
  // =================================================================

  const contextValue: CalendarContextValue = {
    // Drag & Drop
    dragState,
    dropTarget,
    setDragState,
    setDropTarget,

    // Selection
    selectionState,
    toggleSelection,
    selectAll,
    clearSelection,
    setSelectionMode,

    // Filters
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,

    // View Settings
    viewSettings,
    updateViewSettings,
    setViewType,
    setCurrentDate,

    // Actions
    onTimeSlotClick,
    onAppointmentClick,
    onEditAppointment,
    onDeleteAppointment,
    onAppointmentReschedule,
  };

  return (
    <CalendarContext.Provider value={contextValue}>
      {children}
    </CalendarContext.Provider>
  );
};

// =====================================================================
// HOOK
// =====================================================================

/**
 * Hook para acessar o contexto do calendário
 * @throws Error se usado fora do CalendarProvider
 */
export const useCalendarContext = (): CalendarContextValue => {
  const context = useContext(CalendarContext);

  if (!context) {
    throw new Error('useCalendarContext must be used within a CalendarProvider');
  }

  return context;
};

// =====================================================================
// EXPORTS
// =====================================================================

export default CalendarContext;
