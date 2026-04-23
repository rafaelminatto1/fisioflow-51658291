import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useStatusConfig } from "@/hooks/useStatusConfig";
import { useCardSize } from "@/hooks/useCardSize";
import { AppointmentQuickView } from "./AppointmentQuickView";
import { ScheduleToolbar } from "./ScheduleToolbar";
import {
  getCalendarCardColors,
  normalizeStatus,
} from "./shared/appointment-status";

type ViewType = "day" | "week" | "month";

const VIEW_MAP: Record<ViewType, string> = {
  day: "timeGridDay",
  week: "timeGridWeek",
  month: "dayGridMonth",
};

export interface FullCalendarWrapperProps {
  appointments: any[];
  currentDate: Date;
  onDateChange?: (date: Date) => void;
  viewType: ViewType;
  onViewTypeChange?: (view: ViewType) => void;
  onEventClick?: (event: any) => void;
  onTimeSlotClick?: (dateStr: string) => void;
  onAppointmentReschedule?: (id: string, start: string, end: string) => void;
  onEditAppointment?: (id: string) => void;
  onDeleteAppointment?: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onCreateAppointment?: () => void;
  onToggleSelectionMode?: () => void;
  filters?: any;
  onFiltersChange?: (filters: any) => void;
  onClearFilters?: () => void;
  totalAppointmentsCount?: number;
}

export function FullCalendarWrapper({
  appointments,
  currentDate,
  onDateChange,
  viewType,
  onViewTypeChange,
  onEventClick,
  onTimeSlotClick,
  onAppointmentReschedule,
  onEditAppointment,
  onDeleteAppointment,
  onStatusChange,
  isSelectionMode,
  selectedIds,
  onToggleSelection,
  onCreateAppointment,
  onToggleSelectionMode,
  filters,
  onFiltersChange,
  onClearFilters,
  totalAppointmentsCount,
}: FullCalendarWrapperProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const { config: statusConfig } = useStatusConfig();
  const { cardSize } = useCardSize();

  const [quickViewEvent, setQuickViewEvent] = useState<any>(null);

  // Sync external current date changes to FullCalendar
  useEffect(() => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      const calDate = format(api.getDate(), "yyyy-MM-dd");
      const propDate = format(currentDate, "yyyy-MM-dd");
      if (calDate !== propDate) {
        api.gotoDate(currentDate);
      }
    }
  }, [currentDate]);

  // Sync external view type changes to FullCalendar
  useEffect(() => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      const targetView = VIEW_MAP[viewType];
      if (api.view.type !== targetView) {
        api.changeView(targetView);
      }
    }
  }, [viewType]);

  // Convert appointments to FullCalendar format
  const events = useMemo(() => {
    return appointments.map((appt) => {
      const statusKey = normalizeStatus(appt.status || "agendado");
      const colors = getCalendarCardColors(statusKey, statusConfig);

      const startStr =
        appt.date && appt.startTime
          ? `${format(new Date(appt.date), "yyyy-MM-dd")}T${appt.startTime}`
          : undefined;
      const endStr =
        appt.date && appt.endTime
          ? `${format(new Date(appt.date), "yyyy-MM-dd")}T${appt.endTime}`
          : undefined;

      return {
        id: appt.id,
        title: appt.patient?.fullName || "Consulta",
        start: startStr,
        end: endStr,
        allDay: appt.allDay || false, // For tasks integration later
        extendedProps: {
          original: appt,
          colors,
          statusKey,
        },
        backgroundColor: colors.bg,
        borderColor: colors.border,
        textColor: colors.text,
      };
    });
  }, [appointments, statusConfig]);

  const handleDateClick = (arg: any) => {
    if (onTimeSlotClick) {
      onTimeSlotClick(arg.dateStr); // E.g. "2023-10-15T10:00:00"
    }
  };

  const handleEventClick = (info: any) => {
    // Prevent default browser jump if there is a URL
    info.jsEvent.preventDefault();

    if (isSelectionMode && onToggleSelection) {
      onToggleSelection(info.event.id);
      return;
    }

    if (onEventClick) {
      onEventClick(info.event.extendedProps.original);
    } else {
      setQuickViewEvent(info.event.extendedProps.original);
    }
  };

  const handleEventDrop = (info: any) => {
    if (!onAppointmentReschedule) {
      info.revert();
      return;
    }

    // Check if dropping a task (which doesn't have start/end originally in the same way, but it should be supported)
    const newStart = format(info.event.start, "yyyy-MM-dd'T'HH:mm:ss");
    const newEnd = info.event.end
      ? format(info.event.end, "yyyy-MM-dd'T'HH:mm:ss")
      : newStart;

    onAppointmentReschedule(info.event.id, newStart, newEnd);
  };

  const handleEventResize = (info: any) => {
    if (!onAppointmentReschedule) {
      info.revert();
      return;
    }

    const newStart = format(info.event.start, "yyyy-MM-dd'T'HH:mm:ss");
    const newEnd = info.event.end
      ? format(info.event.end, "yyyy-MM-dd'T'HH:mm:ss")
      : newStart;

    onAppointmentReschedule(info.event.id, newStart, newEnd);
  };

  const renderEventContent = (eventInfo: any) => {
    const { event } = eventInfo;
    const { original, colors } = event.extendedProps;
    const isSelected = isSelectionMode && selectedIds?.has(event.id);

    return (
      <div
        className="flex flex-col overflow-hidden w-full h-full p-1 text-xs relative"
        style={{
          borderLeft: `3px solid ${colors.border}`,
          opacity: isSelected ? 0.7 : 1,
          boxShadow: isSelected
            ? "0 0 0 2px var(--color-primary) inset"
            : "none",
        }}
      >
        <div className="font-semibold truncate">{event.title}</div>
        {!event.allDay && (
          <div className="opacity-80 text-[10px]">{eventInfo.timeText}</div>
        )}
        {original.isGroup && (
          <div className="opacity-80 text-[10px]">
            Grupo ({original.currentParticipants || 1})
          </div>
        )}

        {/* Render a small circle indicating task or appointment type if needed */}
        {original._isTask && (
          <div
            className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500"
            title="Tarefa"
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      <div className="flex-none p-4 pb-0 z-10 bg-background border-b border-border/50">
        <ScheduleToolbar
          currentDate={currentDate}
          viewType={viewType}
          onDateChange={onDateChange || (() => {})}
          onViewChange={onViewTypeChange || (() => {})}
          onTodayClick={() => onDateChange?.(new Date())}
          isSelectionMode={isSelectionMode || false}
          selectedCount={selectedIds?.size || 0}
          onToggleSelectionMode={onToggleSelectionMode || (() => {})}
          onCreateAppointment={onCreateAppointment || (() => {})}
          filters={filters}
          onFiltersChange={onFiltersChange || (() => {})}
          onClearFilters={onClearFilters || (() => {})}
          totalAppointments={totalAppointmentsCount}
        />
      </div>

      <div className="flex-1 min-h-0 relative p-4 calendar-container-override">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={VIEW_MAP[viewType]}
          initialDate={currentDate}
          headerToolbar={false} // We use ScheduleToolbar
          events={events}
          editable={true}
          droppable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          allDaySlot={true} // Allow all-day row for tasks
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          expandRows={true}
          height="100%"
          locale="pt-br"
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventContent={renderEventContent}
          // Localization
          buttonText={{
            today: "Hoje",
            month: "Mês",
            week: "Semana",
            day: "Dia",
            list: "Lista",
          }}
          allDayText="Dia todo"
        />
      </div>

      <AppointmentQuickView
        open={!!quickViewEvent}
        onOpenChange={(o) => !o && setQuickViewEvent(null)}
        appointment={quickViewEvent}
        onEdit={() => {
          if (quickViewEvent && onEditAppointment)
            onEditAppointment(quickViewEvent.id);
          setQuickViewEvent(null);
        }}
        onDelete={() => {
          if (quickViewEvent && onDeleteAppointment)
            onDeleteAppointment(quickViewEvent.id);
          setQuickViewEvent(null);
        }}
        onStatusChange={(status) => {
          if (quickViewEvent && onStatusChange)
            onStatusChange(quickViewEvent.id, status);
        }}
      />
    </div>
  );
}
