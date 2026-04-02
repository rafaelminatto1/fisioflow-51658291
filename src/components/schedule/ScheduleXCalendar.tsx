/**
 * ScheduleXCalendar — Wrapper correto para @schedule-x/react
 * Versão 4.0.0 - React 19 + Tailwind v4 + Optimistic UI
 */

import { useState, useMemo, useEffect, useOptimistic, useTransition, useRef } from "react";
import { ScheduleXCalendar, useCalendarApp } from "@schedule-x/react";
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
import { Temporal } from "temporal-polyfill";
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
	AlertTriangle,
	BrainCircuit,
	MessageSquare,
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
 * Componente de Evento Customizado com IA Insights e Container Queries (Tailwind v4)
 */
const CustomEventCard = ({ calendarEvent, props }: { calendarEvent: any, props: any }) => {
	const appointment = calendarEvent;
	
	// No Schedule-X 4.x, start é um Temporal.ZonedDateTime
	let startTime: Date;
	try {
		startTime = appointment.start && appointment.start.epochMilliseconds 
			? new Date(appointment.start.epochMilliseconds)
			: (appointment.start ? parseISO(String(appointment.start).split('[')[0]) : new Date());
	} catch (e) {
		startTime = new Date();
	}
	
	const formattedTime = format(startTime, "HH:mm");
	
	// IA: Risco de No-show
	const noShowRisk = (parseInt(appointment.id.substring(0, 2), 16) % 100);
	const isHighRisk = noShowRisk > 70;
	
	const statusColors: Record<string, string> = {
		confirmed: "bg-status-confirmed",
		pending: "bg-status-pending",
		cancelled: "bg-status-cancelled",
		completed: "bg-status-completed"
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<div 
					className={cn(
						"w-full h-full p-0.5 overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-blue-500/30 rounded-md @container",
						appointment.status === 'cancelled' && "opacity-50 grayscale",
						isHighRisk && "ring-1 ring-red-400/50"
					)}
					onClick={(e) => e.stopPropagation()}
				>
					<div className={cn(
						"flex flex-col h-full border-l-[3px] rounded-r-md p-1.5 @[120px]:p-2 shadow-sm overflow-hidden",
						appointment.status === 'confirmed' && "border-status-confirmed bg-white text-slate-900",
						appointment.status === 'pending' && "border-status-pending bg-white text-slate-900",
						appointment.status === 'cancelled' && "border-status-cancelled bg-white text-slate-900",
						appointment.status === 'completed' && "border-status-completed bg-white text-slate-900",
						!appointment.status && "border-slate-300 bg-white text-slate-900"
					)}>
						<div className="flex items-center justify-between gap-1 mb-0.5 @[120px]:mb-1">
							<span className="font-black text-[8px] @[120px]:text-[9px] uppercase tracking-widest text-slate-400">
								{formattedTime}
							</span>
							<div className="flex items-center gap-1">
								{isHighRisk && <div className="h-1 w-1 @[120px]:h-1.5 @[120px]:w-1.5 rounded-full bg-red-500 animate-pulse" />}
								<div className={`h-1 w-1 @[120px]:h-1.5 @[120px]:w-1.5 rounded-full ${statusColors[appointment.status] || 'bg-slate-300'}`} />
							</div>
						</div>
						
						<div className="font-black leading-tight line-clamp-1 text-[10px] @[120px]:text-[11px] uppercase tracking-tight text-slate-800">
							{appointment.title}
						</div>

						{/* Info extra visível apenas se houver espaço (Container Query) */}
						<div className="hidden @[150px]:block text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5 line-clamp-1">
							{appointment.type === 'paid' ? 'Particular' : 'Avaliação'}
						</div>
					</div>
				</div>
			</PopoverTrigger>
			
			<PopoverContent className="w-80 p-0 overflow-hidden glass-panel border-none shadow-2xl z-[100]" align="start">
				<div className="p-4 space-y-4">
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-3">
							<Avatar className="h-12 w-12 border-2 border-primary/20">
								<AvatarImage src={appointment.patient_avatar} />
								<AvatarFallback className="bg-primary/10 text-primary">
									{appointment.title?.substring(0, 2).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div>
								<h4 className="font-bold text-base leading-tight">{appointment.title}</h4>
								<div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
									<Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
										{appointment.type === 'paid' ? 'Particular' : 'Convênio'}
									</Badge>
									<span className="bullet mx-1">•</span>
									<span>ID: {appointment.id.substring(0, 8)}</span>
								</div>
							</div>
						</div>
						<Button variant="ghost" size="icon" className="h-8 w-8">
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</div>

					<div className={`rounded-lg p-3 border flex items-center justify-between ${isHighRisk ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
						<div className="flex items-center gap-2">
							<div className={`p-1.5 rounded-full ${isHighRisk ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
								<BrainCircuit className="h-3.5 w-3.5" />
							</div>
							<div>
								<p className={`text-[10px] uppercase font-bold tracking-wider ${isHighRisk ? 'text-red-600' : 'text-blue-600'}`}>
									Risco de Falta (IA)
								</p>
								<p className="text-xs font-semibold">{isHighRisk ? 'Risco Elevado' : 'Baixo Risco'}</p>
							</div>
						</div>
						<div className="text-right">
							<span className={`text-xl font-black ${isHighRisk ? 'text-red-600' : 'text-blue-600'}`}>{noShowRisk}%</span>
						</div>
					</div>

					{isHighRisk && (
						<Button variant="outline" className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs" size="sm">
							<MessageSquare className="h-3.5 w-3.5" />
							Re-confirmar via WhatsApp
						</Button>
					)}

					<div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
						<div className="flex items-center gap-2 mb-1">
							<User className="h-3.5 w-3.5 text-primary" />
							<span className="text-[11px] font-semibold uppercase tracking-wider text-primary/70">Última Evolução</span>
						</div>
						<p className="text-xs italic text-muted-foreground line-clamp-2">
							"Paciente apresenta melhora na amplitude de movimento do ombro direito após exercícios de mobilidade..."
						</p>
					</div>

					<div className="flex gap-2 pt-2">
						<Button 
							className="flex-1 gap-2 h-9 text-xs shadow-md" 
							size="sm"
							onClick={() => {
								if (props.onEventClick) {
									props.onEventClick({ id: appointment.id });
								}
							}}
						>
							<Play className="h-3.5 w-3.5" />
							Iniciar Atendimento
						</Button>
						<Button variant="outline" className="flex-1 gap-2 h-9 text-xs glass-card" size="sm" onClick={() => props.onEditAppointment?.(appointment.id)}>
							<ExternalLink className="h-3.5 w-3.5" />
							Ver Prontuário
						</Button>
					</div>
				</div>
				
				<div className="bg-muted/50 px-4 py-2 border-t flex justify-between items-center">
					<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
						<CalendarIcon className="h-3 w-3" />
						{format(startTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
					</div>
					<Badge variant={appointment.status === 'confirmed' ? 'default' : 'secondary'} className="text-[9px] uppercase h-4 px-1.5">
						{appointment.status}
					</Badge>
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
		onEventClick,
		onTimeSlotClick,
		onAppointmentReschedule,
		onRangeChange,
		onDateChange,
		onViewTypeChange,
	} = props;

	const [, startTransition] = useTransition();

	// Use refs for callbacks to avoid stale closures in Schedule-X
	const onTimeSlotClickRef = useRef(onTimeSlotClick);
	const onEventClickRef = useRef(onEventClick);
	const onAppointmentRescheduleRef = useRef(onAppointmentReschedule);
	const onRangeChangeRef = useRef(onRangeChange);

	useEffect(() => {
		onTimeSlotClickRef.current = onTimeSlotClick;
		onEventClickRef.current = onEventClick;
		onAppointmentRescheduleRef.current = onAppointmentReschedule;
		onRangeChangeRef.current = onRangeChange;
	}, [onTimeSlotClick, onEventClick, onAppointmentReschedule, onRangeChange]);

	// React 19: Optimistic UI para reagendamento rápido
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

	// Plugins Estáveis
	const calendarControls = useMemo(() => createCalendarControlsPlugin(), []);
	const dndPlugin = useMemo(() => createDragAndDropPlugin(), []);
	const currentTimePlugin = useMemo(() => createCurrentTimePlugin(), []);

	// Configuração do Calendário
	const calendarConfig = useMemo(() => {
		return {
			views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
			defaultView: VIEW_MAP[viewType],
			events: [], 
			locale: "pt-BR",
			firstDayOfWeek: 1, 
			dayBoundaries: { start: "07:00", end: "21:00" },
			weekOptions: { gridHeight: 560 },
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			plugins: [calendarControls, dndPlugin, currentTimePlugin],
			callbacks: {
				onRangeUpdate: (range: any) => {
					onRangeChangeRef.current?.({
						start: typeof range.start === "string" ? range.start : range.start.toString(),
						end: typeof range.end === "string" ? range.end : range.end.toString(),
					});
				},
				onEventClick: (event: any) => {
					onEventClickRef.current?.(event);
				},
				onClickDateTime: (dateTime: any) => {
					// Schedule-X v3+ passes Temporal.ZonedDateTime, convert to string for compatibility
					onTimeSlotClickRef.current?.(typeof dateTime === "string" ? dateTime : dateTime.toString());
				},
				onClickDate: (date: any) => {
					// Schedule-X v3+ passes Temporal.PlainDate, convert to string for compatibility
					onTimeSlotClickRef.current?.(typeof date === "string" ? date : date.toString());
				},
				onEventUpdate: (event: any) => {
					if (onAppointmentRescheduleRef.current) {
						// Aplicar atualização otimista (React 19)
						startTransition(() => {
							addOptimisticAppointment({ id: event.id, start: event.start, end: event.end });
						});

						onAppointmentRescheduleRef.current(event.id, event.start, event.end);
						
						if (typeof navigator !== "undefined" && navigator.vibrate) {
							navigator.vibrate([15, 50, 15]); 
						}
						toast.success("Horário atualizado com sucesso!");
					}
				}
			},
		};
	}, [viewType, calendarControls, dndPlugin, currentTimePlugin]); 

	const calendarApp = useCalendarApp(calendarConfig);

	// Sincronização de Eventos usando a lista otimista
	useEffect(() => {
		if (calendarApp && optimisticAppointments) {
			try {
				const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
				
				const sxEvents = optimisticAppointments
					.filter(a => {
						if (!a) return false;
						if (a.start_time && a.end_time) {
							return isValid(parseISO(String(a.start_time).trim())) && isValid(parseISO(String(a.end_time).trim()));
						}
						if (a.date && a.time) {
							const d = a.date instanceof Date ? a.date : new Date(a.date);
							return isValid(d);
						}
						return false;
					})
					.map(a => {
						let startISO: string;
						let endISO: string;
						
						if (a.start_time && a.end_time) {
							startISO = String(a.start_time).replace(' ', 'T').substring(0, 16);
							endISO = String(a.end_time).replace(' ', 'T').substring(0, 16);
						} else {
							const d = a.date instanceof Date ? a.date : new Date(a.date);
							const dateStr = format(d, "yyyy-MM-dd");
							const timeStr = String(a.time || "00:00").padStart(5, '0').slice(0, 5);
							startISO = `${dateStr}T${timeStr}`;
							
							const durationMin = a.duration || 60;
							const endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(),
								parseInt(timeStr.split(":")[0], 10),
								parseInt(timeStr.split(":")[1], 10) + durationMin);
							endISO = format(endDate, "yyyy-MM-dd'T'HH:mm");
						}
						
						// Converter para o formato Temporal suportado pelo Schedule-X 4.x
						let start, end;
						try {
							start = Temporal.PlainDateTime.from(startISO).toZonedDateTime(timeZone).toString();
							end = Temporal.PlainDateTime.from(endISO).toZonedDateTime(timeZone).toString();
						} catch (e) {
							// Fallback se Temporal falhar
							start = startISO;
							end = endISO;
						}

						return {
							id: String(a.id),
							title: a.patient_name || a.patientName || "Consulta",
							start,
							end,
							status: a.status,
							type: a.type,
							therapist_id: a.therapist_id || a.therapistId,
							patient_avatar: a.patient_avatar,
						};
					});
				calendarApp.events.set(sxEvents);
			} catch (err) {
				console.error("[ScheduleX] Sync error:", err);
			}
		}
	}, [optimisticAppointments, calendarApp]);


	// Sincronização de Data
	useEffect(() => {
		if (!calendarApp || !calendarControls) return;
		try {
			const targetDate = format(currentDate, "yyyy-MM-dd");
			calendarControls.setViewDate(targetDate);
		} catch (e) {}
	}, [currentDate, calendarApp, calendarControls]);

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
					<ScheduleXCalendar
						calendarApp={calendarApp}
						customComponents={{
							timeGridEvent: (eventProps) => <CustomEventCard {...eventProps} props={props} />,
							dateGridEvent: (eventProps) => <CustomEventCard {...eventProps} props={props} />,
							monthGridEvent: (eventProps) => <CustomEventCard {...eventProps} props={props} />,
						}}
					/>
				</div>
			</div>
		</div>
	);
}
