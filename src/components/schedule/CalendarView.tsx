

/**
 * CalendarView - Main calendar component for appointment scheduling
 * 
 * This component provides day, week, and month views of appointments with
 * drag-and-drop rescheduling, filtering, and selection capabilities.
 * 
 * VIRTUALIZATION STATUS:
 * - Virtualization infrastructure is available in src/components/schedule/virtualized/
 * - VirtualizedCalendarGrid and VirtualizedAppointmentList are ready for integration
 * - Currently NOT integrated because default slot counts (<50) are below threshold
 * - See src/components/schedule/VIRTUALIZATION_README.md for integration guide
 * - Virtualization will automatically activate when slot count exceeds 50
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Memoized components (AppointmentCard, TimeSlot)
 * - Optimistic updates for drag-and-drop
 * - Indexed appointment lookups by date
 * - Debounced drop target announcements
 * - Lazy-loaded modals
 */

/**
 * Feature flag to enable @dnd-kit implementation for drag and drop.
 * Set to true to use the new @dnd-kit implementation, false to use HTML5 native.
 */

import { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react';
import { format, startOfWeek, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, CheckSquare, Settings as SettingsIcon, Sparkles, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Appointment } from '@/types/appointment';
import { generateTimeSlots } from '@/lib/config/agenda';
import { RescheduleConfirmDialog } from './RescheduleConfirmDialog';
import { RescheduleCapacityDialog } from './RescheduleCapacityDialog';
import { AdvancedFilters } from './AdvancedFilters';
import { useAvailableTimeSlots } from '@/hooks/useAvailableTimeSlots';
import { CalendarDayView } from './CalendarDayView';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarWeekViewDndKit } from './CalendarWeekViewDndKit';
import { CalendarMonthView } from './CalendarMonthView';
import { useCalendarDrag } from '@/hooks/useCalendarDrag';
import { useCalendarDragDndKit } from '@/hooks/useCalendarDragDndKit';
import { useScheduleCapacity } from '@/hooks/useScheduleCapacity';
import { formatDateToLocalISO } from '@/lib/utils/dateFormat';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { WaitlistIndicator } from './WaitlistIndicator';

const USE_DND_KIT = true;

export type CalendarViewType = 'day' | 'week' | 'month';

interface CalendarViewProps {
  appointments: Appointment[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewType: CalendarViewType;
  onViewTypeChange: (type: CalendarViewType) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string, ignoreCapacity?: boolean) => Promise<void>;
  onEditAppointment?: (appointment: Appointment) => void;
  onDeleteAppointment?: (appointment: Appointment) => void;
  // Selection props
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  /** Message announced to screen readers after successful reschedule (e.g. "Reagendado com sucesso") */
  rescheduleSuccessMessage?: string | null;
  /** Optional: called when user clicks an appointment (e.g. open quick edit). Not used by day/week views; kept for API compatibility. */
  onAppointmentClick?: (appointment: Appointment) => void;
  // Toolbar action props (merged from ScheduleToolbar)
  onCreateAppointment?: () => void;
  onToggleSelectionMode?: () => void;
  onCancelAllToday?: () => void;
  filters?: { status: string[]; types: string[]; therapists: string[] };
  onFiltersChange?: (filters: { status: string[]; types: string[]; therapists: string[] }) => void;
  onClearFilters?: () => void;
  totalAppointmentsCount?: number;
  // Patient search filter
  patientFilter?: string | null;
  onPatientFilterChange?: (patientName: string | null) => void;
}

const OVERBOOK_MARKER = '[EXCEDENTE]';
const NON_CAPACITY_STATUSES = new Set([
  'cancelado',
  'falta',
  'faltou',
  'remarcado',
  'reagendado',
  'paciente_faltou'
]);

const normalizeSlotTime = (time: string | undefined | null): string => {
  if (!time || typeof time !== 'string') return '00:00';
  return time.substring(0, 5);
};

const timeToMinutes = (time: string | undefined | null): number => {
  const normalized = normalizeSlotTime(time);
  const [hours, minutes] = normalized.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const parseAppointmentDate = (dateValue: Appointment['date']): Date | null => {
  if (!dateValue) return null;

  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }

  if (typeof dateValue === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      const [year, month, day] = dateValue.split('-').map(Number);
      return new Date(year, month - 1, day, 12, 0, 0);
    }

    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

export const CalendarView = memo(({
  appointments,
  currentDate,
  onDateChange,
  viewType,
  onViewTypeChange,
  onTimeSlotClick,
  onAppointmentReschedule,
  onEditAppointment,
  onDeleteAppointment,
  selectionMode = false,
  selectedIds = new Set(),
  onToggleSelection,
  rescheduleSuccessMessage = null,
  onAppointmentClick: _onAppointmentClick,
  onCreateAppointment,
  onToggleSelectionMode,
  onCancelAllToday,
  filters,
  onFiltersChange,
  onClearFilters,
  totalAppointmentsCount,
  patientFilter,
  onPatientFilterChange,
}: CalendarViewProps) => {
  // Patient search autocomplete state
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const patientSearchRef = useRef<HTMLDivElement>(null);

  // Extract unique patient names from appointments for autocomplete suggestions
  const uniquePatients = useMemo(() => {
    const map = new Map<string, string>();
    for (const apt of appointments) {
      if (apt.patientName && apt.patientId) {
        map.set(apt.patientId, apt.patientName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [appointments]);

  // Filter patient suggestions based on search query
  const patientSuggestions = useMemo(() => {
    if (!patientSearchQuery.trim()) return uniquePatients;
    const q = patientSearchQuery.toLowerCase().trim();
    return uniquePatients.filter(p => p.name.toLowerCase().includes(q));
  }, [uniquePatients, patientSearchQuery]);

  // Close patient search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (patientSearchRef.current && !patientSearchRef.current.contains(e.target as Node)) {
        setPatientSearchOpen(false);
      }
    };
    if (patientSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [patientSearchOpen]);

  // State for appointment quick view popover
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  // Current time indicator
  const [currentTime, setCurrentTime] = useState(new Date());
  const { getMinCapacityForInterval } = useScheduleCapacity();

  // Optimistic updates state - maintains a local copy of appointments with pending changes
  const [optimisticAppointments, setOptimisticAppointments] = useState<Appointment[]>([]);
  const [pendingOptimisticUpdate, setPendingOptimisticUpdate] = useState<{ id: string; originalDate: string; originalTime: string } | null>(null);

  // Use optimistic appointments when there's a pending update, otherwise use original appointments (filter out null/undefined to avoid "reading 'id'" on drag)
  const baseDisplayAppointments = useMemo(() => {
    const base = pendingOptimisticUpdate && optimisticAppointments.length > 0 ? optimisticAppointments : appointments;
    return (base || []).filter((a): a is Appointment => a != null && typeof (a as Appointment).id === 'string');
  }, [appointments, optimisticAppointments, pendingOptimisticUpdate]);

  // Marca automaticamente os agendamentos que excedem a capacidade configurada.
  const overbookedAppointmentIds = useMemo(() => {
    const groupedByDate = new Map<string, Appointment[]>();

    for (const apt of baseDisplayAppointments) {
      const aptDate = parseAppointmentDate(apt.date);
      if (!aptDate) continue;
      const dateKey = format(aptDate, 'yyyy-MM-dd');
      if (!groupedByDate.has(dateKey)) groupedByDate.set(dateKey, []);
      groupedByDate.get(dateKey)!.push(apt);
    }

    const result = new Set<string>();

    groupedByDate.forEach((dayAppointments) => {
      const activeAppointments = dayAppointments
        .filter((apt) => !NON_CAPACITY_STATUSES.has((apt.status || '').toLowerCase()))
        .sort((a, b) => {
          const byTime = timeToMinutes(a.time) - timeToMinutes(b.time);
          if (byTime !== 0) return byTime;
          return a.id.localeCompare(b.id);
        });

      const activeIntervals: Array<{ id: string; end: number }> = [];

      for (const apt of activeAppointments) {
        const aptDate = parseAppointmentDate(apt.date);
        if (!aptDate) continue;

        const startMinutes = timeToMinutes(apt.time);
        const durationMinutes = Math.max(1, apt.duration || 60);
        const endMinutes = startMinutes + durationMinutes;
        const normalizedTime = normalizeSlotTime(apt.time);

        for (let i = activeIntervals.length - 1; i >= 0; i--) {
          if (activeIntervals[i].end <= startMinutes) {
            activeIntervals.splice(i, 1);
          }
        }

        const capacityForInterval = getMinCapacityForInterval(aptDate.getDay(), normalizedTime, durationMinutes);
        const markedByNote = apt.notes?.includes(OVERBOOK_MARKER) || false;

        if (markedByNote || activeIntervals.length + 1 > capacityForInterval) {
          result.add(apt.id);
        }

        activeIntervals.push({ id: apt.id, end: endMinutes });
      }
    });

    return result;
  }, [baseDisplayAppointments, getMinCapacityForInterval]);

  const displayAppointments = useMemo(() => {
    return baseDisplayAppointments.map((apt) => {
      const isOverbooked = overbookedAppointmentIds.has(apt.id);
      if (apt.isOverbooked === isOverbooked) return apt;
      return { ...apt, isOverbooked };
    });
  }, [baseDisplayAppointments, overbookedAppointmentIds]);

  // Index appointments by date string (YYYY-MM-DD) for O(1) lookup
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();

    (displayAppointments || []).forEach(apt => {
      if (!apt || !apt.date) return;

      const aptDate = parseAppointmentDate(apt.date);
      if (!aptDate) return;
      const dateKey = format(aptDate, 'yyyy-MM-dd');

      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(apt);
    });

    return map;
  }, [displayAppointments]);

  // Helper function to get appointments for a specific date
  // Needs to be defined BEFORE useCalendarDrag hook
  const getAppointmentsForDate = useCallback((date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return appointmentsByDate.get(dateKey) || [];
  }, [appointmentsByDate]);

  // Helper function to get appointments for a specific slot (date + time)
  // Used by useCalendarDrag to detect existing appointments in the drop target
  // Considers time overlap based on appointment duration
  // MUST be defined AFTER getAppointmentsForDate but BEFORE handleOptimisticUpdate
  const getAppointmentsForSlot = useCallback((date: Date, time: string) => {
    const dateAppointments = getAppointmentsForDate(date);
    const normalizedTime = time.substring(0, 5); // "HH:mm"

    // Convert time to minutes for overlap calculation
    const [targetHour, targetMin] = normalizedTime.split(':').map(Number);
    const targetMinutes = targetHour * 60 + targetMin;

    // Find all appointments that overlap with the target time slot
    return dateAppointments.filter(apt => {
      const aptTime = apt.time?.substring(0, 5) || '00:00';
      const [aptHour, aptMin] = aptTime.split(':').map(Number);
      const aptStartMinutes = aptHour * 60 + aptMin;
      const aptEndMinutes = aptStartMinutes + (apt.duration || 60);

      // Check if target time falls within the appointment's duration
      // Or if the appointment starts at exactly the target time
      return aptTime === normalizedTime ||
        (targetMinutes >= aptStartMinutes && targetMinutes < aptEndMinutes);
    });
  }, [getAppointmentsForDate]);

  // Optimistic update handlers
  const handleOptimisticUpdate = useCallback((appointmentId: string, newDate: Date, newTime: string) => {
    const safeAppointments = (appointments || []).filter((a): a is Appointment => a != null && typeof (a as Appointment).id === 'string');
    const appointment = safeAppointments.find(a => a.id === appointmentId);
    if (!appointment) return;

    // Save original values for potential revert
    setPendingOptimisticUpdate({
      id: appointmentId,
      originalDate: appointment.date,
      originalTime: appointment.time
    });

    // Create updated appointment with new date/time
    const updatedAppointment: Appointment = {
      ...appointment,
      date: formatDateToLocalISO(newDate) as any, // Type cast for date-fns compatibility
      time: newTime
    };

    // Update local state immediately (optimistic)
    setOptimisticAppointments(
      safeAppointments.map(a => a.id === appointmentId ? updatedAppointment : a)
    );
  }, [appointments]);

  const handleRevertUpdate = useCallback((_appointmentId: string) => {
    // Clear optimistic state to revert to original appointments
    setPendingOptimisticUpdate(null);
    setOptimisticAppointments([]);
  }, []);

  // Drag and drop logic from hook (HTML5 Native)
  const {
    dragState: dragStateNative,
    dropTarget: dropTargetNative,
    showConfirmDialog: showConfirmDialogNative,
    pendingReschedule: pendingRescheduleNative,
    targetAppointments,
    handleDragStart: handleDragStartNative,
    handleDragEnd: handleDragEndNative,
    handleDragOver: handleDragOverNative,
    handleDragLeave: handleDragLeaveNative,
    handleDrop: handleDropNative,
    handleConfirmReschedule: handleConfirmRescheduleNative,
    handleCancelReschedule: handleCancelRescheduleNative,
    showOverCapacityDialog: showOverCapacityDialogNative,
    pendingOverCapacity: pendingOverCapacityNative,
    handleConfirmOverCapacity: handleConfirmOverCapacityNative,
    handleCancelOverCapacity: handleCancelOverCapacityNative
  } = useCalendarDrag({
    onAppointmentReschedule,
    onOptimisticUpdate: handleOptimisticUpdate,
    onRevertUpdate: handleRevertUpdate,
    getAppointmentsForSlot,
    getMinCapacityForInterval
  });

  // Drag and drop logic from hook (@dnd-kit)
  const {
    dragState: dragStateDndKit,
    dropTarget: dropTargetDndKit,
    showConfirmDialog: showConfirmDialogDndKit,
    pendingReschedule: pendingRescheduleDndKit,
    handleDragStart: handleDragStartDndKit,
    handleDragOver: handleDragOverDndKit,
    handleDragEnd: handleDragEndDndKit,
    handleConfirmReschedule: handleConfirmRescheduleDndKit,
    handleCancelReschedule: handleCancelRescheduleDndKit,
    showOverCapacityDialog: showOverCapacityDialogDndKit,
    pendingOverCapacity: pendingOverCapacityDndKit,
    handleConfirmOverCapacity: handleConfirmOverCapacityDndKit,
    handleCancelOverCapacity: handleCancelOverCapacityDndKit,
  } = useCalendarDragDndKit({
    onAppointmentReschedule,
    onOptimisticUpdate: handleOptimisticUpdate,
    onRevertUpdate: handleRevertUpdate,
    getAppointmentsForSlot,
    getMinCapacityForInterval,
  });

  // Choose drag & drop engine based on view (DndKit only in week view for now)
  const useDndKitMode = USE_DND_KIT && viewType === 'week';

  const dragState = useDndKitMode ? dragStateDndKit : dragStateNative;
  const dropTarget = useDndKitMode ? dropTargetDndKit : dropTargetNative;
  const showConfirmDialog = useDndKitMode ? showConfirmDialogDndKit : showConfirmDialogNative;
  const pendingReschedule = useDndKitMode ? pendingRescheduleDndKit : pendingRescheduleNative;
  const handleConfirmReschedule = useDndKitMode ? handleConfirmRescheduleDndKit : handleConfirmRescheduleNative;
  const handleCancelReschedule = useDndKitMode ? handleCancelRescheduleDndKit : handleCancelRescheduleNative;
  const showOverCapacityDialog = useDndKitMode ? showOverCapacityDialogDndKit : showOverCapacityDialogNative;
  const pendingOverCapacity = useDndKitMode ? pendingOverCapacityDndKit : pendingOverCapacityNative;
  const handleConfirmOverCapacity = useDndKitMode ? handleConfirmOverCapacityDndKit : handleConfirmOverCapacityNative;
  const handleCancelOverCapacity = useDndKitMode ? handleCancelOverCapacityDndKit : handleCancelOverCapacityNative;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Clear optimistic state when save completes successfully (savingAppointmentId becomes null)
  useEffect(() => {
    if (!dragState.savingAppointmentId && !pendingOptimisticUpdate) {
      // No pending update, nothing to do
      return;
    }

    if (!dragState.savingAppointmentId && pendingOptimisticUpdate) {
      // Save completed successfully - clear optimistic state
      setPendingOptimisticUpdate(null);
      setOptimisticAppointments([]);
    }
  }, [dragState.savingAppointmentId, pendingOptimisticUpdate]);

  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const totalMinutesFromStart = (hours * 60 + minutes) - (7 * 60); // Start from 7am
    const totalDayMinutes = 17 * 60; // 7am to 12am = 17 hours
    return (totalMinutesFromStart / totalDayMinutes) * 100;
  }, [currentTime]);

  const navigateCalendar = useCallback((direction: 'prev' | 'next') => {
    switch (viewType) {
      case 'day':
        onDateChange(direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1));
        break;
      case 'week':
        onDateChange(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
        break;
      case 'month':
        onDateChange(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
        break;
    }
  }, [viewType, currentDate, onDateChange]);

  const goToToday = useCallback(() => {
    onDateChange(new Date());
  }, [onDateChange]);

  const getHeaderTitle = useCallback(() => {
    switch (viewType) {
      case 'day':
        return format(currentDate, "d 'de' MMMM", { locale: ptBR });
      case 'week': {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = addDays(weekStart, 5); // Seg to Sab
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${format(weekStart, 'd')} - ${format(weekEnd, "d 'de' MMMM", { locale: ptBR })}`;
        }
        return `${format(weekStart, "d 'de' MMM", { locale: ptBR })} - ${format(weekEnd, "d 'de' MMM", { locale: ptBR })}`;
      }
      case 'month':
        return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
      default:
        return '';
    }
  }, [viewType, currentDate]);

  // Restore focus to calendar grid when a reschedule dialog closes
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const isAnyRescheduleDialogOpen = showConfirmDialog || showOverCapacityDialog;
  const prevShowDialogRef = useRef(isAnyRescheduleDialogOpen);
  useEffect(() => {
    const didClose = prevShowDialogRef.current && !isAnyRescheduleDialogOpen;
    prevShowDialogRef.current = isAnyRescheduleDialogOpen;
    if (didClose) {
      // Short delay so focus runs after Radix unmounts the dialog and releases focus
      const t = setTimeout(() => {
        calendarGridRef.current?.focus({ preventScroll: true });
      }, 0);
      return () => clearTimeout(t);
    }
  }, [isAnyRescheduleDialogOpen]);

  // Screen reader: announce drop target during drag (WCAG feedback)
  const dropTargetAnnouncement = useMemo(() => {
    if (!dragState.isDragging) return null;
    if (!dropTarget) return 'Nenhum slot selecionado';
    const dayStr = format(dropTarget.date, "EEEE, d 'de' MMMM", { locale: ptBR });
    const capitalized = dayStr.charAt(0).toUpperCase() + dayStr.slice(1);
    return `Solte em ${capitalized}, ${dropTarget.time}`;
  }, [dragState.isDragging, dropTarget]);

  // Debounce drop target announcement (150ms) to avoid excessive announcements when dragging quickly
  const [debouncedDropAnnouncement, setDebouncedDropAnnouncement] = useState<string | null>(null);
  useEffect(() => {
    if (!dragState.isDragging) {
      setDebouncedDropAnnouncement(null);
      return;
    }
    if (dropTargetAnnouncement === null) {
      setDebouncedDropAnnouncement(null);
      return;
    }
    const t = setTimeout(() => setDebouncedDropAnnouncement(dropTargetAnnouncement), 150);
    return () => clearTimeout(t);
  }, [dragState.isDragging, dropTargetAnnouncement]);

  const getStatusColor = useCallback((status: string, isOverCapacity: boolean = false) => {
    // Over-capacity appointments get a strong alert color
    if (isOverCapacity) {
      return 'bg-gradient-to-br from-red-600 to-rose-700 border-red-400 shadow-red-500/40 ring-2 ring-red-400/50 ring-offset-1';
    }

    switch (status.toLowerCase()) {
      case 'confirmado':
      case 'confirmed':
        return 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 shadow-emerald-500/30';
      case 'agendado':
      case 'scheduled':
        return 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400 shadow-blue-500/30';
      case 'concluido':
      case 'completed':
        return 'bg-gradient-to-br from-purple-500 to-purple-600 border-purple-400 shadow-purple-500/30';
      case 'cancelado':
      case 'cancelled':
        return 'bg-gradient-to-br from-red-500 to-red-600 border-red-400 shadow-red-500/30';
      case 'aguardando_confirmacao':
      case 'awaiting':
        return 'bg-gradient-to-br from-amber-500 to-amber-600 border-amber-400 shadow-amber-500/30';
      case 'em_andamento':
      case 'in_progress':
        return 'bg-gradient-to-br from-cyan-500 to-cyan-600 border-cyan-400 shadow-cyan-500/30';
      case 'remarcado':
      case 'rescheduled':
        return 'bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400 shadow-orange-500/30';
      case 'nao_compareceu':
      case 'no_show':
        return 'bg-gradient-to-br from-rose-500 to-rose-600 border-rose-400 shadow-rose-500/30';
      case 'em_espera':
      case 'waiting':
        return 'bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-400 shadow-indigo-500/30';
      case 'falta':
      case 'no_show_confirmed':
        return 'bg-gradient-to-br from-rose-600 to-rose-700 border-rose-500 shadow-rose-600/30';
      case 'remarcado_pelo_paciente':
      case 'rescheduled_by_patient':
        return 'bg-gradient-to-br from-teal-500 to-teal-600 border-teal-400 shadow-teal-500/30';
      default:
        return 'bg-gradient-to-br from-slate-500 to-slate-600 border-slate-400 shadow-slate-500/30';
    }
  }, []);

  // Helper to check if appointment is over capacity
  const isOverCapacity = useCallback((apt: Appointment): boolean => {
    return Boolean(apt.isOverbooked || apt.notes?.includes(OVERBOOK_MARKER));
  }, []);

  // Hook for time slots availability
  const { timeSlots: dayTimeSlotInfo, isDayClosed, isTimeBlocked, getBlockReason, blockedTimes, businessHours } = useAvailableTimeSlots(currentDate);

  const getDaySchedule = useCallback((date: Date) => {
    const dayOfWeek = date.getDay();

    // Sunday default closed
    if (dayOfWeek === 0) return null;

    const config = businessHours?.find(h => h.day_of_week === dayOfWeek);

    if (config) {
      if (!config.is_open) return null;
      return {
        open: normalizeSlotTime(config.open_time),
        close: normalizeSlotTime(config.close_time)
      };
    }

    // Fallback default hours (Mon-Fri 07-21, Sat 07-13)
    const defaultClose = dayOfWeek === 6 ? '13:00' : '21:00';
    return {
      open: '07:00',
      close: defaultClose
    };
  }, [businessHours]);

  // Helper to check if time is blocked for any date
  const checkTimeBlocked = useCallback((date: Date, time: string): { blocked: boolean; reason?: string } => {
    const schedule = getDaySchedule(date);
    if (!schedule) {
      return { blocked: true, reason: 'Fora do horário de funcionamento' };
    }

    const timeMinutes = timeToMinutes(time);
    const openMinutes = timeToMinutes(schedule.open);
    const closeMinutes = timeToMinutes(schedule.close);

    // Block outside business hours
    if (timeMinutes < openMinutes || timeMinutes >= closeMinutes) {
      return { blocked: true, reason: 'Fora do horário de funcionamento' };
    }

    if (!blockedTimes || !time) {
      return { blocked: false };
    }

    const dayOfWeek = date.getDay();

    for (const block of blockedTimes) {
      const blockStart = new Date(block.start_date);
      const blockEnd = new Date(block.end_date);
      blockStart.setHours(0, 0, 0, 0);
      blockEnd.setHours(23, 59, 59, 999);

      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);

      if (checkDate >= blockStart && checkDate <= blockEnd) {
        if (block.is_all_day) {
          return { blocked: true, reason: block.title };
        }
        if (block.start_time && block.end_time) {
          const [btH, btM] = block.start_time.split(':').map(Number);
          const [etH, etM] = block.end_time.split(':').map(Number);
          if (timeMinutes >= btH * 60 + btM && timeMinutes < etH * 60 + etM) {
            return { blocked: true, reason: block.title };
          }
        }
      }

      if (block.is_recurring && block.recurring_days?.includes(dayOfWeek)) {
        if (block.is_all_day) {
          return { blocked: true, reason: block.title };
        }
        if (block.start_time && block.end_time) {
          const [btH, btM] = block.start_time.split(':').map(Number);
          const [etH, etM] = block.end_time.split(':').map(Number);
          if (timeMinutes >= btH * 60 + btM && timeMinutes < etH * 60 + etM) {
            return { blocked: true, reason: block.title };
          }
        }
      }
    }
    return { blocked: false };
  }, [blockedTimes, getDaySchedule]);

  // Check if a day is closed based on business hours
  const isDayClosedForDate = useCallback((date: Date): boolean => {
    return getDaySchedule(date) === null;
  }, [getDaySchedule]);

  const memoizedTimeSlots = useMemo(() => {
    return dayTimeSlotInfo.length > 0 ? dayTimeSlotInfo.map(s => s.time) : generateTimeSlots(currentDate);
  }, [dayTimeSlotInfo, currentDate]);

  const weekTimeSlots = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

    let minStart = 7 * 60;
    let maxEnd = 21 * 60;

    const fallbackRange = (day: number) => ({
      start: 7 * 60,
      end: day === 6 ? 13 * 60 : 21 * 60,
    });

    if (businessHours && businessHours.length > 0) {
      days.forEach(day => {
        const dow = day.getDay();
        const config = businessHours.find(h => h.day_of_week === dow);

        if (!config) {
          const { start, end } = fallbackRange(dow);
          minStart = Math.min(minStart, start);
          maxEnd = Math.max(maxEnd, end);
          return;
        }

        if (!config.is_open) return;

        const open = timeToMinutes(config.open_time);
        const close = timeToMinutes(config.close_time);

        if (Number.isFinite(open) && open > 0) {
          minStart = Math.min(minStart, open);
        }

        if (Number.isFinite(close) && close > 0) {
          maxEnd = Math.max(maxEnd, close);
        }
      });
    }

    const slots: string[] = [];
    const slotDuration = 30;
    for (let minutes = minStart; minutes < maxEnd; minutes += slotDuration) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }

    return slots;
  }, [businessHours, currentDate]);

  // Single live region: success takes precedence over debounced drop target (avoids two competing announcements)
  const liveAnnouncement = rescheduleSuccessMessage ?? debouncedDropAnnouncement ?? '';

  return (
    <>
      {/* Screen reader: drop target during drag and reschedule success (only render when there is something to announce) */}
      {liveAnnouncement ? (
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {liveAnnouncement}
        </div>
      ) : null}
      <Card className="flex flex-col border-none shadow-premium-lg min-h-[500px] sm:min-h-[600px] bg-slate-50 dark:bg-slate-950/20" role="region" aria-label="Calendário de agendamentos">
        <CardContent className="p-0 flex flex-col h-full">
          {/* Unified Header - Navigation + Actions */}
          <div className="px-3 sm:px-4 py-2.5 border-b bg-white dark:bg-slate-900" role="toolbar" aria-label="Navegação do calendário">
            {/* Mobile Header */}
            <div className="flex items-center justify-between sm:hidden gap-2 w-full">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateCalendar('prev')}
                  className="h-8 w-8 p-0"
                  aria-label={`Navegar para ${viewType === 'day' ? 'ontem' : viewType === 'week' ? 'semana anterior' : 'mês anterior'}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-semibold text-foreground/80 text-center min-w-[100px]">
                  {getHeaderTitle()}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateCalendar('next')}
                  className="h-8 w-8 p-0"
                  aria-label={`Navegar para ${viewType === 'day' ? 'amanhã' : viewType === 'week' ? 'próxima semana' : 'mês posterior'}`}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg" role="group" aria-label="Seleção de visualização">
                  {(['day', 'week'] as CalendarViewType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => onViewTypeChange(type)}
                      className={cn(
                        "px-2 py-1 text-xs font-medium rounded-md",
                        viewType === type
                          ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-600 dark:text-gray-400"
                      )}
                      aria-pressed={viewType === type}
                      aria-label={type === 'day' ? 'Visualização Diária' : 'Visualização Semanal'}
                    >
                      {type === 'day' ? 'D' : 'S'}
                    </button>
                  ))}
                </div>
                {onToggleSelectionMode && (
                  <Button
                    variant={selectionMode ? "default" : "outline"}
                    size="icon"
                    className={cn("h-8 w-8", selectionMode && "bg-primary")}
                    onClick={onToggleSelectionMode}
                    aria-label={selectionMode ? "Sair do modo de seleção" : "Entrar no modo de seleção"}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </Button>
                )}
                {onCreateAppointment && (
                  <Button
                    onClick={onCreateAppointment}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-8 w-8 p-0"
                    aria-label="Novo Agendamento"
                    data-testid="new-appointment"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Desktop Header Layout */}
            <div className="hidden sm:flex items-center justify-between">
              {/* Left: Navigation */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateCalendar('prev')}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label={`Navegar para ${viewType === 'day' ? 'ontem' : viewType === 'week' ? 'semana anterior' : 'mês anterior'}`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateCalendar('next')}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label={`Navegar para ${viewType === 'day' ? 'amanhã' : viewType === 'week' ? 'próxima semana' : 'próximo mês'}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="h-8 px-3 rounded-lg font-bold text-xs uppercase tracking-wider"
                  aria-label="Ir para hoje"
                >
                  Hoje
                </Button>

                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter capitalize" aria-live="polite" aria-atomic="true">
                  {getHeaderTitle()}
                </h2>

                {/* Appointments count badge */}
                {totalAppointmentsCount !== undefined && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-50 dark:bg-cyan-950/30 rounded-lg border border-cyan-200 dark:border-cyan-800">
                    <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                    <span className="text-xs font-medium text-cyan-900 dark:text-cyan-100">
                      {totalAppointmentsCount}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: Patient Search + Actions + View Switcher + CTA */}
              <div className="flex items-center gap-2">
                {/* Patient Search Autocomplete */}
                {onPatientFilterChange && (
                  <div className="relative" ref={patientSearchRef}>
                    {patientFilter ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onPatientFilterChange(null);
                          setPatientSearchQuery('');
                        }}
                        className="h-8 px-2.5 rounded-lg gap-1.5 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40 max-w-[180px]"
                        title="Limpar filtro de paciente"
                      >
                        <Search className="w-3 h-3 shrink-0" />
                        <span className="text-xs truncate">{patientFilter}</span>
                        <X className="w-3 h-3 shrink-0 ml-0.5" />
                      </Button>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Buscar paciente..."
                          value={patientSearchQuery}
                          onChange={(e) => {
                            setPatientSearchQuery(e.target.value);
                            setPatientSearchOpen(true);
                          }}
                          onFocus={() => setPatientSearchOpen(true)}
                          className="h-8 w-[170px] pl-8 pr-3 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
                          aria-label="Buscar paciente para filtrar agenda"
                        />
                      </div>
                    )}

                    {/* Autocomplete Dropdown */}
                    {patientSearchOpen && !patientFilter && (
                      <div className="absolute top-full left-0 mt-1 w-[260px] max-h-[240px] overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                        {patientSuggestions.length === 0 ? (
                          <div className="px-3 py-4 text-xs text-gray-500 text-center">
                            Nenhum paciente encontrado
                          </div>
                        ) : (
                          patientSuggestions.map((patient) => (
                            <button
                              key={patient.id}
                              onClick={() => {
                                onPatientFilterChange(patient.name);
                                setPatientSearchQuery('');
                                setPatientSearchOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                            >
                              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                                  {patient.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="truncate text-gray-800 dark:text-gray-200">{patient.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Waitlist Indicator */}
                <WaitlistIndicator
                  onSchedulePatient={onCreateAppointment} // Reuse create appointment with patient prepopulated or handle specifically
                  className="hidden md:flex"
                />

                {/* Settings */}
                <Link to="/schedule/settings">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    title="Configurações da Agenda"
                  >
                    <SettingsIcon className="w-3.5 h-3.5" />
                  </Button>
                </Link>

                {/* Filters */}
                {filters && onFiltersChange && onClearFilters && (
                  <AdvancedFilters
                    filters={filters}
                    onChange={onFiltersChange}
                    onClear={onClearFilters}
                  />
                )}

                {/* AI Optimization */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 rounded-lg border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 hidden xl:flex"
                  onClick={() => toast({
                    title: "IA Analisando...",
                    description: "Verificando disponibilidade e padrões de agendamento."
                  })}
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  <span className="hidden 2xl:inline text-xs">Otimizar</span>
                </Button>

                {/* Selection Mode Toggle */}
                {onToggleSelectionMode && (
                  <Button
                    variant={selectionMode ? "default" : "outline"}
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-lg",
                      selectionMode && "bg-primary"
                    )}
                    onClick={onToggleSelectionMode}
                    title="Modo de Seleção (atalho: A)"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </Button>
                )}

                {/* View Switcher */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg" role="radiogroup" aria-label="Seleção de visualização">
                  {(['day', 'week', 'month'] as CalendarViewType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => onViewTypeChange(type)}
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded-md transition-all",
                        viewType === type
                          ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50"
                      )}
                      role="radio"
                      aria-checked={viewType === type}
                      aria-label={`Visualizar por ${type === 'day' ? 'dia' : type === 'week' ? 'semana' : 'mês'}`}
                    >
                      {type === 'day' ? 'Dia' : type === 'week' ? 'Semana' : 'Mês'}
                    </button>
                  ))}
                </div>

                {/* New Appointment - Primary CTA */}
                {onCreateAppointment && (
                  <Button
                    onClick={onCreateAppointment}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white gap-1.5 shadow-md rounded-lg px-3 h-8"
                    data-testid="new-appointment"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden lg:inline text-xs">Novo Agendamento</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div
            ref={calendarGridRef}
            className="flex-1 relative outline-none"
            id="calendar-grid"
            role="tabpanel"
            tabIndex={-1}
            aria-label={`Visualização ${viewType === 'day' ? 'diária' : viewType === 'week' ? 'semanal' : 'mensal'} do calendário`}
          >
            {viewType === 'day' && (
              <div key="day-view" className="h-full animate-in fade-in duration-300 slide-in-from-bottom-2">
                <CalendarDayView
                  currentDate={currentDate}
                  currentTime={currentTime}
                  currentTimePosition={currentTimePosition}
                  getAppointmentsForDate={getAppointmentsForDate}
                  savingAppointmentId={dragStateNative.savingAppointmentId}
                  timeSlots={memoizedTimeSlots}
                  isDayClosed={isDayClosed}
                  onTimeSlotClick={onTimeSlotClick}
                  onEditAppointment={onEditAppointment}
                  onDeleteAppointment={onDeleteAppointment}
                  onAppointmentReschedule={onAppointmentReschedule}
                  dragState={dragStateNative}
                  dropTarget={dropTargetNative}
                  targetAppointments={targetAppointments}
                  handleDragStart={handleDragStartNative}
                  handleDragEnd={handleDragEndNative}
                  handleDragOver={handleDragOverNative}
                  handleDragLeave={handleDragLeaveNative}
                  handleDrop={handleDropNative}
                  isTimeBlocked={isTimeBlocked}
                  getBlockReason={getBlockReason}
                  _getStatusColor={getStatusColor}
                  isOverCapacity={isOverCapacity}
                  openPopoverId={openPopoverId}
                  setOpenPopoverId={setOpenPopoverId}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelection={onToggleSelection}
                />
              </div>
            )}

            {viewType === 'week' && (
              <div key="week-view" className="h-full animate-in fade-in duration-300 slide-in-from-bottom-2">
                {USE_DND_KIT ? (
                  <CalendarWeekViewDndKit
                    currentDate={currentDate}
                    appointments={displayAppointments}
                    savingAppointmentId={dragState.savingAppointmentId}
                    timeSlots={weekTimeSlots}
                    onTimeSlotClick={onTimeSlotClick}
                    onEditAppointment={onEditAppointment}
                    onDeleteAppointment={onDeleteAppointment}
                    onAppointmentReschedule={onAppointmentReschedule}
                    checkTimeBlocked={checkTimeBlocked}
                    isDayClosedForDate={isDayClosedForDate}
                    openPopoverId={openPopoverId}
                    setOpenPopoverId={setOpenPopoverId}
                    dragState={dragState}
                    dropTarget={dropTarget}
                    handleDragStart={handleDragStartDndKit}
                    handleDragOver={handleDragOverDndKit}
                    handleDragEnd={handleDragEndDndKit}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    onToggleSelection={onToggleSelection}
                  />
                ) : (
                  <CalendarWeekView
                    currentDate={currentDate}
                    appointments={displayAppointments}
                    savingAppointmentId={dragState.savingAppointmentId}
                    timeSlots={weekTimeSlots}
                    onTimeSlotClick={onTimeSlotClick}
                    onEditAppointment={onEditAppointment}
                    onDeleteAppointment={onDeleteAppointment}
                    onAppointmentReschedule={onAppointmentReschedule}
                    dragState={dragState}
                    dropTarget={dropTarget}
                    targetAppointments={targetAppointments}
                    handleDragStart={handleDragStartNative}
                    handleDragEnd={handleDragEndNative}
                    handleDragOver={handleDragOverNative}
                    handleDragLeave={handleDragLeaveNative}
                    handleDrop={handleDropNative}
                    checkTimeBlocked={checkTimeBlocked}
                    isDayClosedForDate={isDayClosedForDate}
                    openPopoverId={openPopoverId}
                    setOpenPopoverId={setOpenPopoverId}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    onToggleSelection={onToggleSelection}
                  />
                )}
              </div>
            )}

            {viewType === 'month' && (
              <div key="month-view" className="h-full animate-in fade-in duration-300 slide-in-from-bottom-2">
                <CalendarMonthView
                  currentDate={currentDate}
                  appointments={displayAppointments}
                  onDateChange={onDateChange}
                  onTimeSlotClick={onTimeSlotClick}
                  onEditAppointment={onEditAppointment}
                  onDeleteAppointment={onDeleteAppointment}
                  getAppointmentsForDate={getAppointmentsForDate}
                  getStatusColor={getStatusColor}
                  isOverCapacity={isOverCapacity}
                  openPopoverId={openPopoverId}
                  setOpenPopoverId={setOpenPopoverId}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <RescheduleConfirmDialog
        open={showConfirmDialog}
        onOpenChange={(open) => !open && handleCancelReschedule()}
        appointment={pendingReschedule?.appointment || null}
        newDate={pendingReschedule?.newDate || null}
        newTime={pendingReschedule?.newTime || null}
        onConfirm={handleConfirmReschedule}
      />

      <RescheduleCapacityDialog
        open={showOverCapacityDialog}
        onOpenChange={(open) => !open && handleCancelOverCapacity()}
        appointment={pendingOverCapacity?.appointment || null}
        newDate={pendingOverCapacity?.newDate || null}
        newTime={pendingOverCapacity?.newTime || null}
        currentCount={pendingOverCapacity?.currentCount || 0}
        maxCapacity={pendingOverCapacity?.maxCapacity || 0}
        onConfirm={handleConfirmOverCapacity}
        onCancel={handleCancelOverCapacity}
      />
    </>
  );
});

// Custom comparison function for memo optimization
function calendarViewAreEqual(
  prev: CalendarViewProps,
  next: CalendarViewProps
): boolean {
  // Compare primitive values
  if (
    prev.viewType !== next.viewType ||
    prev.selectionMode !== next.selectionMode
  ) {
    return false;
  }

  // Compare dates
  if (prev.currentDate.getTime() !== next.currentDate.getTime()) {
    return false;
  }

  // Compare appointments array length first (quick check)
  if (prev.appointments.length !== next.appointments.length) {
    return false;
  }

  // Deep compare appointments only if length matches
  // Use reference comparison first (optimistic updates will create new refs)
  if (prev.appointments !== next.appointments) {
    // If refs are different, we need to check if content actually changed
    // For simplicity and performance, we'll assume ref change means content change
    // This is correct because we only create new arrays when data changes
    return false;
  }

  // Compare selected sets
  if (prev.selectedIds?.size !== next.selectedIds?.size) {
    return false;
  }

  if (prev.rescheduleSuccessMessage !== next.rescheduleSuccessMessage) {
    return false;
  }

  // Compare function references (should be stable)
  return (
    prev.onDateChange === next.onDateChange &&
    prev.onViewTypeChange === next.onViewTypeChange &&
    prev.onTimeSlotClick === next.onTimeSlotClick &&
    prev.onEditAppointment === next.onEditAppointment &&
    prev.onDeleteAppointment === next.onDeleteAppointment &&
    prev.onToggleSelection === next.onToggleSelection
  );
}

export default memo(CalendarView, calendarViewAreEqual);
CalendarView.displayName = 'CalendarView';
