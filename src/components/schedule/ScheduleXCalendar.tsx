/**
 * ScheduleXCalendar — Wrapper para @schedule-x/react v3.7.3
 * Uses Temporal.ZonedDateTime for event start/end (required by Schedule-X v3)
 */

import {
	createCalendar,
	createViewDay,
	createViewMonthGrid,
	createViewWeek,
} from "@schedule-x/calendar";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import { createCurrentTimePlugin } from "@schedule-x/current-time";
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop";
import {
	useEffect,
	useLayoutEffect,
	useMemo,
	useOptimistic,
	useRef,
	useTransition,
} from "react";
import "@schedule-x/theme-default/dist/index.css";
import { format, isValid } from "date-fns";
import { ExternalLink, Play } from "lucide-react";
import { toast } from "sonner";
import { Temporal } from "temporal-polyfill";
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

const CLINIC_TZ = "America/Sao_Paulo";

const VIEW_MAP: Record<ViewType, string> = {
	day: "day",
	week: "week",
	month: "month-grid",
};

function toZDT(dateStr: string, timeStr: string): Temporal.ZonedDateTime {
	const [h, m] = timeStr.slice(0, 5).split(":").map(Number);
	return Temporal.ZonedDateTime.from({
		year: Number(dateStr.slice(0, 4)),
		month: Number(dateStr.slice(5, 7)),
		day: Number(dateStr.slice(8, 10)),
		hour: h || 0,
		minute: m || 0,
		second: 0,
		timeZone: CLINIC_TZ,
	});
}

function zdtToString(zdt: unknown): string {
	if (zdt && typeof (zdt as any).year === "number") {
		const z = zdt as Temporal.ZonedDateTime;
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${z.year}-${pad(z.month)}-${pad(z.day)} ${pad(z.hour)}:${pad(z.minute)}`;
	}
	return String(zdt || "");
}

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

const CustomEventCard = ({
	calendarEvent,
	props,
}: {
	calendarEvent: any;
	props: any;
}) => {
	const appointment = calendarEvent;

	let formattedTime = "00:00";
	try {
		const s = appointment.start;
		if (s && typeof s.hour === "number") {
			formattedTime = `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`;
		} else if (s) {
			const str = String(s).replace(" ", "T").split("[")[0];
			const d = new Date(str);
			if (!isNaN(d.getTime())) {
				formattedTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
			}
		}
	} catch {}

	const statusColors: Record<string, string> = {
		confirmed: "bg-status-confirmed",
		scheduled: "bg-status-confirmed",
		pending: "bg-status-pending",
		cancelled: "bg-status-cancelled",
		completed: "bg-status-completed",
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={cn(
						"w-full h-full p-0.5 overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-blue-500/30 rounded-md bg-white text-left",
						appointment.status === "cancelled" && "opacity-50 grayscale",
					)}
					onClick={(e) => e.stopPropagation()}
				>
					<div
						className={cn(
							"flex flex-col h-full border-l-[3px] rounded-r-md p-1.5 shadow-sm overflow-hidden text-slate-900",
							(appointment.status === "confirmed" ||
								appointment.status === "scheduled") &&
								"border-status-confirmed",
							appointment.status === "pending" && "border-status-pending",
							appointment.status === "cancelled" && "border-status-cancelled",
							appointment.status === "completed" && "border-status-completed",
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
	useEffect(() => {
		propsRef.current = props;
	}, [props]);

	const [optimisticAppointments, addOptimisticAppointment] = useOptimistic(
		appointments,
		(state, { id, start, end }: { id: string; start: string; end: string }) => {
			return state.map((app) => {
				if (app.id !== id) return app;
				const [datePart, timePart] = start.split(" ");
				return {
					...app,
					start_time: timePart || start,
					end_time: end.split(" ")[1] || end,
					date: datePart || app.date,
					time: timePart || app.time,
				};
			});
		},
	);

	const sxEvents = useMemo(() => {
		return optimisticAppointments
			.filter((a) => !!a)
			.flatMap((a) => {
				try {
					let startZDT: Temporal.ZonedDateTime;
					let endZDT: Temporal.ZonedDateTime;

					if (a.start_time && a.end_time) {
						const rawDate =
							a.date instanceof Date
								? format(a.date, "yyyy-MM-dd")
								: String(a.date || "").slice(0, 10);
						const startTime = String(a.start_time).slice(0, 5);
						const endTime = String(a.end_time).slice(0, 5);
						if (rawDate.length < 10 || !startTime.includes(":")) return [];
						startZDT = toZDT(rawDate, startTime);
						endZDT = toZDT(rawDate, endTime);
					} else if (a.date && a.time) {
						const d = a.date instanceof Date ? a.date : new Date(a.date);
						if (!isValid(d)) return [];
						const dateStr = format(d, "yyyy-MM-dd");
						const timeStr = String(a.time || "00:00").slice(0, 5);
						startZDT = toZDT(dateStr, timeStr);
						endZDT = startZDT.add({ minutes: a.duration || 60 });
					} else {
						return [];
					}

					if (Temporal.ZonedDateTime.compare(endZDT, startZDT) <= 0) {
						endZDT = startZDT.add({ minutes: 60 });
					}

					return [
						{
							id: String(a.id),
							title: a.patient_name || a.patientName || "Consulta",
							start: startZDT,
							end: endZDT,
							status: a.status,
							type: a.type,
							therapist_id: a.therapist_id || a.therapistId,
							patient_avatar: a.patient_avatar,
						},
					];
				} catch {
					return [];
				}
			});
	}, [optimisticAppointments]);

	const customComponents = useMemo(
		() => ({
			timeGridEvent: (eventProps: any) => (
				<CustomEventCard {...eventProps} props={propsRef.current} />
			),
			dateGridEvent: (eventProps: any) => (
				<CustomEventCard {...eventProps} props={propsRef.current} />
			),
			monthGridEvent: (eventProps: any) => (
				<CustomEventCard {...eventProps} props={propsRef.current} />
			),
		}),
		[],
	);

	useLayoutEffect(() => {
		if (!containerRef.current || typeof window === "undefined") return;

		try {
			if (calendarInstance.current) calendarInstance.current.destroy();
		} catch {}

		try {
			const plugins = [
				createCalendarControlsPlugin(),
				createDragAndDropPlugin(),
				createCurrentTimePlugin(),
			];

			const calendar = createCalendar(
				{
					views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
					defaultView: VIEW_MAP[viewType] || "week",
					locale: "pt-BR",
					timezone: CLINIC_TZ,
					selectedDate: format(
						isValid(currentDate) ? currentDate : new Date(),
						"yyyy-MM-dd",
					),
					events: sxEvents,
					dayBoundaries: { start: "07:00", end: "21:00" },
					callbacks: {
						onEventClick: (event: any) =>
							propsRef.current.onEventClick?.(event),
						onClickDateTime: (dateTime: unknown) => {
							const str = zdtToString(dateTime);
							propsRef.current.onTimeSlotClick?.(str);
						},
						onClickDate: (date: unknown) => {
							const str = zdtToString(date);
							propsRef.current.onTimeSlotClick?.(str);
						},
						onEventUpdate: (event: any) => {
							if (propsRef.current.onAppointmentReschedule) {
								const startStr = zdtToString(event.start);
								const endStr = zdtToString(event.end);
								startTransition(() => {
									addOptimisticAppointment({
										id: event.id,
										start: startStr,
										end: endStr,
									});
								});
								propsRef.current.onAppointmentReschedule(
									event.id,
									startStr,
									endStr,
								);
								if (typeof navigator !== "undefined" && navigator.vibrate) {
									navigator.vibrate([15, 50, 15]);
								}
								toast.success("Horário atualizado com sucesso!");
							}
						},
					},
				},
				plugins,
			);

			const ccFns =
				(calendar as any).config?._customComponentFns ||
				(calendar as any).$app?.config?._customComponentFns;
			if (ccFns) {
				ccFns.timeGridEvent = customComponents.timeGridEvent;
				ccFns.dateGridEvent = customComponents.dateGridEvent;
				ccFns.monthGridEvent = customComponents.monthGridEvent;
			}

			calendar.render(containerRef.current);
			calendarInstance.current = calendar;
		} catch (err) {
			console.error("[ScheduleX] Erro no render:", err);
		}

		return () => {
			if (calendarInstance.current) {
				try {
					calendarInstance.current.destroy();
				} catch {}
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only recreate on view/event-count change; data sync is in the useEffect below
	}, [viewType, sxEvents.length]);

	useEffect(() => {
		const calendar = calendarInstance.current;
		if (!calendar) return;

		try {
			if (calendar.eventsService) calendar.eventsService.set(sxEvents);
			else if (calendar.events) calendar.events.set(sxEvents);

			const targetDate = format(
				isValid(currentDate) ? currentDate : new Date(),
				"yyyy-MM-dd",
			);
			if (calendar.plugins?.calendarControls?.setViewDate) {
				calendar.plugins.calendarControls.setViewDate(targetDate);
			}
		} catch (e) {
			console.warn("[ScheduleX] Sync error:", e);
		}
	}, [sxEvents, currentDate]);

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
