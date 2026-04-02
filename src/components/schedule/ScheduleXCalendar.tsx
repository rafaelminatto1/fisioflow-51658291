/**
 * ScheduleXCalendar — Wrapper para @schedule-x/react v3.7.3
 * Versão de Próxima Geração - useNextCalendarApp (v4 Ready)
 */

import { useState, useMemo, useEffect, useOptimistic, useTransition, useRef } from "react";
import { ScheduleXCalendar, useNextCalendarApp } from "@schedule-x/react";
import {
	createViewDay,
	createViewMonthGrid,
	createViewWeek,
} from "@schedule-x/calendar";
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

/**
 * Componente de Evento Customizado (Resiliente)
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
		<Popover>
			<PopoverTrigger asChild>
				<div 
					className={cn(
						"w-full h-full p-0.5 overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-blue-500/30 rounded-md bg-white",
						appointment.status === 'cancelled' && "opacity-50 grayscale"
					)}
					onClick={(e) => e.stopPropagation()}
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
			</PopoverTrigger>
			
			<PopoverContent className="w-80 p-0 glass-panel z-[100]" align="start">
				<div className="p-4 space-y-4">
					<div className="flex items-center gap-3">
						<Avatar className="h-10 w-10">
							<AvatarFallback className="bg-primary/10 text-primary">
								{appointment.title?.substring(0, 2).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div>
							<h4 className="font-bold text-sm">{appointment.title}</h4>
							<p className="text-[10px] text-muted-foreground uppercase">{appointment.type || 'Sessão'}</p>
						</div>
					</div>
					<div className="flex gap-2">
						<Button className="flex-1 h-8 text-[10px]" size="sm" onClick={() => props.onEventClick?.({ id: appointment.id })}>
							INICIAR ATENDIMENTO
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
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

	// Configuração do Calendário (Estabilidade Máxima via useNextCalendarApp)
	const calendarApp = useNextCalendarApp({
		views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
		defaultView: VIEW_MAP[viewType] || "week",
		selectedDate: format(isValid(currentDate) ? currentDate : new Date(), "yyyy-MM-dd"),
		locale: "pt-BR",
		firstDayOfWeek: 1, 
		dayBoundaries: { start: "07:00", end: "21:00" },
		weekOptions: { gridHeight: 560 },
		events: sxEvents,
		plugins: [
			createCalendarControlsPlugin(),
			createDragAndDropPlugin(),
			createCurrentTimePlugin()
		],
		callbacks: {
			onEventClick: (event: any) => propsRef.current.onEventClick?.(event),
			onClickDateTime: (dateTime: string) => propsRef.current.onTimeSlotClick?.(dateTime),
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

	// Sincronizar Data (Independente do init)
	useEffect(() => {
		if (calendarApp) {
			try {
				const targetDate = format(isValid(currentDate) ? currentDate : new Date(), "yyyy-MM-dd");
				calendarApp.calendarControls.setViewDate(targetDate);
			} catch (e) {}
		}
	}, [currentDate, calendarApp]);

	const customComponents = useMemo(() => ({
		timeGridEvent: (eventProps: any) => <CustomEventCard {...eventProps} props={propsRef.current} />,
		dateGridEvent: (eventProps: any) => <CustomEventCard {...eventProps} props={propsRef.current} />,
		monthGridEvent: (eventProps: any) => <CustomEventCard {...eventProps} props={propsRef.current} />,
	}), []);

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
				<div className="flex-1 h-full min-h-0 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
					{calendarApp && (
						<ScheduleXCalendar
							calendarApp={calendarApp}
							customComponents={customComponents}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
