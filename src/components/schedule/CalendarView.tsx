

/**
 * Feature flag to enable @dnd-kit implementation for drag and drop.
 * Set to true to use the new @dnd-kit implementation, false to use HTML5 native.
 */

import { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Trash2, CheckSquare, Settings as SettingsIcon, Sparkles, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Appointment } from '@/types/appointment';
import { generateTimeSlots } from '@/lib/config/agenda';
import { RescheduleConfirmDialog } from './RescheduleConfirmDialog';
import { AdvancedFilters } from './AdvancedFilters';
import { useAvailableTimeSlots } from '@/hooks/useAvailableTimeSlots';
import { CalendarDayView } from './CalendarDayView';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarWeekViewDndKit } from './CalendarWeekViewDndKit';
import { CalendarMonthView } from './CalendarMonthView';
import { useCalendarDrag } from '@/hooks/useCalendarDrag';
import { useCalendarDragDndKit } from '@/hooks/useCalendarDragDndKit';
import { formatDateToLocalISO } from '@/lib/utils/dateFormat';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const USE_DND_KIT = true;

export type CalendarViewType = 'day' | 'week' | 'month';

interface CalendarViewProps {
  appointments: Appointment[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewType: CalendarViewType;
  onViewTypeChange: (type: CalendarViewType) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string) => Promise<void>;
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

  // Optimistic updates state - maintains a local copy of appointments with pending changes
  const [optimisticAppointments, setOptimisticAppointments] = useState<Appointment[]>([]);
  const [pendingOptimisticUpdate, setPendingOptimisticUpdate] = useState<{ id: string; originalDate: string; originalTime: string } | null>(null);

  // Use optimistic appointments when there's a pending update, otherwise use original appointments (filter out null/undefined to avoid "reading 'id'" on drag)
  const displayAppointments = useMemo(() => {
    const base = pendingOptimisticUpdate && optimisticAppointments.length > 0 ? optimisticAppointments : appointments;
    return (base || []).filter((a): a is Appointment => a != null && typeof (a as Appointment).id === 'string');
  }, [appointments, optimisticAppointments, pendingOptimisticUpdate]);

  // Index appointments by date string (YYYY-MM-DD) for O(1) lookup
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    
    (displayAppointments || []).forEach(apt => {
      if (!apt || !apt.date) return;
      
      let dateKey: string;
      
      if (typeof apt.date === 'string') {
        dateKey = apt.date; // Assuming YYYY-MM-DD
      } else if (apt.date instanceof Date) {
        dateKey = format(apt.date, 'yyyy-MM-dd');
      } else {
        return;
      }
      
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
      date: formatDateToLocalISO(newDate),
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
    handleCancelReschedule: handleCancelRescheduleNative
  } = useCalendarDrag({
    onAppointmentReschedule,
    onOptimisticUpdate: handleOptimisticUpdate,
    onRevertUpdate: handleRevertUpdate,
    getAppointmentsForSlot
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
  } = useCalendarDragDndKit({
    onAppointmentReschedule,
    onOptimisticUpdate: handleOptimisticUpdate,
    onRevertUpdate: handleRevertUpdate,
  });

  // Use the appropriate hook based on feature flag
  const dragState = USE_DND_KIT ? dragStateDndKit : dragStateNative;
  const dropTarget = USE_DND_KIT ? dropTargetDndKit : dropTargetNative;
  const showConfirmDialog = USE_DND_KIT ? showConfirmDialogDndKit : showConfirmDialogNative;
  const pendingReschedule = USE_DND_KIT ? pendingRescheduleDndKit : pendingRescheduleNative;
  const handleConfirmReschedule = USE_DND_KIT ? handleConfirmRescheduleDndKit : handleConfirmRescheduleNative;
  const handleCancelReschedule = USE_DND_KIT ? handleCancelRescheduleDndKit : handleCancelRescheduleNative;

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
        return format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
      case 'week': {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, "d 'de' MMM", { locale: ptBR })} - ${format(weekEnd, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`;
      }
      case 'month':
        return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    }
  }, [viewType, currentDate]);

  // Restore focus to calendar grid when RescheduleConfirmDialog closes (cancel or confirm)
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const prevShowConfirmRef = useRef(showConfirmDialog);
  useEffect(() => {
    const didClose = prevShowConfirmRef.current && !showConfirmDialog;
    prevShowConfirmRef.current = showConfirmDialog;
    if (didClose) {
      // Short delay so focus runs after Radix unmounts the dialog and releases focus
      const t = setTimeout(() => {
        calendarGridRef.current?.focus({ preventScroll: true });
      }, 0);
      return () => clearTimeout(t);
    }
  }, [showConfirmDialog]);

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
    // Over-capacity appointments get a special amber/orange pulsing style
    if (isOverCapacity) {
      return 'bg-gradient-to-br from-amber-600 to-orange-600 border-amber-400 shadow-amber-500/40 ring-2 ring-amber-400/50 ring-offset-1';
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
        return 'bg-gradient-to-br from-rose-500 to-rose-600 border-rose-400 shadow-rose-500/30';
      case 'atrasado':
      case 'late':
        return 'bg-gradient-to-br from-yellow-500 to-yellow-600 border-yellow-400 shadow-yellow-500/30';
      default:
        return 'bg-gradient-to-br from-gray-500 to-gray-600 border-gray-400 shadow-gray-500/30';
    }
  }, []);

  // Helper to check if appointment is over capacity
  const isOverCapacity = useCallback((apt: Appointment): boolean => {
    return apt.notes?.includes('[EXCEDENTE]') || false;
  }, []);

  // Hook for time slots availability
  const { timeSlots: dayTimeSlotInfo, isDayClosed, isTimeBlocked, getBlockReason, blockedTimes, businessHours } = useAvailableTimeSlots(currentDate);

  // Helper to check if time is blocked for any date
  const checkTimeBlocked = useCallback((date: Date, time: string): { blocked: boolean; reason?: string } => {
    if (!blockedTimes || !time) {
      return { blocked: false };
    }

    const dayOfWeek = date.getDay();
    // Safety check for time split
    const [timeH, timeM] = (time || '00:00').split(':').map(Number);
    const timeMinutes = timeH * 60 + timeM;

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
  }, [blockedTimes]);

  // Check if a day is closed based on business hours
  const isDayClosedForDate = useCallback((date: Date): boolean => {
    const dayOfWeek = date.getDay();
    if (!businessHours || businessHours.length === 0) {
      return dayOfWeek === 0; // Sunday closed by default
    }
    const dayConfig = businessHours.find(h => h.day_of_week === dayOfWeek);
    return dayConfig ? !dayConfig.is_open : dayOfWeek === 0;
  }, [businessHours]);

  const memoizedTimeSlots = useMemo(() => {
    return dayTimeSlotInfo.length > 0 ? dayTimeSlotInfo.map(s => s.time) : generateTimeSlots(currentDate);
  }, [dayTimeSlotInfo, currentDate]);

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
      <Card className="flex flex-col border-0 shadow-xl min-h-[500px] sm:min-h-[600px]" role="region" aria-label="Calendário de agendamentos">
        <CardContent className="p-2 md:p-3 lg:p-4 flex flex-col h-full">
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
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </Button>
                )}
                {onCreateAppointment && (
                  <Button
                    onClick={onCreateAppointment}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-8 w-8 p-0"
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
                  className="h-8 px-3 rounded-lg font-medium"
                  aria-label="Ir para hoje"
                >
                  Hoje
                </Button>

                <h2 className="text-base font-semibold text-gray-900 dark:text-white" aria-live="polite" aria-atomic="true">
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

                {/* Cancel All */}
                {onCancelAllToday && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancelAllToday}
                    className="h-8 px-2.5 rounded-lg border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50"
                    title="Cancelar todos os agendamentos da data exibida"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline ml-1.5 text-xs">Cancelar todos</span>
                  </Button>
                )}

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
                  appointments={displayAppointments}
                  savingAppointmentId={dragState.savingAppointmentId}
                  timeSlots={memoizedTimeSlots}
                  isDayClosed={isDayClosed}
                  onTimeSlotClick={onTimeSlotClick}
                  onEditAppointment={onEditAppointment}
                  onDeleteAppointment={onDeleteAppointment}
                  onAppointmentReschedule={onAppointmentReschedule}
                  dragState={dragState}
                  dropTarget={dropTarget}
                  targetAppointments={targetAppointments}
                  handleDragStart={handleDragStart}
                  handleDragEnd={handleDragEnd}
                  handleDragOver={handleDragOver}
                  handleDragLeave={handleDragLeave}
                  handleDrop={handleDrop}
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
                    getStatusColor={getStatusColor}
                    isOverCapacity={isOverCapacity}
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
                  appointments={appointments}
                  onDateChange={onDateChange}
                  onTimeSlotClick={onTimeSlotClick}
                  onEditAppointment={onEditAppointment}
                  onDeleteAppointment={onDeleteAppointment}
                  getAppointmentsForDate={getAppointmentsForDate}
                  getStatusColor={getStatusColor}
                  isOverCapacity={isOverCapacity}
                  openPopoverId={openPopoverId}
                  setOpenPopoverId={setOpenPopoverId}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelection={onToggleSelection}
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