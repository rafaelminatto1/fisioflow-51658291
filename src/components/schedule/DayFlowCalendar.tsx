/**
 * DayFlowCalendar — Wrapper for @event-calendar/core (vkurko/calendar)
 * A lightweight, highly performant Vanilla JS calendar engine for Vite/Rolldown.
 */

import {
	useEffect,
	useLayoutEffect,
	useMemo,
	useOptimistic,
	useRef,
	useTransition,
} from "react";
import Calendar from "@event-calendar/core";
import TimeGrid from "@event-calendar/time-grid";
import DayGrid from "@event-calendar/day-grid";
import Interaction from "@event-calendar/interaction";
import "@event-calendar/core/index.css";
import { format, isValid, addMinutes } from "date-fns";
import { ExternalLink, Play } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ScheduleToolbar } from "./ScheduleToolbar";

type ViewType = "day" | "week" | "month";

const VIEW_MAP: Record<ViewType, string> = {
	day: "timeGridDay",
	week: "timeGridWeek",
	month: "dayGridMonth",
};

interface CustomEventCardProps {
	calendarEvent: any;
	props: any;
}

const statusColors: Record<string, string> = {
	scheduled: "bg-blue-500",
	confirmed: "bg-emerald-500",
	pending: "bg-amber-500",
	cancelled: "bg-rose-500",
	completed: "bg-slate-700",
	arrived: "bg-indigo-500",
};

const CustomEventCard = ({ calendarEvent, props }: CustomEventCardProps) => {
	// event-calendar injects event data via info.event
	const appointment = calendarEvent.extendedProps;
	const formattedTime = format(calendarEvent.start, "HH:mm");

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					className={cn(
						"w-full h-full p-0.5 overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-blue-500/30 rounded-md bg-white text-left",
						appointment.status === "cancelled" && "opacity-50 grayscale",
					)}
					onClick={(e) => {
						e.stopPropagation();
					}}
				>
					<div
						className={cn(
							"flex flex-col h-full border-l-[3px] rounded-r-md p-1.5 shadow-sm overflow-hidden text-slate-900 bg-white",
							(appointment.status === "confirmed" ||
								appointment.status === "scheduled") &&
								"border-emerald-500",
							appointment.status === "pending" && "border-amber-500",
							appointment.status === "cancelled" && "border-rose-500",
							appointment.status === "completed" && "border-slate-700",
							(!appointment.status || !statusColors[appointment.status]) &&
								"border-slate-300",
						)}
					>
						<div className="flex items-center justify-between gap-1 mb-0.5">
							<span className="font-black text-[8px] uppercase tracking-widest text-slate-400">
								{formattedTime}
							</span>
							<div
								className={`h-1 w-1 rounded-full ${statusColors[appointment.status] || "bg-slate-300"}`}
							/>
						</div>
						<div className="font-black leading-tight line-clamp-1 text-[10px] uppercase tracking-tight text-slate-800">
							{appointment.title}
						</div>
					</div>
				</button>
			</PopoverTrigger>

			<PopoverContent
				className="w-80 p-0 overflow-hidden glass-panel border-none shadow-2xl z-[100]"
				align="start"
			>
				<div className="p-4 space-y-4">
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-3">
							<Avatar className="h-12 w-12 border-2 border-primary/20">
								<AvatarFallback className="bg-primary/10 text-primary">
									{appointment.title?.substring(0, 2).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div>
								<h4 className="font-bold text-base leading-tight">
									{appointment.title}
								</h4>
								<div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
									<Badge
										variant="outline"
										className="text-[10px] px-1 py-0 h-4"
									>
										{appointment.type || "Sessão"}
									</Badge>
									<span className="bullet mx-1">•</span>
									<span>ID: {appointment.id.substring(0, 8)}</span>
								</div>
							</div>
						</div>
					</div>

					<div className="flex gap-2 pt-2">
						<Button
							className="flex-1 gap-2 h-9 text-xs shadow-md"
							size="sm"
							onClick={() => props.onEventClick?.({ id: appointment.id })}
						>
							<Play className="h-3.5 w-3.5" />
							Iniciar Atendimento
						</Button>
						<Button
							variant="outline"
							className="flex-1 gap-2 h-9 text-xs glass-card"
							size="sm"
							onClick={() => props.onEditAppointment?.(appointment.id)}
						>
							<ExternalLink className="h-3.5 w-3.5" />
							Ver Prontuário
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
};

export interface DayFlowCalendarWrapperProps {
	appointments: any[];
	currentDate: Date;
	onDateChange?: (date: Date) => void;
	viewType: "day" | "week" | "month";
	onViewTypeChange?: (view: "day" | "week" | "month") => void;
	onEventClick?: (event: any) => void;
	onTimeSlotClick?: (dateStr: string) => void;
	onAppointmentReschedule?: (id: string, start: string, end: string) => void;
	onEditAppointment?: (id: string) => void;
	onDeleteAppointment?: (id: string) => void;
	onStatusChange?: (id: string, status: string) => void;
	isSelectionMode?: boolean;
	selectedIds?: Set<string>;
	onToggleSelection?: (id: string) => void;
	onCreateAppointment?: () => void;
	onToggleSelectionMode?: () => void;
	filters?: any;
	onFiltersChange?: (filters: any) => void;
	onClearFilters?: () => void;
	totalAppointmentsCount?: number;
	patientFilter?: string;
	onPatientFilterChange?: (patient: string) => void;
	therapists?: any[];
}

export function DayFlowCalendarWrapper(props: DayFlowCalendarWrapperProps) {
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

	useEffect(() => {
		propsRef.current = props;
	}, [props]);

	const [optimisticAppointments, addOptimisticAppointment] = useOptimistic(
		appointments,
		(state, { id, start, end }: { id: string; start: string; end: string }) => {
			return state.map((app) => {
				if (app.id !== id) return app;
				const [datePart, timePart] = start.split("T");
				const [endDatePart, endTimePart] = end.split("T");
				return {
					...app,
					start_time: timePart?.slice(0, 5) || start,
					end_time: endTimePart?.slice(0, 5) || end,
					date: datePart || app.date,
					time: timePart?.slice(0, 5) || app.time,
				};
			});
		},
	);

	const dfEvents = useMemo(() => {
		return optimisticAppointments
			.filter((a) => !!a)
			.flatMap((a) => {
				try {
					let startDate: Date;
					let endDate: Date;

					if (a.start_time && a.end_time) {
						const rawDate =
							a.date instanceof Date
								? format(a.date, "yyyy-MM-dd")
								: String(a.date || "").slice(0, 10);
						const startTime = String(a.start_time).slice(0, 5);
						const endTime = String(a.end_time).slice(0, 5);
						if (rawDate.length < 10 || !startTime.includes(":")) return [];
						startDate = new Date(`${rawDate}T${startTime}:00`);
						endDate = new Date(`${rawDate}T${endTime}:00`);
					} else if (a.date && a.time) {
						const d = a.date instanceof Date ? a.date : new Date(a.date);
						if (!isValid(d)) return [];
						const dateStr = format(d, "yyyy-MM-dd");
						const timeStr = String(a.time || "00:00").slice(0, 5);
						startDate = new Date(`${dateStr}T${timeStr}:00`);
						endDate = addMinutes(startDate, a.duration || 60);
					} else {
						return [];
					}

					if (endDate <= startDate) {
						endDate = addMinutes(startDate, 60);
					}

					return [
						{
							id: String(a.id),
							title: a.patient_name || a.patientName || "Consulta",
							start: startDate,
							end: endDate,
							backgroundColor: 'transparent',
							borderColor: 'transparent',
							extendedProps: {
								id: String(a.id),
								title: a.patient_name || a.patientName || "Consulta",
								status: a.status,
								type: a.type,
								therapist_id: a.therapist_id || a.therapistId,
								patient_avatar: a.patient_avatar,
							}
						},
					];
				} catch {
					return [];
				}
			});
	}, [optimisticAppointments]);

	useLayoutEffect(() => {
		if (!containerRef.current || typeof window === "undefined") return;

		try {
			if (calendarInstance.current) calendarInstance.current.destroy();
		} catch {}

		try {
			// Tailwind-based rendering of the calendar cells
			import("react-dom/client").then(({ createRoot }) => {
				const calendar = new Calendar({
					target: containerRef.current!,
					props: {
						plugins: [TimeGrid, DayGrid, Interaction],
						options: {
							view: VIEW_MAP[viewType] || "timeGridWeek",
							events: dfEvents,
							date: isValid(currentDate) ? currentDate : new Date(),
							slotMinTime: "07:00:00",
							slotMaxTime: "21:00:00",
							editable: true, // Enables free Drag & Drop via Interaction plugin
							selectable: true,
							headerToolbar: false, // We use our own ScheduleToolbar
							locale: 'pt-br',
							firstDay: 1, // Monday
							allDaySlot: false,
							eventContent: (info: any) => {
								// EventCalendar allows returning HTML or manipulating a DOM node.
								// We will create a React root inside the provided container to render our beautiful CustomEventCard.
								const div = document.createElement('div');
								div.className = "w-full h-full";
								const root = createRoot(div);
								root.render(<CustomEventCard calendarEvent={info.event} props={propsRef.current} />);
								return { domNodes: [div] };
							},
							eventClick: (info: any) => {
								propsRef.current.onEventClick?.(info.event.extendedProps);
							},
							dateClick: (info: any) => {
								propsRef.current.onTimeSlotClick?.(format(info.date, "yyyy-MM-dd'T'HH:mm"));
							},
							eventDrop: (info: any) => {
								if (propsRef.current.onAppointmentReschedule) {
									const startStr = format(info.event.start, "yyyy-MM-dd'T'HH:mm");
									const endStr = format(info.event.end, "yyyy-MM-dd'T'HH:mm");
									startTransition(() => {
										addOptimisticAppointment({
											id: info.event.id,
											start: startStr,
											end: endStr,
										});
									});
									propsRef.current.onAppointmentReschedule(
										info.event.id,
										startStr,
										endStr,
									);
									if (typeof navigator !== "undefined" && navigator.vibrate) {
										navigator.vibrate([15, 50, 15]);
									}
									toast.success("Horário atualizado com sucesso!");
								}
							},
						}
					}
				});

				calendarInstance.current = calendar;
			});
		} catch (err) {
			console.error("[DayFlow] Render Error:", err);
		}

		return () => {
			if (calendarInstance.current) {
				try {
					calendarInstance.current.$destroy();
				} catch {}
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Mount only once, handle updates in useEffect

	useEffect(() => {
		const calendar = calendarInstance.current;
		if (!calendar) return;

		try {
			calendar.$set({
				options: {
					...calendar.options,
					view: VIEW_MAP[viewType],
					date: isValid(currentDate) ? currentDate : new Date(),
					events: dfEvents,
				}
			});
		} catch (e) {
			console.warn("[DayFlow] Sync error:", e);
		}
	}, [dfEvents, currentDate, viewType]);

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
					<div ref={containerRef} className="h-full w-full dayflow-vanilla-mount" />
				</div>
			</div>

			{/* DayFlow Custom Styles to Override Default Borders/Margins */}
			<style>{`
				.ec-event {
					background: transparent !important;
					border: none !important;
					padding: 0 !important;
					margin: 1px !important;
				}
				.ec-time-grid .ec-event {
					z-index: 10;
				}
			`}</style>
		</div>
	);
}
