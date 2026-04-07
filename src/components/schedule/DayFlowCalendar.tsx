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
import Calendar from "@event-calendar/core";
import TimeGrid from "@event-calendar/time-grid";
import DayGrid from "@event-calendar/day-grid";
import Interaction from "@event-calendar/interaction";
import "@event-calendar/core/index.css";
import { format, isValid, addMinutes, addDays, startOfWeek } from "date-fns";
import { ScheduleToolbar } from "./ScheduleToolbar";
import { AppointmentQuickView } from "./AppointmentQuickView";
import { getStatusConfig } from "./shared/appointment-status";

type ViewType = "day" | "week" | "month";

const VIEW_MAP: Record<ViewType, string> = {
	day: "timeGridDay",
	week: "timeGridWeek",
	month: "dayGridMonth",
};
const WEEK_SLOT_COUNT = 28; // 14 hours * 2 slots per hour.
const WEEK_HEADER_HEIGHT = 28;

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
	const isWeekView = viewType === "week";
	const [weekSlotHeight, setWeekSlotHeight] = useState(20);
	const slotHeight = isWeekView ? weekSlotHeight : 14;
	const slotDuration = isWeekView ? "00:30:00" : "00:15:00";
	const slotLabelFormat = useMemo(
		() => (time: Date) => (time.getMinutes() === 0 ? format(time, "HH:mm") : ""),
		[],
	);

	const [, startTransition] = useTransition();
	const containerRef = useRef<HTMLDivElement>(null);
	const calendarInstance = useRef<any>(null);
	const propsRef = useRef(props);
	const isDraggingRef = useRef(false);
	
	// State for the globally floating Popover, totally detached from calendar DOM nodes
	const [activePopover, setActivePopover] = useState<{ event: any, rect: DOMRect } | null>(null);

	useEffect(() => {
		propsRef.current = props;
	}, [props]);

	useEffect(() => {
		if (!isWeekView || !containerRef.current || typeof ResizeObserver === "undefined") {
			return;
		}

		const updateWeekSlotHeight = () => {
			const availableHeight = containerRef.current?.getBoundingClientRect().height ?? 0;
			if (!availableHeight) return;
			const nextSlotHeight = Math.max(
				16,
				Math.floor((availableHeight - WEEK_HEADER_HEIGHT) / WEEK_SLOT_COUNT),
			);
			setWeekSlotHeight((current) => (current === nextSlotHeight ? current : nextSlotHeight));
		};

		updateWeekSlotHeight();
		const observer = new ResizeObserver(updateWeekSlotHeight);
		observer.observe(containerRef.current);

		return () => observer.disconnect();
	}, [isWeekView]);

	const [optimisticAppointments, addOptimisticAppointment] = useOptimistic(
		appointments || [],
		(state, { id, start, end }: { id: string; start: string; end: string }) => {
			if (!state || state.length === 0) return state;
			return state.map((app) => {
				if (String(app.id) !== String(id)) return app;
				const [datePart, timePart] = start.split("T");
				const [, endTimePart] = end.split("T");
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
		const appointmentEvents = (optimisticAppointments || [])
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

		if (!isWeekView || !isValid(currentDate)) {
			return appointmentEvents;
		}

		const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
		const saturday = addDays(weekStart, 5);
		const saturdayDate = format(saturday, "yyyy-MM-dd");
		const closedRangeEvent = {
			id: `closed-saturday-${saturdayDate}`,
			start: new Date(`${saturdayDate}T13:00:00`),
			end: new Date(`${saturdayDate}T21:00:00`),
			display: "background" as const,
			backgroundColor: "rgba(148, 163, 184, 0.16)",
			classNames: ["dayflow-closed-slot"],
		};

		return [...appointmentEvents, closedRangeEvent];
	}, [optimisticAppointments, isWeekView, currentDate]);

	useLayoutEffect(() => {
		if (!containerRef.current || typeof window === "undefined") return;

		try {
			if (calendarInstance.current) {
				calendarInstance.current.destroy();
			}
		} catch {}

		try {
			const calendar = new Calendar({
				target: containerRef.current!,
				props: {
					plugins: [TimeGrid, DayGrid, Interaction],
					options: {
						view: VIEW_MAP[viewType] || "timeGridWeek",
						events: dfEvents,
						date: isValid(currentDate) ? currentDate : new Date(),
						height: "100%",
						slotMinTime: "07:00:00",
						slotMaxTime: "21:00:00",
						slotDuration,
						slotHeight,
						slotLabelInterval: "00:00:00",
						slotLabelFormat,
						scrollTime: "07:00:00",
						hiddenDays: [0],
						snapDuration: "00:05:00",
						editable: true,
						droppable: true,
						selectable: true,
						headerToolbar: { start: '', center: '', end: '' },
						locale: 'pt-br',
						firstDay: 1,
						allDaySlot: false,
						eventContent: (info: any) => {
							const appointment = info.event.extendedProps;
							const formattedTime = format(info.event.start, "HH:mm");
							const statusConfig = getStatusConfig(appointment.status);
							const isCancelled = appointment.status === "cancelled";
							const cardDensityClass = isWeekView
								? "dayflow-event-card--compact"
								: "dayflow-event-card--default";
							
							// Render raw HTML. No React reconciliation, completely immune to drag-and-drop cloning crashes.
							const html = `
								<div class="dayflow-event-shell ${cardDensityClass} ${isCancelled ? "dayflow-event-shell--cancelled" : ""} ${statusConfig.bg} ${statusConfig.calendarClassName}">
									<div class="dayflow-event-card ${statusConfig.text} ${statusConfig.bg} ${statusConfig.borderColor}">
										<div class="dayflow-event-card__meta">
											<span class="dayflow-event-card__time">
												${formattedTime}
											</span>
											<div class="dayflow-event-card__dot ${statusConfig.calendarAccent}"></div>
										</div>
										<div class="dayflow-event-card__title">
											${appointment.title}
										</div>
									</div>
								</div>
							`;
							return { html };
						},
						eventClick: (info: any) => {
							if (info.jsEvent) {
								info.jsEvent.preventDefault();
								info.jsEvent.stopPropagation();
							}
							// Use coordinate-based anchor to detach popover from calendar DOM node
							const rect = info.el.getBoundingClientRect();
							setActivePopover({ event: info.event, rect });
						},
						dateClick: (info: any) => {
							setActivePopover(null);
							propsRef.current.onTimeSlotClick?.(format(info.date, "yyyy-MM-dd'T'HH:mm"));
						},
						eventDragStart: () => {
							setActivePopover(null);
							isDraggingRef.current = true;
						},
						eventDragStop: () => {
							// Delay resetting dragging flag to allow internal logic to complete without interference
							setTimeout(() => {
								isDraggingRef.current = false;
							}, 200);
						},
						eventDrop: (info: any) => {
							isDraggingRef.current = false;
							if (propsRef.current.onAppointmentReschedule) {
								const startStr = format(info.event.start, "yyyy-MM-dd'T'HH:mm");
								const endStr = format(info.event.end, "yyyy-MM-dd'T'HH:mm");
								
								// Use optimistic update to keep UI in sync immediately
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
							}
						},
					}
				}
			});

			calendarInstance.current = calendar;
		} catch (err) {
			console.error("[DayFlow] Render Error:", err);
		}

		return () => {
			if (calendarInstance.current) {
				try {
					calendarInstance.current.destroy();
				} catch {}
				calendarInstance.current = null;
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const calendar = calendarInstance.current;
		// CRITICAL: Do NOT update calendar options if a drag is in progress.
		// Updating events list mid-drag destroys the dragging mirror and crashes the UI.
		if (!calendar || isDraggingRef.current) return;

		try {
			calendar.setOption('view', VIEW_MAP[viewType]);
			calendar.setOption('date', isValid(currentDate) ? currentDate : new Date());
			calendar.setOption('slotHeight', slotHeight);
			calendar.setOption('slotDuration', slotDuration);
			calendar.setOption('slotLabelInterval', "00:00:00");
			calendar.setOption('slotLabelFormat', slotLabelFormat);
			calendar.setOption('scrollTime', "07:00:00");
			calendar.setOption('events', dfEvents);
		} catch (e) {
			console.warn("[DayFlow] Sync error:", e);
		}
	}, [dfEvents, currentDate, viewType, slotHeight, slotDuration, slotLabelFormat]);

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

			<div 
				className="flex-1 p-1 md:p-2 min-h-0 overflow-hidden"
				onClick={(e) => {
					// Close popover if user clicks outside of an event
					const target = e.target as HTMLElement;
					if (activePopover && !target.closest('.ec-event') && !target.closest('[role="dialog"]')) {
						setActivePopover(null);
					}
				}}
			>
				<div
					className={`flex-1 h-full min-h-0 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden relative ${isWeekView ? "dayflow-week-view" : "dayflow-regular-view"}`}
				>
					<div ref={containerRef} className="h-full w-full dayflow-vanilla-mount" />
				</div>
			</div>

			{/* Coordinate-based Popover rendering - completely detached from buggy DOM clones */}
			{activePopover && (
				<AppointmentQuickView
					open={!!activePopover}
					onOpenChange={(open) => !open && setActivePopover(null)}
					appointment={{
						...activePopover.event.extendedProps,
						date: activePopover.event.start,
						time: format(activePopover.event.start, "HH:mm"),
						duration: Math.round((activePopover.event.end - activePopover.event.start) / 60000),
					}}
					onEdit={() => {
						setActivePopover(null);
						propsRef.current.onEditAppointment?.(activePopover.event.id);
					}}
					onDelete={() => {
						setActivePopover(null);
						propsRef.current.onDeleteAppointment?.(activePopover.event.id);
					}}
				>
					<div 
						style={{
							position: 'fixed',
							top: activePopover.rect.top,
							left: activePopover.rect.left,
							width: activePopover.rect.width,
							height: activePopover.rect.height,
							pointerEvents: 'none',
							visibility: 'hidden'
						}}
					/>
				</AppointmentQuickView>
			)}

			{/* DayFlow Custom Styles */}
			<style>{`
				.ec-toolbar {
					display: none !important;
				}
				.ec-event {
					background: transparent !important;
					border: none !important;
					padding: 0 !important;
					margin: 1px !important;
				}
				.ec-time-grid .ec-event {
					z-index: 10;
				}
				.dayflow-week-view .ec-body {
					overflow-y: hidden !important;
				}
				.dayflow-week-view .ec-body .ec-time,
				.dayflow-week-view .ec-body .ec-line {
					height: ${slotHeight}px !important;
				}
				.dayflow-week-view .ec-header .ec-time,
				.dayflow-week-view .ec-header .ec-sidebar-title,
				.dayflow-week-view .ec-all-day .ec-time,
				.dayflow-week-view .ec-all-day .ec-sidebar-title {
					height: 0 !important;
					min-height: 0 !important;
					line-height: 0 !important;
					padding: 0 !important;
					overflow: hidden !important;
					visibility: hidden !important;
				}
				.dayflow-week-view .ec-body .ec-time {
					font-size: 9px !important;
					line-height: ${slotHeight}px !important;
					top: 0 !important;
				}
				.dayflow-event-shell {
					width: 100%;
					height: 100%;
					padding: 1px;
					overflow: hidden;
					cursor: pointer;
					border-radius: 6px;
					text-align: left;
				}
				.dayflow-event-shell--cancelled {
					opacity: 0.5;
					filter: grayscale(1);
				}
				.dayflow-week-view .ec-bg-event.dayflow-closed-slot {
					background:
						repeating-linear-gradient(
							135deg,
							rgba(148, 163, 184, 0.12) 0,
							rgba(148, 163, 184, 0.12) 8px,
							rgba(148, 163, 184, 0.2) 8px,
							rgba(148, 163, 184, 0.2) 16px
						) !important;
					border-top: 1px dashed rgba(100, 116, 139, 0.5);
					pointer-events: none;
				}
				.dayflow-event-card {
					display: flex;
					flex-direction: column;
					justify-content: center;
					height: 100%;
					min-height: 22px;
					padding: 3px 6px;
					overflow: hidden;
					border-left-width: 3px;
					border-left-style: solid;
					border-radius: 0 6px 6px 0;
					box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
				}
				.dayflow-event-card--default .dayflow-event-card {
					min-height: 24px;
					padding: 3px 6px;
				}
				.dayflow-event-card--compact .dayflow-event-card {
					min-height: 18px;
					padding: 2px 5px;
				}
				.dayflow-event-card__meta {
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 4px;
				}
				.dayflow-event-card__time {
					font-size: 8px;
					line-height: 1;
					font-weight: 700;
					letter-spacing: 0.02em;
					opacity: 0.72;
				}
				.dayflow-event-card__dot {
					width: 4px;
					height: 4px;
					border-radius: 999px;
					flex-shrink: 0;
				}
				.dayflow-event-card__title {
					margin-top: 2px;
					font-size: 10px;
					line-height: 1.05;
					font-weight: 600;
					letter-spacing: -0.01em;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
					text-transform: none;
				}
				.dayflow-event-card--compact .dayflow-event-card__time {
					font-size: 7px;
				}
				.dayflow-event-card--compact .dayflow-event-card__title {
					margin-top: 1px;
					font-size: 10px;
					line-height: 1.08;
					font-weight: 500;
				}
			`}</style>
		</div>
	);
}

export default DayFlowCalendarWrapper;
