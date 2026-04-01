/**
 * ScheduleXCalendar — Wrapper correto para @schedule-x/react
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

	const [calendarControls] = useState(() => createCalendarControlsPlugin());
	const [dndPlugin] = useState(() => createDragAndDropPlugin());

	const calendarConfig = useMemo(() => {
		if (!isTemporalReady) return null;
		return {
			views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
			defaultView: VIEW_MAP[viewType],
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
	}, [isTemporalReady]); 

	const calendarApp = useCalendarApp(calendarConfig || { views: [createViewWeek()], events: [] });

	useEffect(() => {
		if (calendarApp && appointments && isTemporalReady) {
			try {
				const sxEvents = appointments
					.filter(a => {
						if (!a || !a.start_time || !a.end_time) return false;
						const s = String(a.start_time).trim();
						const e = String(a.end_time).trim();
						if (!s || !e) return false;
						return isValid(parseISO(s)) && isValid(parseISO(e));
					})
					.map(a => ({
						id: String(a.id),
						title: a.patient_name || "Consulta",
						start: String(a.start_time).replace(' ', 'T').substring(0, 16),
						end: String(a.end_time).replace(' ', 'T').substring(0, 16),
						status: a.status,
						type: a.type,
						therapist_id: a.therapist_id
					}));
				
				calendarApp.events.set(sxEvents);
			} catch (err) {
				console.error("[ScheduleX] Critical map error:", err);
			}
		}
	}, [appointments, calendarApp, isTemporalReady]);

	useEffect(() => {
		if (!calendarApp || !isTemporalReady || !calendarControls) return;
		try {
			const targetDate = format(currentDate, "yyyy-MM-dd");
			if (calendarControls.setViewDate) {
				calendarControls.setViewDate(targetDate);
			}
		} catch (e) {}
	}, [currentDate, calendarApp, calendarControls, isTemporalReady]);

	if (!isTemporalReady) return <div className="flex-1 flex items-center justify-center">Carregando...</div>;

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
