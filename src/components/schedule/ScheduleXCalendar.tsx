/**
 * ScheduleXCalendar — Wrapper para @schedule-x/react v3.7.3
 * Versão de Controle Total - Montagem Vanilla Direta
 */

import { useState, useMemo, useEffect, useOptimistic, useTransition, useRef, useLayoutEffect } from "react";
import { createCalendar, createViewDay, createViewMonthGrid, createViewWeek } from "@schedule-x/calendar";
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import { createCurrentTimePlugin } from "@schedule-x/current-time";
import "@schedule-x/theme-default/dist/index.css";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// UI Components
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
	User, 
	Clock, 
	CreditCard, 
	ExternalLink, 
	Play, 
	Calendar as CalendarIcon,
	MoreHorizontal,
} from "lucide-react";
import { ScheduleToolbar } from "./ScheduleToolbar";

// Tipos
type ViewType = "day" | "week" | "month";

interface ScheduleXCalendarWrapperProps {
	appointments: any[];
	currentDate: Date;
	viewType: ViewType;
	onEventClick?: (event: any) => void;
	onTimeSlotClick?: (time: string) => void;
	onAppointmentReschedule?: (id: string, start: string, end: string) => void;
	onStatusChange?: (id: string, status: string) => void;
	onRangeChange?: (range: { start: string; end: string }) => void;
	onViewTypeChange?: (view: ViewType) => void;
	onDateChange?: (date: Date) => void;
	onEditAppointment?: (id: string) => void;
	onDeleteAppointment?: (id: string) => void;
	isSelectionMode?: boolean;
	onToggleSelectionMode?: () => void;
	onCreateAppointment?: () => void;
	filters?: any;
	onFiltersChange?: (filters: any) => void;
	onClearFilters?: () => void;
	selectedIds?: Set<string>;
	therapists?: any[];
	totalAppointmentsCount?: number;
	patientFilter?: string;
	onPatientFilterChange?: (val: string) => void;
	selectionMode?: boolean;
}

const VIEW_MAP: Record<ViewType, string> = {
	day: "day",
	week: "week",
	month: "month-grid",
};

export function ScheduleXCalendarWrapper(props: ScheduleXCalendarWrapperProps) {
	const {
		appointments,
		currentDate,
		viewType,
		onDateChange,
		onViewTypeChange,
	} = props;

	const [, startTransition] = useTransition();
	const containerRef = useRef<HTMLDivElement>(null);
	const calendarInstance = useRef<any>(null);
	const propsRef = useRef(props);
	useEffect(() => { propsRef.current = props; }, [props]);

	// React 19: Optimistic UI
	const [optimisticAppointments, addOptimisticAppointment] = useOptimistic(
		appointments,
		(state, { id, start, end }: { id: string, start: string, end: string }) => {
			return state.map(app => 
				app.id === id 
					? { ...app, start_time: start.replace('T', ' '), end_time: end.replace('T', ' ') }
					: app
			);
		}
	);

	// Montagem Vanilla do Calendário
	useLayoutEffect(() => {
		if (!containerRef.current || typeof window === "undefined") return;

		// Limpar instância anterior se existir
		if (calendarInstance.current) {
			try { calendarInstance.current.destroy(); } catch (e) {}
		}

		const controls = createCalendarControlsPlugin();
		const dnd = createDragAndDropPlugin();
		const time = createCurrentTimePlugin();

		const calendar = createCalendar({
			views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
			defaultView: VIEW_MAP[viewType] || "week",
			selectedDate: isValid(currentDate) ? format(currentDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
			events: [], // Inicialmente vazio
			locale: "pt-BR",
			firstDayOfWeek: 1, 
			dayBoundaries: { start: "07:00", end: "21:00" },
			weekOptions: { gridHeight: 560 },
			plugins: [controls, dnd, time],
			callbacks: {
				onEventClick: (event: any) => propsRef.current.onEventClick?.(event),
				onClickDateTime: (dateTime: any) => propsRef.current.onTimeSlotClick?.(String(dateTime)),
				onEventUpdate: (event: any) => {
					if (propsRef.current.onAppointmentReschedule) {
						const start = String(event.start).replace('T', ' ').substring(0, 16);
						const end = String(event.end).replace('T', ' ').substring(0, 16);
						startTransition(() => {
							addOptimisticAppointment({ id: event.id, start, end });
						});
						propsRef.current.onAppointmentReschedule(event.id, start, end);
						toast.success("Horário atualizado com sucesso!");
					}
				}
			}
		});

		calendar.render(containerRef.current);
		calendarInstance.current = calendar;

		return () => {
			if (calendarInstance.current) {
				try { calendarInstance.current.destroy(); } catch (e) {}
			}
		};
	}, [viewType]); // Recriar apenas se a view mudar

	// Sincronizar Dados e Data
	useEffect(() => {
		const calendar = calendarInstance.current;
		if (!calendar) return;

		// 1. Sincronizar Data
		try {
			const targetDate = format(currentDate, "yyyy-MM-dd");
			if (calendar.plugins.calendarControls) {
				calendar.plugins.calendarControls.setViewDate(targetDate);
			}
		} catch (e) {}

		// 2. Sincronizar Eventos
		const sxEvents = optimisticAppointments
			.filter(a => !!a)
			.map(a => {
				let start: string;
				let end: string;
				if (a.start_time && a.end_time) {
					start = String(a.start_time).replace('T', ' ').substring(0, 16);
					end = String(a.end_time).replace('T', ' ').substring(0, 16);
				} else {
					const d = a.date instanceof Date ? a.date : new Date(a.date);
					const dateStr = format(isValid(d) ? d : new Date(), "yyyy-MM-dd");
					const timeStr = String(a.time || "00:00").padStart(5, '0').slice(0, 5);
					start = `${dateStr} ${timeStr}`;
					const durationMin = a.duration || 60;
					const endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(),
						parseInt(timeStr.split(":")[0], 10),
						parseInt(timeStr.split(":")[1], 10) + durationMin);
					end = format(endDate, "yyyy-MM-dd HH:mm");
				}
				return { id: String(a.id), title: a.patient_name || a.patientName || "Consulta", start, end };
			});

		try {
			if (calendar.eventsService) calendar.eventsService.set(sxEvents);
			else if (calendar.events) calendar.events.set(sxEvents);
		} catch (e) {
			console.warn("[ScheduleX] Erro de sincronização vanilla:", e);
		}
	}, [currentDate, optimisticAppointments]);

	return (
		<div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 overflow-hidden">
			<ScheduleToolbar 
				currentDate={currentDate}
				viewType={viewType}
				onViewChange={onViewTypeChange as any}
				onDateChange={onDateChange || (() => {})}
				isSelectionMode={props.isSelectionMode || false}
				onToggleSelection={props.onToggleSelectionMode || (() => {})}
				onCreateAppointment={props.onCreateAppointment || (() => {})}
				filters={props.filters || { status: [], types: [], therapists: [] }}
				onFiltersChange={props.onFiltersChange || (() => {})}
				onClearFilters={props.onClearFilters || (() => {})}
			/>

			<div className="flex-1 p-4 min-h-0 overflow-hidden">
				<div className="flex-1 h-full min-h-0 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden relative">
					<div ref={containerRef} className="h-full w-full sx-vanilla-mount" />
				</div>
			</div>
		</div>
	);
}
