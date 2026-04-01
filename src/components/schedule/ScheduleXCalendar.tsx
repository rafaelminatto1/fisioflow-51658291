/**
 * ScheduleXCalendar — Wrapper correto para @schedule-x/react
 *
 * PADRÃO DE HOOKS CORRETO:
 * 1. useCalendarApp() chamado UMA VEZ com events: []
 * 2. Eventos atualizados imperativamente via calendarApp.events.set()
 * 3. View/data trocados via calendarControls plugin
 * 4. Callbacks usam ref para evitar stale closures sem recriar calendário
 *
 * Isso resolve o React error #306 das tentativas anteriores.
 */

import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	createViewDay,
	createViewMonthGrid,
	createViewWeek,
} from "@schedule-x/calendar";
import { ScheduleXCalendar, useCalendarApp } from "@schedule-x/react";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop";
import { Temporal } from "temporal-polyfill";
import { format, addDays, addMonths, addWeeks, subDays, subMonths, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScheduleToolbar } from "./ScheduleToolbar";
import { ScheduleXAppointmentCard } from "./ScheduleXAppointmentCard";
import { normalizeStatus } from "./shared/appointment-status";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/appointment";
import type { TherapistProfileRow } from "@/types/therapist";

import "@/styles/schedulex.css";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ViewType = "day" | "week" | "month";

// Mapeamento: nosso viewType → nome da view no ScheduleX v4
const VIEW_MAP: Record<ViewType, string> = {
	day: "day",
	week: "week",
	month: "month-grid",
};

interface ScheduleXCalendarWrapperProps {
	appointments: Appointment[];
	currentDate: Date;
	viewType: ViewType;
	onDateChange: (date: Date) => void;
	onViewTypeChange: (type: string) => void;
	onTimeSlotClick: (date: Date, time: string) => void;
	onAppointmentClick?: (appointment: Appointment) => void;
	onEditAppointment?: (appointment: Appointment) => void;
	onDeleteAppointment?: (appointment: Appointment) => void;
	onStatusChange?: (id: string, status: string) => void;
	onAppointmentReschedule?: (
		appointment: Appointment,
		newDate: Date,
		newTime: string,
	) => Promise<void>;
	selectionMode?: boolean;
	selectedIds?: Set<string>;
	onToggleSelection?: (id: string) => void;
	onCreateAppointment?: () => void;
	onToggleSelectionMode?: () => void;
	filters: { status: string[]; types: string[]; therapists: string[] };
	onFiltersChange: (filters: any) => void;
	onClearFilters: () => void;
	totalAppointmentsCount?: number;
	patientFilter?: string;
	onPatientFilterChange?: (val: string) => void;
	therapists?: TherapistProfileRow[];
}

// ─────────────────────────────────────────────────────────────
// Conversion: FisioFlow Appointment → ScheduleX Event
// ─────────────────────────────────────────────────────────────

function appointmentToEvent(apt: Appointment) {
	const dateStr =
		apt.date instanceof Date
			? format(apt.date, "yyyy-MM-dd")
			: String(apt.date).substring(0, 10);

	const [yStr, moStr, dStr] = dateStr.split("-");
	const year = Number(yStr);
	const month = Number(moStr);
	const day = Number(dStr);

	const timeParts = (apt.time || "08:00").split(":");
	const hour = Number(timeParts[0]) || 0;
	const minute = Number(timeParts[1]) || 0;

	const duration = apt.duration && apt.duration > 0 ? apt.duration : 60;

	const startZdt = Temporal.ZonedDateTime.from({
		year,
		month,
		day,
		hour,
		minute,
		second: 0,
		timeZone: "America/Sao_Paulo",
	});
	const endZdt = startZdt.add({ minutes: duration });

	const normalizedStatus = normalizeStatus(apt.status || "agendado");

	return {
		id: apt.id,
		title: apt.patientName || "Paciente",
		start: startZdt,
		end: endZdt,
		// Dados originais para recuperar no customComponent
		_customData: apt,
		_options: {
			additionalClasses: [`calendar-card-${normalizedStatus}`],
		},
	};
}

// ─────────────────────────────────────────────────────────────
// Navigation helpers
// ─────────────────────────────────────────────────────────────

function getPrev(date: Date, view: ViewType): Date {
	if (view === "day") return subDays(date, 1);
	if (view === "week") return subWeeks(date, 1);
	return subMonths(date, 1);
}

function getNext(date: Date, view: ViewType): Date {
	if (view === "day") return addDays(date, 1);
	if (view === "week") return addWeeks(date, 1);
	return addMonths(date, 1);
}

function formatHeader(date: Date, view: ViewType): string {
	if (view === "day")
		return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
	if (view === "week") {
		const start = new Date(date);
		start.setDate(date.getDate() - date.getDay()); // domingo
		const end = new Date(start);
		end.setDate(start.getDate() + 6);
		const sameMonth = start.getMonth() === end.getMonth();
		if (sameMonth)
			return `${format(start, "d", { locale: ptBR })} – ${format(end, "d 'de' MMMM", { locale: ptBR })}`;
		return `${format(start, "d MMM", { locale: ptBR })} – ${format(end, "d MMM", { locale: ptBR })}`;
	}
	return format(date, "MMMM yyyy", { locale: ptBR });
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

function ScheduleXCalendarWrapper(props: ScheduleXCalendarWrapperProps) {
	const {
		appointments,
		currentDate,
		viewType,
		onDateChange,
		onViewTypeChange,
		onTimeSlotClick,
		onAppointmentClick,
		onEditAppointment,
		onDeleteAppointment,
		onStatusChange,
		onAppointmentReschedule,
		selectionMode = false,
		selectedIds = new Set<string>(),
		onToggleSelection,
		onCreateAppointment,
		onToggleSelectionMode,
		filters,
		onFiltersChange,
		onClearFilters,
	} = props;

	// ── A) Refs para callbacks: sem stale closures, sem recriar calendário ──
	const cbRef = useRef({
		onDateChange,
		onViewTypeChange,
		onTimeSlotClick,
		onAppointmentClick,
		onEditAppointment,
		onDeleteAppointment,
		onStatusChange,
		onAppointmentReschedule,
	});
	// Atualiza refs após cada render sem triggering useEffect
	useEffect(() => {
		cbRef.current = {
			onDateChange,
			onViewTypeChange,
			onTimeSlotClick,
			onAppointmentClick,
			onEditAppointment,
			onDeleteAppointment,
			onStatusChange,
			onAppointmentReschedule,
		};
	});

	// ── B) Guards: evitam loop de sincronização ──
	// onRangeUpdate → onDateChange → currentDate prop muda → calendarControls.setDate → onRangeUpdate
	const prevDateRef = useRef(format(currentDate, "yyyy-MM-dd"));
	const prevViewRef = useRef(viewType);

	// ── C) Eventos convertidos ──
	const events = useMemo(
		() => appointments.map(appointmentToEvent),
		[appointments],
	);

	// ── D) Plugins estáveis (useState garante ref única para toda a vida do componente) ──
	const [calendarControls] = useState(() => createCalendarControlsPlugin());
	const [dndPlugin] = useState(() => createDragAndDropPlugin(15));

	// ── E) Data inicial como Temporal.PlainDate (só usado na inicialização) ──
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const initialDate = useMemo(
		() =>
			Temporal.PlainDate.from({
				year: currentDate.getFullYear(),
				month: currentDate.getMonth() + 1,
				day: currentDate.getDate(),
			}),
		[], // Intencional: só para inicialização; sincronização feita no useEffect I
	);

	// ── F) Calendário criado UMA VEZ ──
	// events: [] → vazio, populado imperativamente no useEffect G
	const calendarApp = useCalendarApp({
		views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
		defaultView: VIEW_MAP[viewType],
		selectedDate: initialDate,
		events: [], // ← VAZIO — não passe events aqui
		locale: "pt-BR",
		firstDayOfWeek: 0, // Domingo
		dayBoundaries: { start: "07:00", end: "20:00" },
		plugins: [calendarControls, dndPlugin],
		callbacks: {
			onRangeUpdate: (range: any) => {
				// Usuário navegou dentro do calendário; sincronizar data de volta para URL
				const r = range.start as Temporal.PlainDate | Temporal.ZonedDateTime;
				const year = r.year;
				const month = r.month;
				const day = r.day;
				const newDate = new Date(year, month - 1, day);
				const dateStr = format(newDate, "yyyy-MM-dd");
				prevDateRef.current = dateStr; // Marca como "nossa atualização" → evita echo
				cbRef.current.onDateChange(newDate);
			},
			onEventClick: (event: any) => {
				const apt: Appointment | undefined = event._customData;
				if (!apt) return;
				cbRef.current.onAppointmentClick?.(apt);
				cbRef.current.onEditAppointment?.(apt);
			},
			onEventUpdate: (updatedEvent: any) => {
				const apt: Appointment | undefined = updatedEvent._customData;
				if (!apt || !cbRef.current.onAppointmentReschedule) return;
				// newStart é ZonedDateTime em America/Sao_Paulo — usamos .hour/.minute direto
				const newStart = updatedEvent.start as Temporal.ZonedDateTime;
				const newDate = new Date(newStart.year, newStart.month - 1, newStart.day);
				const newTime = `${String(newStart.hour).padStart(2, "0")}:${String(newStart.minute).padStart(2, "0")}`;
				cbRef.current
					.onAppointmentReschedule(apt, newDate, newTime)
					.catch(() => {
						toast.error("Erro ao reagendar. O agendamento será restaurado.");
					});
			},
			onClickDateTime: (dateTime: any) => {
				const d = new Date(
					dateTime.year,
					dateTime.month - 1,
					dateTime.day,
				);
				const t = `${String(dateTime.hour).padStart(2, "0")}:${String(dateTime.minute).padStart(2, "0")}`;
				cbRef.current.onTimeSlotClick(d, t);
			},
			onClickDate: (date: any) => {
				// Clique em dia no month view
				const d = new Date(date.year, date.month - 1, date.day);
				cbRef.current.onTimeSlotClick(d, "08:00");
			},
		},
	});

	// ── G) Sincronizar eventos quando appointments mudar ──
	useEffect(() => {
		if (!calendarApp) return;
		(calendarApp as any).events.set(events);
	}, [calendarApp, events]);

	// ── H) Sincronizar viewType quando mudar externamente (URL / teclado) ──
	useEffect(() => {
		if (!calendarApp) return;
		if (prevViewRef.current === viewType) return;
		prevViewRef.current = viewType;
		calendarControls.setView(VIEW_MAP[viewType]);
	}, [calendarApp, calendarControls, viewType]);

	// ── I) Sincronizar data quando mudar externamente (URL / teclado T) ──
	useEffect(() => {
		if (!calendarApp) return;
		const dateStr = format(currentDate, "yyyy-MM-dd");
		if (prevDateRef.current === dateStr) return;
		prevDateRef.current = dateStr;
		const plain = Temporal.PlainDate.from({
			year: currentDate.getFullYear(),
			month: currentDate.getMonth() + 1,
			day: currentDate.getDate(),
		});
		calendarControls.setDate(plain);
	}, [calendarApp, calendarControls, currentDate]);

	// ── J) Custom event component ──
	// Recriado apenas quando selection state mudar
	const customEventComponent = useCallback(
		({ calendarEvent }: { calendarEvent: any }) => {
			const apt: Appointment | undefined = calendarEvent._customData;
			if (!apt) {
				return (
					<div className="text-xs p-1 truncate">{calendarEvent.title}</div>
				);
			}
			return (
				<ScheduleXAppointmentCard
					appointment={apt}
					onEditAppointment={cbRef.current.onEditAppointment}
					onDeleteAppointment={cbRef.current.onDeleteAppointment}
					onStatusChange={cbRef.current.onStatusChange}
					selectionMode={selectionMode}
					isSelected={selectedIds.has(apt.id)}
					onToggleSelection={onToggleSelection}
				/>
			);
		},
		[selectionMode, selectedIds, onToggleSelection],
	);

	// ─────────────────────────────────────────────────────────
	// Render
	// ─────────────────────────────────────────────────────────

	return (
		<div className="h-full flex flex-col bg-white dark:bg-slate-950 overflow-hidden">
			{/* ── Navigation row ── */}
			<div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
				<Button
					variant="outline"
					size="icon"
					className="h-7 w-7"
					onClick={() => onDateChange(getPrev(currentDate, viewType))}
					aria-label="Anterior"
				>
					<ChevronLeft className="h-3.5 w-3.5" />
				</Button>

				<Button
					variant="outline"
					size="sm"
					className="h-7 px-2.5 text-xs font-medium"
					onClick={() => onDateChange(new Date())}
				>
					Hoje
				</Button>

				<Button
					variant="outline"
					size="icon"
					className="h-7 w-7"
					onClick={() => onDateChange(getNext(currentDate, viewType))}
					aria-label="Próximo"
				>
					<ChevronRight className="h-3.5 w-3.5" />
				</Button>

				<h2
					className={cn(
						"text-sm font-semibold ml-1 capitalize",
						"text-slate-800 dark:text-slate-100",
					)}
				>
					{formatHeader(currentDate, viewType)}
				</h2>
			</div>

			{/* ── Toolbar com filtros ── */}
			<ScheduleToolbar
				currentDate={currentDate}
				viewType={viewType}
				onViewChange={(v) => onViewTypeChange(v)}
				isSelectionMode={selectionMode}
				onToggleSelection={onToggleSelectionMode ?? (() => {})}
				onCreateAppointment={onCreateAppointment ?? (() => {})}
				filters={filters}
				onFiltersChange={onFiltersChange}
				onClearFilters={onClearFilters}
			/>

			{/* ── ScheduleX Calendar ── */}
			<div className="flex-1 min-h-0 schedulex-calendar-wrapper overflow-auto">
				<ScheduleXCalendar
					calendarApp={calendarApp}
					customComponents={{
						timeGridEvent: customEventComponent,
						dateGridEvent: customEventComponent,
						monthGridEvent: customEventComponent,
					}}
				/>
			</div>
		</div>
	);
}

export default ScheduleXCalendarWrapper;
