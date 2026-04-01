/**
 * ScheduleXCalendar — Wrapper correto para @schedule-x/react
 *
 * PADRÃO DE HOOKS CORRETO:
 * 1. useCalendarApp() chamado UMA VEZ com configuração estável.
 * 2. Sincronização de data/view via useEffect imperativo.
 */

import { useState, useMemo, useEffect } from "react";
import { ScheduleXCalendar, useCalendarApp } from "@schedule-x/react";
import {
	createViewDay,
	createViewMonthGrid,
	createViewWeek,
} from "@schedule-x/calendar";
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import "@schedule-x/theme-default/dist/index.css";
import { format, isValid, parseISO } from "date-fns";
import { Temporal } from "temporal-polyfill";

// Tipos
type ViewType = "day" | "week" | "month";

interface ScheduleXCalendarWrapperProps {
	appointments: any[];
	currentDate: Date;
	viewType: ViewType;
	onEventClick?: (event: any) => void;
	onTimeSlotClick?: (time: string) => void;
	onAppointmentReschedule?: (id: string, start: string, end: string) => void;
	onDateChange?: (date: Date) => void;
	onViewTypeChange?: (view: ViewType) => void;
	onEditAppointment?: (id: string) => void;
	onDeleteAppointment?: (id: string) => void;
	onStatusChange?: (id: string, status: string) => void;
	onRangeChange?: (range: { start: string; end: string }) => void;
	customEventComponent?: any;
	// Outras props passadas pela página
	selectionMode?: boolean;
	selectedIds?: string[];
	onToggleSelection?: (id: string) => void;
	onCreateAppointment?: (data: any) => void;
	onToggleSelectionMode?: () => void;
	filters?: any;
	onFiltersChange?: (filters: any) => void;
	onClearFilters?: () => void;
	totalAppointmentsCount?: number;
	patientFilter?: string;
	onPatientFilterChange?: (val: string) => void;
	therapists?: any[];
}

const VIEW_MAP: Record<ViewType, string> = {
	day: "day",
	week: "week",
	month: "month-grid",
};

export function ScheduleXCalendarWrapper({
	appointments,
	currentDate,
	viewType,
	onEventClick,
	onTimeSlotClick,
	onAppointmentReschedule,
	onRangeChange,
	customEventComponent,
}: ScheduleXCalendarWrapperProps) {
	// ── A) Aguardar Temporal estar pronto (Injetado via index.html) ──
	const [isTemporalReady, setIsTemporalReady] = useState(() => typeof window !== "undefined" && !!window.Temporal);

	useEffect(() => {
		if (isTemporalReady) return;
		
		const check = setInterval(() => {
			if (typeof window !== "undefined" && window.Temporal) {
				setIsTemporalReady(true);
				clearInterval(check);
			}
		}, 50);
		return () => clearInterval(check);
	}, [isTemporalReady]);

	// ── B) Plugins Estáveis ──
	const [calendarControls] = useState(() => createCalendarControlsPlugin());
	const [dndPlugin] = useState(() => createDragAndDropPlugin());

	// ── C) Configuração Memoizada do Calendário (EVITA RE-RENDER DO CORE) ──
	const calendarConfig = useMemo(() => {
		if (!isTemporalReady) return null;

		const initialDateStr = format(
			currentDate instanceof Date && !isNaN(currentDate.getTime()) 
				? currentDate 
				: new Date(), 
			"yyyy-MM-dd"
		);

		console.log("[ScheduleX] Initializing Core with stable config");

		return {
			views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
			defaultView: VIEW_MAP[viewType],
			// Bypassing constructor selectedDate to avoid RangeError/Validation error
			events: [], 
			locale: "pt-BR",
			firstDayOfWeek: 7, 
			dayBoundaries: { start: "07:00", end: "20:00" },
			plugins: [calendarControls, dndPlugin],
			callbacks: {
				onRangeUpdate: (range: any) => {
					if (onRangeChange) {
						onRangeChange({
							start: typeof range.start === "string" ? range.start : range.start.toString(),
							end: typeof range.end === "string" ? range.end : range.end.toString(),
						});
					}
				},
				onEventClick: (event: any) => {
					if (onEventClick) onEventClick(event);
				},
				onClickDateTime: (dateTime: string) => {
					if (onTimeSlotClick) onTimeSlotClick(dateTime);
				},
				onEventUpdate: (event: any) => {
					if (onAppointmentReschedule) {
						onAppointmentReschedule(event.id, event.start, event.end);
					}
				}
			},
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isTemporalReady]); 

	const calendarApp = useCalendarApp(calendarConfig || { views: [createViewWeek()], events: [] });

	// ── D) Sincronização Imperativa de Eventos ──
	useEffect(() => {
		if (calendarApp && appointments && isTemporalReady) {
			try {
				// Adaptar appointments para o formato ScheduleX com guardas rigorosas
				const sxEvents = appointments
					.filter(a => {
						if (!a || !a.start_time || !a.end_time) return false;
						// Validar se as datas são parseáveis e não vazias
						return isValid(parseISO(a.start_time)) && isValid(parseISO(a.end_time));
					})
					.map(a => ({
						id: a.id,
						title: a.patient_name || "Consulta",
						start: a.start_time.replace(' ', 'T').substring(0, 16),
						end: a.end_time.replace(' ', 'T').substring(0, 16),
						status: a.status,
						type: a.type,
						therapist_id: a.therapist_id
					}));
				
				calendarApp.events.set(sxEvents);
			} catch (e) {
				console.error("[ScheduleX] Error setting events:", e);
			}
		}
	}, [appointments, calendarApp, isTemporalReady]);

	// ── E) Sincronização Imperativa de Data e View ──
	useEffect(() => {
		if (!calendarApp || !isTemporalReady || !calendarControls) return;

		try {
			const targetDate = format(currentDate, "yyyy-MM-dd");
			if (calendarControls.setViewDate) {
				calendarControls.setViewDate(targetDate);
			}
		} catch (e) {
			console.error("[ScheduleX] Sync error:", e);
		}
	}, [currentDate, calendarApp, calendarControls, isTemporalReady]);

	if (!isTemporalReady) {
		return <div className="flex-1 flex items-center justify-center">Carregando calendário...</div>;
	}

	return (
		<div className="flex-1 flex flex-col min-h-0 bg-background/30 backdrop-blur-md p-4 overflow-hidden">
			<div className="flex-1 min-h-0 glass-panel overflow-hidden">
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
