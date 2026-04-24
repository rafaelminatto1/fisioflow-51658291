/**
 * ScheduleCalendar — React-native wrapper around @fullcalendar/react.
 *
 * Replaces DayFlowCalendar (VanillaJS @event-calendar/core). Drop-in API
 * compatible with DayFlowCalendarWrapperProps; additionally accepts
 * `tarefas` to render tasks as all-day events.
 *
 * Reads business hours and blocked times from useScheduleSettings so the
 * calendar automatically honors the clinic's configured open window
 * (e.g. Saturday 07:00–13:00). No hardcoded slot min/max times.
 *
 * Timezone: every event is emitted in LOCAL wall-clock time via
 * src/lib/schedule/time.ts helpers. Never calls toISOString() or
 * getUTCHours() — that's the regression we fixed in DayFlow v3.9.
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
import { useEffect, useMemo, useRef, useState } from "react";

import { useCardSize } from "@/hooks/useCardSize";
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
import {
	getCalendarCardColors,
	normalizeStatus,
} from "./shared/appointment-status";
import { AppointmentQuickView } from "./AppointmentQuickView";
import { ScheduleToolbar } from "./ScheduleToolbar";
import { ScheduleEventContent } from "./ScheduleEventContent";

type ViewType = "day" | "week" | "month";

const VIEW_MAP: Record<ViewType, string> = {
	day: "timeGridDay",
	week: "timeGridWeek",
	month: "dayGridMonth",
};

/** Safe defaults when useScheduleSettings hasn't loaded yet. */
const DEFAULT_SLOT_MIN = "07:00:00";
const DEFAULT_SLOT_MAX = "21:00:00";

/**
 * Raw appointment shape as it comes from useSchedulePageData / Workers API.
 * Kept loose because the page-level data layer still mixes snake_case
 * (start_time) and camelCase (patientName) fields.
 */
interface RawAppointment {
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
	onAppointmentReschedule?: (
		id: string,
		start: string,
		end: string,
	) => void;
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
	therapists?: unknown[];
}

export function ScheduleCalendar(props: ScheduleCalendarProps) {
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
	} = props;

	const selectionOn = isSelectionMode ?? selectionMode ?? false;

	const calendarRef = useRef<FullCalendar | null>(null);
	const { config: statusConfig } = useStatusConfig();
	const { cssVariables } = useCardSize();
	const { businessHours: settingsHours, blockedTimes } = useScheduleSettings();

	const [quickViewAppointment, setQuickViewAppointment] = useState<
		RawAppointment | null
	>(null);

	useEffect(() => {
		console.log("[FisioFlow] ScheduleCalendar v1.0 - FullCalendar migration");
	}, []);

	// Sync external date changes to the calendar instance
	useEffect(() => {
		const api = calendarRef.current?.getApi();
		if (!api) return;
		const current = formatLocalDate(api.getDate());
		const target = formatLocalDate(currentDate);
		if (current !== target) api.gotoDate(currentDate);
	}, [currentDate]);

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

	// Derive slotMin/slotMax from the widest open window across days
	const { slotMin, slotMax } = useMemo(() => {
		if (!settingsHours || settingsHours.length === 0) {
			return { slotMin: DEFAULT_SLOT_MIN, slotMax: DEFAULT_SLOT_MAX };
		}
		const open = settingsHours.filter((h) => h.is_open);
		if (open.length === 0)
			return { slotMin: DEFAULT_SLOT_MIN, slotMax: DEFAULT_SLOT_MAX };
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
				const [h, m] = startTime.split(":").map(Number);
				const startDate = new Date(rawDate + "T" + startTime + ":00");
				const endDate = new Date(startDate.getTime() + a.duration * 60000);
				void h;
				void m;
				endIso = toLocalISOString(
					formatLocalDate(endDate),
					formatLocalTime(endDate),
				);
			} else {
				continue;
			}

			const statusKey = normalizeStatus(String(a.status || "agendado"));
			const colors = getCalendarCardColors(statusKey, statusConfig);
			const isGroup = Boolean(a.isGroup ?? a.is_group);

			apptEvents.push({
				id: String(a.id || a.tempId),
				title: String(a.patient_name || a.patientName || "Consulta"),
				start: startIso,
				end: endIso,
				classNames: [
					"fc-event-appointment",
					isGroup ? "fc-event-group" : "",
					selectionOn && selectedIds?.has(String(a.id))
						? "fc-event-selected-inline"
						: "",
				].filter(Boolean),
				extendedProps: {
					_kind: "appointment",
					original: a,
					colors,
					statusKey,
					isGroup,
					groupCount: Number(
						a.currentParticipants ?? a.current_participants ?? 0,
					),
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
	}, [
		appointments,
		tarefas,
		blockedTimes,
		statusConfig,
		selectedIds,
		selectionOn,
	]);

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
			const original = (info.event.extendedProps as { original: Tarefa })
				.original;
			onTaskClick?.(original);
			return;
		}

		if (selectionOn && onToggleSelection) {
			onToggleSelection(info.event.id);
			return;
		}

		const original = (info.event.extendedProps as { original: RawAppointment })
			.original;

		if (onEventClick) {
			onEventClick({ id: info.event.id });
			return;
		}
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
		const startIso = `${formatLocalDate(info.event.start)}T${formatLocalTime(
			info.event.start,
		)}`;
		const endIso = `${formatLocalDate(info.event.end)}T${formatLocalTime(
			info.event.end,
		)}`;
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
		const startIso = `${formatLocalDate(info.event.start)}T${formatLocalTime(
			info.event.start,
		)}`;
		const endIso = `${formatLocalDate(info.event.end)}T${formatLocalTime(
			info.event.end,
		)}`;
		onAppointmentReschedule(info.event.id, startIso, endIso);
	};

	const handleDatesSet = (arg: DatesSetArg) => {
		if (!onDateChange) return;
		const activeStart = arg.view.currentStart;
		if (formatLocalDate(activeStart) !== formatLocalDate(currentDate)) {
			onDateChange(activeStart);
		}
	};

	const renderEventContent = (arg: EventContentArg) => {
		const props = arg.event.extendedProps as {
			_kind?: string;
			colors?: { background: string; accent: string; text: string };
			isGroup?: boolean;
			groupCount?: number;
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
			/>
		);
	};

	// --- Render ------------------------------------------------------------

	return (
		<div
			className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-950"
			style={cssVariables}
			data-selection-mode={selectionOn ? "true" : "false"}
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
			/>

			<div className="flex min-h-0 flex-1 flex-col p-1 md:p-2">
				<div className="relative h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
					<FullCalendar
						ref={calendarRef}
						plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
						initialView={VIEW_MAP[viewType]}
						initialDate={currentDate}
						locale={ptBrLocale}
						firstDay={1}
						hiddenDays={[0]}
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
						businessHours={fcBusinessHours}
						nowIndicator
						allDaySlot
						allDayText="Dia todo"
						dayMaxEvents={3}
						editable
						selectable
						selectMirror
						snapDuration="00:15:00"
						longPressDelay={250}
						expandRows
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

			{quickViewAppointment && (
				<AppointmentQuickView
					open={!!quickViewAppointment}
					onOpenChange={(open) => !open && setQuickViewAppointment(null)}
					appointment={quickViewAppointment as never}
					onEdit={() => {
						const id = String(quickViewAppointment.id);
						setQuickViewAppointment(null);
						onEditAppointment?.(id);
					}}
					onDelete={() => {
						const id = String(quickViewAppointment.id);
						setQuickViewAppointment(null);
						onDeleteAppointment?.(id);
					}}
				>
					<span />
				</AppointmentQuickView>
			)}
		</div>
	);
}

export default ScheduleCalendar;
