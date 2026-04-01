/**
 * ScheduleXCalendar — Wrapper correto para @schedule-x/react
 * Versão 2.5.0 - Com Progressive Disclosure (Mini-Card Popover)
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
import { ptBR } from "date-fns/locale";
import { Temporal } from "temporal-polyfill";
import { toast } from "sonner";

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
	MoreHorizontal
} from "lucide-react";

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

/**
 * Componente de Evento Customizado com Popover (Mini-Card)
 */
const CustomEventCard = ({ calendarEvent, props }: { calendarEvent: any, props: any }) => {
	const appointment = calendarEvent;
	const startTime = parseISO(appointment.start);
	const formattedTime = format(startTime, "HH:mm");
	
	// Cores baseadas no status
	const statusColors: Record<string, string> = {
		confirmed: "bg-emerald-500",
		pending: "bg-amber-500",
		cancelled: "bg-red-500",
		completed: "bg-blue-500"
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<div 
					className={`w-full h-full p-1 text-xs overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${appointment.status === 'cancelled' ? 'opacity-60 grayscale' : ''}`}
					onClick={(e) => e.stopPropagation()}
				>
					<div className="flex flex-col h-full bg-background/40 backdrop-blur-md border border-white/20 rounded-md p-1 shadow-sm overflow-hidden">
						<div className="flex items-center gap-1 mb-0.5">
							<div className={`w-1.5 h-1.5 rounded-full ${statusColors[appointment.status] || 'bg-slate-400'}`} />
							<span className="font-bold truncate">{formattedTime}</span>
						</div>
						<div className="font-medium leading-tight line-clamp-2">
							{appointment.title}
						</div>
					</div>
				</div>
			</PopoverTrigger>
			
			<PopoverContent className="w-80 p-0 overflow-hidden glass-panel border-none shadow-2xl z-[100]" align="start">
				<div className="p-4 space-y-4">
					{/* Header do Mini-Card */}
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

					{/* Detalhes do Horário e Status */}
					<div className="grid grid-cols-2 gap-3 text-sm">
						<div className="flex items-center gap-2 text-muted-foreground">
							<Clock className="h-4 w-4 text-primary" />
							<span>{formattedTime} - {format(parseISO(appointment.end), "HH:mm")}</span>
						</div>
						<div className="flex items-center gap-2 text-muted-foreground">
							<CreditCard className="h-4 w-4 text-emerald-500" />
							<span className="text-emerald-600 font-medium">Pago</span>
						</div>
					</div>

					{/* Resumo Rápido */}
					<div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
						<div className="flex items-center gap-2 mb-1">
							<User className="h-3.5 w-3.5 text-primary" />
							<span className="text-[11px] font-semibold uppercase tracking-wider text-primary/70">Última Evolução</span>
						</div>
						<p className="text-xs italic text-muted-foreground line-clamp-2">
							"Paciente apresenta melhora na amplitude de movimento do ombro direito após exercícios de mobilidade..."
						</p>
					</div>

					{/* Ações Rápidas */}
					<div className="flex gap-2 pt-2">
						<Button className="flex-1 gap-2 h-9 text-xs shadow-md" size="sm">
							<Play className="h-3.5 w-3.5" />
							Iniciar Atendimento
						</Button>
						<Button variant="outline" className="flex-1 gap-2 h-9 text-xs glass-card" size="sm" onClick={() => props.onEditAppointment?.(appointment.id)}>
							<ExternalLink className="h-3.5 w-3.5" />
							Ver Prontuário
						</Button>
					</div>
				</div>
				
				{/* Footer/StatusBar */}
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
	} = props;

	// ── A) Aguardar Temporal estar pronto ──
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

	// ── C) Configuração Memoizada do Calendário ──
	const calendarConfig = useMemo(() => {
		if (!isTemporalReady) return null;

		return {
			views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
			defaultView: VIEW_MAP[viewType],
			events: [], 
			locale: "pt-BR",
			firstDayOfWeek: 1, 
			dayBoundaries: { start: "07:00", end: "21:00" },
			weekOptions: { gridHeight: 560 },
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
						if (typeof navigator !== "undefined" && navigator.vibrate) {
							navigator.vibrate([15, 50, 15]); 
						}
						toast.success("Horário atualizado com sucesso!");
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
				const sxEvents = appointments
					.filter(a => {
						if (!a || !a.start_time || !a.end_time) return false;
						const s = String(a.start_time).trim();
						const e = String(a.end_time).trim();
						if (!s || !e || s === "undefined" || e === "undefined" || s === "null" || e === "null") return false;
						return isValid(parseISO(s)) && isValid(parseISO(e));
					})
					.map(a => {
						const startISO = String(a.start_time).replace(' ', 'T').substring(0, 16);
						const endISO = String(a.end_time).replace(' ', 'T').substring(0, 16);
						return {
							id: String(a.id),
							title: a.patient_name || "Consulta",
							start: startISO,
							end: endISO,
							status: a.status,
							type: a.type,
							therapist_id: a.therapist_id,
							patient_avatar: a.patient_avatar
						};
					});
				calendarApp.events.set(sxEvents);
			} catch (err) {
				console.error("[ScheduleX] Critical sync error:", err);
			}
		}
	}, [appointments, calendarApp, isTemporalReady]);

	// ── E) Sincronização Imperativa de Data ──
	useEffect(() => {
		if (!calendarApp || !isTemporalReady || !calendarControls) return;
		try {
			const targetDate = format(currentDate, "yyyy-MM-dd");
			if (calendarControls.setViewDate) {
				calendarControls.setViewDate(targetDate);
			}
		} catch (e) {}
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
						timeGridEvent: (eventProps) => <CustomEventCard {...eventProps} props={props} />,
						dateGridEvent: (eventProps) => <CustomEventCard {...eventProps} props={props} />,
						monthGridEvent: (eventProps) => <CustomEventCard {...eventProps} props={props} />,
					}}
				/>
			</div>
		</div>
	);
}
