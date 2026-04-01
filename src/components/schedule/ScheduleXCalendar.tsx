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
import { format } from "date-fns";
import { Temporal } from "temporal-polyfill";

// Tipos
type ViewType = "day" | "week" | "month";

interface ScheduleXCalendarWrapperProps {
	events: any[];
	currentDate: Date;
	viewType: ViewType;
	onEventClick?: (event: any) => void;
	onRangeChange?: (range: { start: string; end: string }) => void;
	customEventComponent?: any;
}

const VIEW_MAP: Record<ViewType, string> = {
	day: "day",
	week: "week",
	month: "month-grid",
};

export function ScheduleXCalendarWrapper({
	events,
	currentDate,
	viewType,
	onEventClick,
	onRangeChange,
	customEventComponent,
}: ScheduleXCalendarWrapperProps) {
	// ── A) Injeção do Temporal no escopo global (Requisito Schedule-X v4) ──
	useEffect(() => {
		if (typeof window !== "undefined" && !window.Temporal) {
			(window as any).Temporal = Temporal;
		}
	}, []);

	// ── B) Plugins Estáveis ──
	const [calendarControls] = useState(() => createCalendarControlsPlugin());
	const [dndPlugin] = useState(() => createDragAndDropPlugin());

	// ── C) Configuração Memoizada do Calendário (EVITA RE-RENDER DO CORE) ──
	const calendarConfig = useMemo(() => {
		const initialDateStr = format(
			currentDate instanceof Date && !isNaN(currentDate.getTime()) 
				? currentDate 
				: new Date(), 
			"yyyy-MM-dd"
		);

		console.log("[ScheduleX] Initializing Core with STRING date:", initialDateStr);

		return {
			views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
			defaultView: VIEW_MAP[viewType],
			selectedDate: initialDateStr, // USAR STRING PURA
			events: [], // Sempre inicia vazio para evitar race conditions
			locale: "pt-BR",
			firstDayOfWeek: 7, // Domingo (Padrão BR)
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
			},
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); 

	const calendarApp = useCalendarApp(calendarConfig);

	// ── D) Sincronização Imperativa de Eventos ──
	useEffect(() => {
		if (calendarApp && events) {
			calendarApp.events.set(events);
		}
	}, [events, calendarApp]);

	// ── E) Sincronização Imperativa de Data e View ──
	useEffect(() => {
		if (!calendarApp) return;

		try {
			const targetDate = format(currentDate, "yyyy-MM-dd");
			const currentSelected = calendarApp.range.value?.start;
			
			// Só atualiza se for diferente para evitar loops
			if (currentSelected !== targetDate && calendarControls.setViewDate) {
				calendarControls.setViewDate(targetDate);
			}
		} catch (e) {
			console.error("[ScheduleX] Sync error:", e);
		}
	}, [currentDate, calendarApp, calendarControls]);

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
