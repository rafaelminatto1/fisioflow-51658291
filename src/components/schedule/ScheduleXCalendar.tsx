/**
 * ScheduleXCalendar — Wrapper para @schedule-x/react v3.7.3
 * Versão de Produção Restaurada - Estável e Completa
 */

import { useState, useMemo, useEffect, useOptimistic, useTransition, useRef, useLayoutEffect } from "react";
import { createCalendar, createViewDay, createViewMonthGrid, createViewWeek } from "@schedule-x/calendar";
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
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

/**
 * Componente de Evento Customizado
 */
const CustomEventCard = ({ calendarEvent, props }: { calendarEvent: any, props: any }) => {
	const appointment = calendarEvent;
	
	let startTime: Date;
	try {
		const startValue = appointment.start;
		const dateStr = String(startValue || "").replace(' ', 'T').split('[')[0];
		const parsed = parseISO(dateStr);
		startTime = isValid(parsed) ? parsed : new Date();
	} catch (e) {
		startTime = new Date();
	}
	
	const formattedTime = format(startTime, "HH:mm");
	
	const statusColors: Record<string, string> = {
		confirmed: "bg-status-confirmed",
		scheduled: "bg-status-confirmed",
		pending: "bg-status-pending",
		cancelled: "bg-status-cancelled",
		completed: "bg-status-completed"
	};

	return (
		<div 
			className={cn(
				"w-full h-full p-0.5 overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-blue-500/30 rounded-md bg-white",
				appointment.status === 'cancelled' && "opacity-50 grayscale"
			)}
		>
			<div className={cn(
				"flex flex-col h-full border-l-[3px] rounded-r-md p-1.5 shadow-sm overflow-hidden text-slate-900",
				(appointment.status === 'confirmed' || appointment.status === 'scheduled') && "border-status-confirmed",
				appointment.status === 'pending' && "border-status-pending",
				appointment.status === 'cancelled' && "border-status-cancelled",
				appointment.status === 'completed' && "border-status-completed",
				(!appointment.status || !statusColors[appointment.status]) && "border-slate-300"
			)}>
				<div className="flex items-center justify-between gap-1 mb-0.5">
					<span className="font-black text-[8px] uppercase tracking-widest text-slate-400">
						{formattedTime}
					</span>
					<div className={`h-1 w-1 rounded-full ${statusColors[appointment.status] || 'bg-slate-300'}`} />
				</div>
				<div className="font-black leading-tight line-clamp-1 text-[10px] uppercase tracking-tight text-slate-800">
					{appointment.title}
				</div>
			</div>
		</div>
	);
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

	// Mapeamento de Eventos Estável
	const sxEvents = useMemo(() => {
		return optimisticAppointments
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
				return { id: String(a.id), title: a.patient_name || a.patientName || "Consulta", start, end, status: a.status };
			});
	}, [optimisticAppointments]);

	// Montagem Vanilla do Calendário
	useLayoutEffect(() => {
		if (!containerRef.current || typeof window === "undefined") return;

		try {
			if (calendarInstance.current) calendarInstance.current.destroy();
		} catch (e) {}

		try {
			const calendar = createCalendar({
				views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
				defaultView: VIEW_MAP[viewType] || "week",
				locale: "pt-BR",
				selectedDate: format(isValid(currentDate) ? currentDate : new Date(), "yyyy-MM-dd"),
				events: sxEvents,
				dayBoundaries: { start: "07:00", end: "21:00" },
				plugins: [
					createCalendarControlsPlugin(),
					createDragAndDropPlugin()
				],
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
		} catch (err) {
			console.error("[ScheduleX] Erro no render:", err);
		}

		return () => {
			if (calendarInstance.current) {
				try { calendarInstance.current.destroy(); } catch (e) {}
			}
		};
	}, [viewType, sxEvents.length]); // Recriar se mudar view ou quantidade de eventos

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
