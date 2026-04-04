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
	useState,
	useTransition,
} from "react";
import { createPortal } from "react-dom";
import { createCalendar, destroyCalendar, TimeGrid, DayGrid, Interaction } from "@event-calendar/core";
import "@event-calendar/core/index.css";
import { format, isValid, addMinutes } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScheduleToolbar } from "./ScheduleToolbar";
import { AppointmentQuickView } from "./AppointmentQuickView";
import { getStatusConfig } from "./shared/appointment-status";

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

const CustomEventCard = ({ calendarEvent, props }: CustomEventCardProps) => {
	// event-calendar injects event data via info.event
	const appointment = calendarEvent.extendedProps;
	const formattedTime = format(calendarEvent.start, "HH:mm");
	const statusConfig = getStatusConfig(appointment.status);
	const [open, setOpen] = useState(false);

	return (
		<AppointmentQuickView
			open={open}
			onOpenChange={setOpen}
			appointment={{
				...appointment,
				date: calendarEvent.start,
				time: formattedTime,
				duration: Math.round((calendarEvent.end - calendarEvent.start) / 60000),
			}}
			onEdit={() => {
				setOpen(false);
				props.onEditAppointment?.(appointment.id);
			}}
			onDelete={() => {
				setOpen(false);
				props.onDeleteAppointment?.(appointment.id);
			}}
		>
			<button
				className={cn(
					"w-full h-full p-0.5 overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-blue-500/30 rounded-md bg-white text-left",
					appointment.status === "cancelled" && "opacity-50 grayscale",
				)}
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setOpen(true);
				}}
			>
				<div
					className={cn(
						"flex flex-col h-full border-l-[3px] rounded-r-md p-0.5 px-1.5 shadow-sm overflow-hidden text-slate-900 bg-white justify-center",
						statusConfig.borderColor,
					)}
				>
					<div className="flex items-center justify-between gap-1">
						<span className="font-black text-[7px] uppercase tracking-wider text-slate-400 leading-none">
							{formattedTime}
						</span>
						<div
							className={cn("h-1 w-1 rounded-full flex-shrink-0", statusConfig.calendarAccent)}
						/>
					</div>
					<div className="font-black leading-none line-clamp-1 text-[9px] uppercase tracking-tight text-slate-800 mt-[1px]">
						{appointment.title}
					</div>
				</div>
			</button>
		</AppointmentQuickView>
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
	const [portals, setPortals] = useState<Map<string, { el: HTMLElement; event: any }>>(new Map());

	useEffect(() => {
		propsRef.current = props;
	}, [props]);

	const [optimisticAppointments, addOptimisticAppointment] = useOptimistic(
		appointments || [],
		(state, { id, start, end }: { id: string; start: string; end: string }) => {
			if (!state || state.length === 0) return state;
			return state.map((app) => {
				if (String(app.id) !== String(id)) return app;
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
		return (optimisticAppointments || [])
			.filter((a) => !!a && (a.id || a.tempId))
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

					if (!isValid(startDate) || !isValid(endDate)) return [];

					if (endDate <= startDate) {
						endDate = addMinutes(startDate, 60);
					}

					return [
						{
							id: String(a.id || a.tempId),
							title: a.patient_name || a.patientName || "Consulta",
							start: startDate,
							end: endDate,
							backgroundColor: 'transparent',
							borderColor: 'transparent',
							extendedProps: {
								...a,
								id: String(a.id || a.tempId),
								title: a.patient_name || a.patientName || "Consulta",
							}
						},
					];
				} catch (err) {
					console.error("[DayFlow] Event mapping error:", err, a);
					return [];
				}
			});
	}, [optimisticAppointments]);

	useLayoutEffect(() => {
		if (!containerRef.current || typeof window === "undefined") return;

		try {
			if (calendarInstance.current) destroyCalendar(calendarInstance.current);
		} catch {}

		try {
			const calendar = createCalendar(containerRef.current!, [TimeGrid, DayGrid, Interaction], {
				view: VIEW_MAP[viewType] || "timeGridWeek",
				events: dfEvents,
				date: isValid(currentDate) ? currentDate : new Date(),
				height: "100%",
				slotMinTime: "07:00:00",
				slotMaxTime: "21:00:00",
				slotDuration: "00:15:00",
				slotHeight: 14,
				hiddenDays: [0],
				snapDuration: "00:05:00",
				editable: true,
				droppable: true,
				selectable: true,
				headerToolbar: false,
				locale: 'pt-br',
				firstDay: 1,
				allDaySlot: false,
				eventContent: (info: any) => {
					const div = document.createElement("div");
					div.className = "w-full h-full event-portal-container";
					return { domNodes: [div] };
				},
				eventDidMount: (info: any) => {
					const el = info.el.querySelector(".event-portal-container");
					if (el) {
						setPortals((prev) => {
							const next = new Map(prev);
							next.set(String(info.event.id), { el, event: info.event });
							return next;
						});
					}
				},
				eventWillUnmount: (info: any) => {
					setPortals((prev) => {
						if (!prev.has(String(info.event.id))) return prev;
						const next = new Map(prev);
						next.delete(String(info.event.id));
						return next;
					});
				},
				dateClick: (info: any) => {
					propsRef.current.onTimeSlotClick?.(format(info.date, "yyyy-MM-dd'T'HH:mm"));
				},
				eventDrop: (info: any) => {
					if (propsRef.current.onAppointmentReschedule) {
						const startStr = format(info.event.start, "yyyy-MM-dd'T'HH:mm");
						const endStr = format(info.event.end, "yyyy-MM-dd'T'HH:mm");
						
						// Use optimistic update to keep UI in sync
						startTransition(() => {
							addOptimisticAppointment({
								id: String(info.event.id),
								start: startStr,
								end: endStr,
							});
						});

						propsRef.current.onAppointmentReschedule(
							String(info.event.id),
							startStr,
							endStr,
						);
						
						if (typeof navigator !== "undefined" && navigator.vibrate) {
							navigator.vibrate([15, 50, 15]);
						}
						toast.success("Horário atualizado com sucesso!");
					}
				},
			});

			calendarInstance.current = calendar;
		} catch (err) {
			console.error("[DayFlow] Render Error:", err);
		}

		return () => {
			if (calendarInstance.current) {
				try {
					destroyCalendar(calendarInstance.current);
				} catch {}
				calendarInstance.current = null;
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const calendar = calendarInstance.current;
		if (!calendar) return;

		try {
			calendar.setOption('view', VIEW_MAP[viewType]);
			calendar.setOption('date', isValid(currentDate) ? currentDate : new Date());
			calendar.setOption('events', dfEvents);
		} catch (e) {
			console.warn("[DayFlow] Sync error:", e);
		}
	}, [dfEvents, currentDate, viewType]);

	return (
		<div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 overflow-hidden relative">
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

			<div className="flex-1 p-1 md:p-2 min-h-0 overflow-hidden">
				<div className="flex-1 h-full min-h-0 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden relative">
					<div ref={containerRef} className="h-full w-full dayflow-vanilla-mount" />
				</div>
			</div>

			{/* Render Portals for each event */}
			{[...portals.entries()].map(([id, { el, event }]) =>
				createPortal(
					<CustomEventCard calendarEvent={event} props={propsRef.current} />,
					el
				)
			)}

			{/* DayFlow Custom Styles */}
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

export default DayFlowCalendarWrapper;
