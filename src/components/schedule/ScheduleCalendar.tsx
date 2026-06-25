/**
 * ScheduleCalendar — React-native wrapper around @fullcalendar/react.
 *
 * 📖 Antes de mexer/depurar a Agenda, leia `docs/AGENDA.md` (fluxo
 *    drag/modal/status e armadilhas conhecidas, ex.: cache do Hyperdrive).
 *
 * Primary calendar engine for FisioFlow. Supports appointments,
 * tasks (as all-day events), and blocked times.
 *
 * Reads business hours and blocked times from useScheduleSettings so the
 * calendar automatically honors the clinic's configured open window
 * (e.g. Saturday 07:00–13:00). No hardcoded slot min/max times.
 *
 * Timezone: every event is emitted in LOCAL wall-clock time via
 * src/lib/schedule/time.ts helpers.
 */

import interactionPlugin from "@fullcalendar/interaction";
import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import dayGridPlugin from "@fullcalendar/daygrid";
import FullCalendar from "@fullcalendar/react";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import "@/styles/fullcalendar.css";

import { useAgendaAppearancePersistence } from "@/hooks/useAgendaAppearancePersistence";
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import {
  diffMinutes,
  formatLocalDate,
  formatLocalTime,
  roundDownToMinutes,
  toLocalISOString,
} from "@/lib/schedule/time";
import type { Tarefa } from "@/types/tarefas";
import type { TherapistSummary } from "@/types/workers";
import { normalizeStatus } from "./shared/appointment-status";
import { AppointmentQuickView } from "./AppointmentQuickView";
import { ScheduleToolbar } from "./ScheduleToolbar";
import { ScheduleEventContent } from "./ScheduleEventContent";
import { deriveCalendarBehavior } from "./scheduleBehavior";
import { parseLocalDT } from "@/lib/date-utils";

type ViewType = "day" | "week" | "month";

const VIEW_MAP: Record<ViewType, string> = {
  day: "timeGridDay",
  week: "timeGridWeek",
  month: "dayGridMonth",
};

/** Safe defaults when useScheduleSettings hasn't loaded yet. */
const DEFAULT_SLOT_MIN = "07:00:00";
const DEFAULT_SLOT_MAX = "21:00:00";
const DEFAULT_EVENT_COLORS = {
  accent: "#d97706",
  background: "#fef3c7",
  text: "#92400e",
};

/**
 * Raw appointment shape as it comes from useSchedulePageData / Workers API.
 * Kept loose because the page-level data layer still mixes snake_case
 * (start_time) and camelCase (patientName) fields.
 */
export interface RawAppointment {
  id: string;
  tempId?: string;
  date?: string | Date;
  time?: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  status?: string;
  patient_name?: string;
  patientName?: string;
  therapist_id?: string;
  isGroup?: boolean;
  is_group?: boolean;
  currentParticipants?: number;
  current_participants?: number;
  has_high_pain_alert?: boolean;
  risk_of_no_show?: boolean;
  [k: string]: unknown;
}

export interface ScheduleCalendarProps {
  appointments: RawAppointment[];
  tarefas?: Tarefa[];
  currentDate: Date;
  viewType: ViewType;
  onDateChange?: (date: Date) => void;
  onViewTypeChange?: (view: ViewType) => void;
  onEventClick?: (event: { id: string }) => void;
  onTimeSlotClick?: (iso: string) => void;
  onTaskClick?: (task: Tarefa) => void;
  onAppointmentReschedule?: (id: string, start: string, end: string) => void;
  onEditAppointment?: (id: string) => void;
  onDeleteAppointment?: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
  isSelectionMode?: boolean;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onCreateAppointment?: () => void;
  onToggleSelectionMode?: () => void;
  filters?: {
    status?: string[];
    types?: string[];
    therapists?: string[];
  };
  onFiltersChange?: (filters: NonNullable<ScheduleCalendarProps["filters"]>) => void;
  onClearFilters?: () => void;
  totalAppointmentsCount?: number;
  patientFilter?: string;
  onPatientFilterChange?: (patient: string) => void;
  therapists?: TherapistSummary[];
}

const ScheduleCalendarInner = (props: ScheduleCalendarProps) => {
  const {
    appointments,
    tarefas = [],
    currentDate,
    viewType,
    onDateChange,
    onViewTypeChange,
    onEventClick,
    onTimeSlotClick,
    onTaskClick,
    onAppointmentReschedule,
    onEditAppointment,
    onDeleteAppointment,
    isSelectionMode,
    selectionMode,
    selectedIds,
    onToggleSelection,
    onCreateAppointment,
    onToggleSelectionMode,
    filters,
    onFiltersChange,
    onClearFilters,
    patientFilter,
    onPatientFilterChange,
    therapists,
  } = props;

  const selectionOn = isSelectionMode ?? selectionMode ?? false;

  const calendarRef = useRef<FullCalendar | null>(null);
  const fcContainerRef = useRef<HTMLDivElement>(null);
  // Set right before a programmatic gotoDate() so the datesSet echo it
  // triggers does not bounce back into onDateChange (loop prevention).
  const suppressDatesSetRef = useRef(false);
  // Track the last seen active start date of the calendar to detect actual navigation.
  const lastActiveStartRef = useRef<string | null>(null);
  const { statusConfig } = useStatusConfig();
  const { cssVariables, slotHeightPx, appearance, display } =
    useAgendaAppearancePersistence(viewType);
  const { businessHours: settingsHours, blockedTimes } = useScheduleSettings();

  const [quickViewAppointment, setQuickViewAppointment] = useState<RawAppointment | null>(null);
  const [popoverAnchorRect, setPopoverAnchorRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    const container = fcContainerRef.current;
    if (!api || !container || typeof ResizeObserver === "undefined") return;

    let frame = 0;
    const syncCalendarSize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        api.updateSize();
      });
    };

    syncCalendarSize();

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (entry.contentRect.width <= 0 || entry.contentRect.height <= 0) return;
      syncCalendarSize();
    });

    observer.observe(container);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  // Sync calendar size when density/height variables change
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;

    // Directly inject the CSS custom property onto the FC container so that
    // .fc-timegrid-slot { height: var(--agenda-slot-height) } reflows immediately.
    // React's style prop on the outer div also carries this variable, but the
    // FullCalendar DOM may not reflow without an explicit setProperty trigger.
    const container = fcContainerRef.current;
    if (container) {
      container.style.setProperty("--agenda-slot-height", `${slotHeightPx}px`);
    }

    api.updateSize();
  }, [slotHeightPx, appearance.cardSize]);

  // Sync external date changes to the calendar instance.
  // Depend on the stable YMD string (not the Date object, which is recreated
  // every render in the parent) so this effect only runs on real day changes.
  const currentYmd = formatLocalDate(currentDate);
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const current = formatLocalDate(api.getDate());
    if (current === currentYmd) return;
    // Mark the upcoming datesSet (fired by gotoDate) as a programmatic echo so
    // handleDatesSet swallows it instead of re-emitting onDateChange.
    suppressDatesSetRef.current = true;
    api.gotoDate(currentDate);
    // Safety net: if gotoDate stays within the same displayed period it won't
    // fire datesSet, leaving the flag set. Clear it on the next tick so a later
    // genuine user navigation is never swallowed.
    queueMicrotask(() => {
      suppressDatesSetRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYmd]);

  // Sync external view type changes
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const target = VIEW_MAP[viewType];
    if (api.view.type !== target) api.changeView(target);
  }, [viewType]);

  // Dynamic business hours (per day of week) — drives FullCalendar shading
  const fcBusinessHours = useMemo(() => {
    if (!settingsHours || settingsHours.length === 0) return undefined;
    return settingsHours
      .filter((h) => h.is_open)
      .map((h) => ({
        daysOfWeek: [h.day_of_week],
        startTime: h.open_time,
        endTime: h.close_time,
      }));
  }, [settingsHours]);

  const behavior = useMemo(
    () => deriveCalendarBehavior(display, fcBusinessHours),
    [display, fcBusinessHours],
  );

  // Derive slotMin/slotMax from the widest open window across days
  const { slotMin, slotMax } = useMemo(() => {
    if (!settingsHours || settingsHours.length === 0) {
      return { slotMin: DEFAULT_SLOT_MIN, slotMax: DEFAULT_SLOT_MAX };
    }
    const open = settingsHours.filter((h) => h.is_open);
    if (open.length === 0) return { slotMin: DEFAULT_SLOT_MIN, slotMax: DEFAULT_SLOT_MAX };
    const minTime = open.reduce(
      (acc, h) => (h.open_time < acc ? h.open_time : acc),
      open[0].open_time,
    );
    const maxTime = open.reduce(
      (acc, h) => (h.close_time > acc ? h.close_time : acc),
      open[0].close_time,
    );
    return {
      slotMin: `${minTime}:00`,
      slotMax: `${maxTime}:00`,
    };
  }, [settingsHours]);

  // Build calendar events: appointments + tasks + blocked-times background
  const events = useMemo<EventInput[]>(() => {
    const apptEvents: EventInput[] = [];
    const safeAppointments = Array.isArray(appointments) ? appointments : [];
    for (const a of safeAppointments) {
      if (!a || (!a.id && !a.tempId)) continue;

      const rawDate =
        a.date instanceof Date
          ? formatLocalDate(a.date)
          : typeof a.date === "string"
            ? a.date.slice(0, 10)
            : "";
      if (rawDate.length < 10) continue;

      let startIso: string;
      let endIso: string;

      if (a.start_time && a.end_time) {
        startIso = toLocalISOString(rawDate, String(a.start_time).slice(0, 5));
        endIso = toLocalISOString(rawDate, String(a.end_time).slice(0, 5));
      } else if (a.time && a.duration) {
        const startTime = String(a.time).slice(0, 5);
        startIso = toLocalISOString(rawDate, startTime);
        const startDate = parseLocalDT(rawDate, startTime);
        const endDate = new Date(startDate.getTime() + a.duration * 60000);
        endIso = toLocalISOString(formatLocalDate(endDate), formatLocalTime(endDate));
      } else {
        continue;
      }

      const rawStatus = String(a.status || "agendado");
      const statusKey = statusConfig[rawStatus] ? rawStatus : normalizeStatus(rawStatus);
      const colors =
        statusConfig[statusKey]?.calendarCardColors ??
        statusConfig[normalizeStatus(rawStatus)]?.calendarCardColors ??
        statusConfig.agendado?.calendarCardColors ??
        DEFAULT_EVENT_COLORS;
      const isGroup = Boolean(a.isGroup ?? a.is_group);

      apptEvents.push({
        id: String(a.id || a.tempId),
        title: String(a.patient_name || a.patientName || "Consulta"),
        start: startIso,
        end: endIso,
        classNames: [
          "fc-event-appointment",
          isGroup ? "fc-event-group" : "",
          selectionOn && selectedIds?.has(String(a.id)) ? "fc-event-selected-inline" : "",
        ].filter(Boolean),
        extendedProps: {
          _kind: "appointment",
          original: a,
          colors,
          statusKey,
          isGroup,
          groupCount: Number(a.currentParticipants ?? a.current_participants ?? 0),
          hasHighPain: Boolean(a.has_high_pain_alert),
          hasNoShowRisk: Boolean(a.risk_of_no_show),
        },
      });
    }

    const taskEvents: EventInput[] = (tarefas ?? [])
      .filter((t) => !!t.data_vencimento)
      .map((t) => ({
        id: `task-${t.id}`,
        title: t.titulo,
        start: t.data_vencimento,
        allDay: true,
        editable: false,
        classNames: ["fc-event-task"],
        extendedProps: {
          _kind: "task",
          original: t,
        },
      }));

    const blockedEvents: EventInput[] = (blockedTimes ?? []).flatMap((b) => {
      // Skip recurring (unsupported in this simple layer — feature-gate later)
      if (b.is_recurring) return [];
      const startDate = b.start_date;
      const endDate = b.end_date || b.start_date;
      const startTime = b.is_all_day ? "00:00" : (b.start_time ?? "00:00");
      const endTime = b.is_all_day ? "23:59" : (b.end_time ?? "23:59");
      return [
        {
          id: `blocked-${b.id}`,
          title: b.title ?? "Bloqueio",
          start: toLocalISOString(startDate, startTime),
          end: toLocalISOString(endDate, endTime),
          display: "background" as const,
          classNames: ["fc-event-blocked"],
          extendedProps: { _kind: "blocked", original: b },
        },
      ];
    });

    return [...apptEvents, ...taskEvents, ...blockedEvents];
  }, [appointments, tarefas, blockedTimes, statusConfig, selectedIds, selectionOn]);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;

    let frame1 = 0;
    let frame2 = 0;
    frame1 = requestAnimationFrame(() => {
      api.updateSize();
      frame2 = requestAnimationFrame(() => {
        api.updateSize();
      });
    });

    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };
  }, [viewType, currentYmd, events.length]);

  // --- Handlers ----------------------------------------------------------

  const handleDateClick = (info: { date: Date }) => {
    const rounded = roundDownToMinutes(info.date, 15);
    const iso = `${formatLocalDate(rounded)}T${formatLocalTime(rounded)}`;
    onTimeSlotClick?.(iso);
  };

  const handleSelect = (arg: DateSelectArg) => {
    const rounded = roundDownToMinutes(arg.start, 15);
    const iso = `${formatLocalDate(rounded)}T${formatLocalTime(rounded)}`;
    onTimeSlotClick?.(iso);
  };

  const handleEventClick = (info: EventClickArg) => {
    info.jsEvent.preventDefault();

    const kind = (info.event.extendedProps as { _kind?: string })._kind;

    if (kind === "blocked") return; // background events are not interactive

    if (kind === "task") {
      const original = (info.event.extendedProps as { original: Tarefa }).original;
      onTaskClick?.(original);
      return;
    }

    if (selectionOn && onToggleSelection) {
      onToggleSelection(info.event.id);
      return;
    }

    const original = (info.event.extendedProps as { original: RawAppointment }).original;

    // Guardamos o retângulo do elemento clicado para posicionar o popover
    const rect = info.el.getBoundingClientRect();
    setPopoverAnchorRect(rect);

    if (onEventClick) {
      onEventClick({ id: info.event.id });
    }

    // Always set quick view for appointments if not in selection mode
    setQuickViewAppointment(original);
  };

  const handleEventDrop = (info: EventDropArg) => {
    const kind = (info.event.extendedProps as { _kind?: string })._kind;
    if (kind !== "appointment") {
      info.revert();
      return;
    }
    if (!info.event.start || !info.event.end || !onAppointmentReschedule) {
      info.revert();
      return;
    }
    const startIso = `${formatLocalDate(info.event.start)}T${formatLocalTime(info.event.start)}`;
    const endIso = `${formatLocalDate(info.event.end)}T${formatLocalTime(info.event.end)}`;
    onAppointmentReschedule(info.event.id, startIso, endIso);
  };

  const handleEventResize = (info: EventResizeDoneArg) => {
    const kind = (info.event.extendedProps as { _kind?: string })._kind;
    if (kind !== "appointment") {
      info.revert();
      return;
    }
    if (!info.event.start || !info.event.end || !onAppointmentReschedule) {
      info.revert();
      return;
    }
    if (diffMinutes(info.event.start, info.event.end) < 15) {
      info.revert();
      return;
    }
    const startIso = `${formatLocalDate(info.event.start)}T${formatLocalTime(info.event.start)}`;
    const endIso = `${formatLocalDate(info.event.end)}T${formatLocalTime(info.event.end)}`;
    onAppointmentReschedule(info.event.id, startIso, endIso);
  };

  const handleDatesSet = (arg: DatesSetArg) => {
    if (!onDateChange) return;
    const activeStart = arg.view.currentStart;
    const activeEnd = arg.view.currentEnd;
    if (!activeStart || !activeEnd) return;

    const startYmd = formatLocalDate(activeStart);

    // If the calendar's displayed period start date has not changed, this datesSet
    // event was likely triggered by a re-render or option update, not navigation.
    // Skip to prevent infinite loops of reverting programmatic date changes.
    if (lastActiveStartRef.current === startYmd) {
      return;
    }
    lastActiveStartRef.current = startYmd;

    // Swallow the datesSet echo triggered by our own programmatic gotoDate.
    if (suppressDatesSetRef.current) {
      suppressDatesSetRef.current = false;
      return;
    }
    // Compare on calendar-day (YMD) boundaries, never raw timestamps:
    // currentDate is LOCAL NOON while currentStart/currentEnd are LOCAL
    // MIDNIGHT, so a raw `>=`/`<` comparison is off by 12h and can misfire at
    // the period edges. Only sync the URL when the selected day falls outside
    // the displayed period; otherwise we'd snap currentDate back to the period
    // start (e.g. Monday) on every internal fire — an infinite loop bouncing
    // the URL between two adjacent weeks.
    // currentEnd is exclusive (midnight of the day after the last visible day);
    // shift back one day to get the last visible day for an inclusive compare.
    const lastVisibleYmd = formatLocalDate(new Date(activeEnd.getTime() - 86400000));
    if (currentYmd >= startYmd && currentYmd <= lastVisibleYmd) return;
    onDateChange(activeStart);
  };

  const renderEventContent = (arg: EventContentArg) => {
    const props = arg.event.extendedProps as {
      _kind?: string;
      colors?: { background: string; accent: string; text: string };
      isGroup?: boolean;
      groupCount?: number;
      hasHighPain?: boolean;
      hasNoShowRisk?: boolean;
      original?: RawAppointment;
    };

    const kind = props._kind;
    if (kind === "blocked") return undefined;

    if (kind === "task") {
      const taskColors = { background: "transparent", accent: "currentColor", text: "inherit" };
      return (
        <ScheduleEventContent
          title={arg.event.title}
          timeText=""
          isAllDay
          isGroup={false}
          isTask
          colors={taskColors}
          isSelected={false}
        />
      );
    }

    const colors = props.colors || {
      background: "transparent",
      accent: "currentColor",
      text: "inherit",
    };
    const isGroup = !!props.isGroup;
    const groupCount = props.groupCount || 0;

    const original = props.original;
    const durationLabel = original?.duration ? `${original.duration}min` : undefined;
    const typeLabel =
      (original?.appointment_type_name as string | undefined) ||
      (original?.type as string | undefined) ||
      undefined;
    const phone =
      (original?.patient_phone as string | undefined) ||
      (original?.phone as string | undefined) ||
      undefined;

    return (
      <ScheduleEventContent
        title={arg.event.title}
        timeText={arg.timeText}
        isAllDay={arg.event.allDay}
        isGroup={isGroup}
        groupCount={groupCount}
        isTask={false}
        colors={colors}
        isSelected={selectionOn && !!selectedIds?.has(arg.event.id)}
        hasHighPain={props.hasHighPain}
        hasNoShowRisk={props.hasNoShowRisk}
        durationLabel={durationLabel}
        typeLabel={typeLabel}
        phone={phone}
        show={{
          duration: display.showDuration,
          type: display.showType,
          phone: display.showPhone,
        }}
      />
    );
  };

  // --- Render ------------------------------------------------------------

  return (
    <div
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-950"
      style={cssVariables}
      data-selection-mode={selectionOn ? "true" : "false"}
      data-agenda-density={appearance.cardSize}
      data-agenda-view={viewType}
    >
      <ScheduleToolbar
        currentDate={currentDate}
        viewType={viewType}
        onViewChange={onViewTypeChange as never}
        onDateChange={onDateChange || (() => {})}
        isSelectionMode={selectionOn}
        onToggleSelection={onToggleSelectionMode || (() => {})}
        onCreateAppointment={onCreateAppointment || (() => {})}
        filters={filters || { status: [], types: [], therapists: [] }}
        onFiltersChange={onFiltersChange || (() => {})}
        onClearFilters={onClearFilters || (() => {})}
        patientFilter={patientFilter || ""}
        onPatientFilterChange={onPatientFilterChange || (() => {})}
        therapists={therapists}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          ref={fcContainerRef}
          className="relative flex h-full min-h-0 w-full flex-1 overflow-hidden border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 [&>.fc]:flex-1 [&>.fc]:h-full [&>.fc]:min-h-0 [&>.fc]:w-full [&_.fc-scrollgrid]:h-full [&_.fc-view-harness]:h-full [&_.fc-view-harness-active]:h-full"
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={VIEW_MAP[viewType]}
            initialDate={currentDate}
            locale={ptBrLocale}
            firstDay={1}
            hiddenDays={behavior.hiddenDays}
            headerToolbar={false}
            slotMinTime={slotMin}
            slotMaxTime={slotMax}
            slotDuration="00:15:00"
            slotLabelInterval="01:00:00"
            slotLabelFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              meridiem: false,
            }}
            scrollTime="07:00:00"
            businessHours={behavior.businessHours}
            nowIndicator={behavior.nowIndicator}
            allDaySlot={false}
            dayMaxEvents={3}
            slotEventOverlap={false}
            editable
            selectable
            selectMirror
            snapDuration="00:15:00"
            longPressDelay={250}
            height="100%"
            events={events}
            eventContent={renderEventContent}
            dateClick={handleDateClick}
            select={handleSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            datesSet={handleDatesSet}
          />
        </div>
      </div>

      {quickViewAppointment && popoverAnchorRect && (
        <AppointmentQuickView
          open={!!quickViewAppointment}
          onOpenChange={(open) => {
            if (!open) {
              setQuickViewAppointment(null);
              setPopoverAnchorRect(null);
            }
          }}
          appointment={quickViewAppointment as never}
          onEdit={() => {
            const id = String(quickViewAppointment.id);
            setQuickViewAppointment(null);
            setPopoverAnchorRect(null);
            onEditAppointment?.(id);
          }}
          onDelete={() => {
            const id = String(quickViewAppointment.id);
            setQuickViewAppointment(null);
            setPopoverAnchorRect(null);
            onDeleteAppointment?.(id);
          }}
        >
          <div
            style={{
              position: "fixed",
              top: popoverAnchorRect.top,
              left: popoverAnchorRect.left,
              width: popoverAnchorRect.width,
              height: popoverAnchorRect.height,
              pointerEvents: "none",
              zIndex: -1,
            }}
          />
        </AppointmentQuickView>
      )}
    </div>
  );
};

export const ScheduleCalendar = memo(ScheduleCalendarInner);
export default ScheduleCalendar;
