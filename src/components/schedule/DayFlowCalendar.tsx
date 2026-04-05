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
	const isDraggingRef = useRef(false);
	
	// State for the globally floating Popover, totally detached from calendar DOM nodes
	const [activePopover, setActivePopover] = useState<{ event: any, rect: DOMRect } | null>(null);

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
					const appointment = info.event.extendedProps;
					const formattedTime = format(info.event.start, "HH:mm");
					const statusConfig = getStatusConfig(appointment.status);
					const isCancelled = appointment.status === "cancelled";
					
					// Render raw HTML. No React reconciliation, completely immune to drag-and-drop cloning crashes.
					const html = `
						<div class="w-full h-full p-0.5 overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-blue-500/30 rounded-md ${statusConfig.bg} text-left ${isCancelled ? 'opacity-50 grayscale' : ''} ${statusConfig.calendarClassName}">
							<div class="flex flex-col h-full border-l-[3px] rounded-r-md p-0.5 px-1.5 shadow-sm overflow-hidden ${statusConfig.text} ${statusConfig.bg} justify-center ${statusConfig.borderColor}">
								<div class="flex items-center justify-between gap-1">
									<span class="font-black text-[9px] uppercase tracking-wider opacity-70 leading-none">
										${formattedTime}
									</span>
									<div class="h-1 w-1 rounded-full flex-shrink-0 ${statusConfig.calendarAccent}"></div>
								</div>
								<div class="font-black leading-none line-clamp-1 text-[11px] uppercase tracking-tight mt-[1.5px]">
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
		// CRITICAL: Do NOT update calendar options if a drag is in progress.
		// Updating events list mid-drag destroys the dragging mirror and crashes the UI.
		if (!calendar || isDraggingRef.current) return;

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
				<div className="flex-1 h-full min-h-0 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden relative">
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
