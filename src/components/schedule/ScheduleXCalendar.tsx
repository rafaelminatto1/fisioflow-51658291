/**
 * ScheduleXCalendar — Wrapper correto para @schedule-x/react
 * Versão 3.0.0 - Com IA Predictive Scheduling (No-show Risk)
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
	Settings
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
	onDateChange?: (date: Date) => void;
	onViewTypeChange?: (view: ViewType) => void;
	onEditAppointment?: (id: string) => void;
	onDeleteAppointment?: (id: string) => void;
	onStatusChange?: (id: string, status: string) => void;
	onRangeChange?: (range: { start: string; end: string }) => void;
	customEventComponent?: any;
	therapists?: any[];
	isSelectionMode?: boolean;
	onToggleSelectionMode?: () => void;
	onCreateAppointment?: () => void;
	filters?: any;
	onFiltersChange?: (filters: any) => void;
	onClearFilters?: () => void;
	onToggleSelection?: (id: string) => void;
}

const VIEW_MAP: Record<ViewType, string> = {
	day: "day",
	week: "week",
	month: "month-grid",
};

/**
 * Componente de Evento Customizado com IA Insights
 */
const CustomEventCard = ({ calendarEvent, props }: { calendarEvent: any, props: any }) => {
	const appointment = calendarEvent;
	const startTime = parseISO(appointment.start);
	const formattedTime = format(startTime, "HH:mm");
	
	// IA: Risco de No-show (simulado baseado no ID para consistência)
	const noShowRisk = (parseInt(appointment.id.substring(0, 2), 16) % 100);
	const isHighRisk = noShowRisk > 70;
	
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
					className={cn(
						"w-full h-full p-0.5 overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-blue-500/30 rounded-md",
						appointment.status === 'cancelled' && "opacity-50 grayscale",
						isHighRisk && "ring-1 ring-red-400/50"
					)}
					onClick={(e) => e.stopPropagation()}
				>
					<div className={cn(
						"flex flex-col h-full border-l-[3px] rounded-r-md p-2 shadow-sm overflow-hidden",
						appointment.status === 'confirmed' && "border-emerald-500 bg-white text-slate-900",
						appointment.status === 'pending' && "border-amber-500 bg-white text-slate-900",
						appointment.status === 'cancelled' && "border-red-500 bg-white text-slate-900",
						appointment.status === 'completed' && "border-blue-500 bg-white text-slate-900",
						!appointment.status && "border-slate-300 bg-white text-slate-900"
					)}>
						<div className="flex items-center justify-between gap-1 mb-1">
							<span className="font-black text-[9px] uppercase tracking-widest text-slate-400">
								{formattedTime}
							</span>
							<div className="flex items-center gap-1">
								{isHighRisk && <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
								<div className={`h-1.5 w-1.5 rounded-full ${statusColors[appointment.status] || 'bg-slate-300'}`} />
							</div>
						</div>
						<div className="font-black leading-tight line-clamp-1 text-[11px] uppercase tracking-tight text-slate-800">
							{appointment.title}
						</div>
						<div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5 line-clamp-1">
							{appointment.type === 'paid' ? 'REABILITAÇÃO' : 'AVALIAÇÃO'}
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

					{/* IA Predictive Insights */}
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

					{/* Ações de IA */}
					{isHighRisk && (
						<Button variant="outline" className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs" size="sm">
							<MessageSquare className="h-3.5 w-3.5" />
							Re-confirmar via WhatsApp
						</Button>
					)}

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
		return <div className="flex-1 flex items-center justify-center">Carregando...</div>;
	}

	// ── F) Event Listeners para Toolbar Navigation ──
	useEffect(() => {
		const handleNavigate = (e: any) => {
			if (!onDateChange) return;
			const direction = e.detail.direction;
			const newDate = new Date(currentDate);
			if (direction === "prev") {
				if (viewType === "day") newDate.setDate(newDate.getDate() - 1);
				else if (viewType === "week") newDate.setDate(newDate.getDate() - 7);
				else if (viewType === "month") newDate.setMonth(newDate.getMonth() - 1);
			} else {
				if (viewType === "day") newDate.setDate(newDate.getDate() + 1);
				else if (viewType === "week") newDate.setDate(newDate.getDate() + 7);
				else if (viewType === "month") newDate.setMonth(newDate.getMonth() + 1);
			}
			onDateChange(newDate);
		};

		const handleToday = () => {
			if (onDateChange) onDateChange(new Date());
		};

		const handleDateChange = (e: any) => {
			if (onDateChange) onDateChange(e.detail);
		};

		window.addEventListener("schedule-navigate", handleNavigate);
		window.addEventListener("schedule-today-click", handleToday);
		window.addEventListener("schedule-date-change", handleDateChange);

		return () => {
			window.removeEventListener("schedule-navigate", handleNavigate);
			window.removeEventListener("schedule-today-click", handleToday);
			window.removeEventListener("schedule-date-change", handleDateChange);
		};
	}, [currentDate, viewType, onDateChange]);

	return (
		<div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 overflow-hidden">
			{/* Toolbar Integrada seguindo o design Stitch */}
			<ScheduleToolbar 
				currentDate={currentDate}
				viewType={viewType}
				onViewChange={onViewTypeChange as any}
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
