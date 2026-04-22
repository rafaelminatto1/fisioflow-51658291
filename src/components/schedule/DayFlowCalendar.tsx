/**
 * DayFlowCalendar — Wrapper for @event-calendar/core (vkurko/calendar)
 * A lightweight, highly performant Vanilla JS calendar engine for Vite/Rolldown.
 */

import Calendar from "@event-calendar/core";
import DayGrid from "@event-calendar/day-grid";
import Interaction from "@event-calendar/interaction";
import TimeGrid from "@event-calendar/time-grid";
import {
	useEffect,
	useLayoutEffect,
	useMemo,
	useOptimistic,
	useRef,
	useState,
	useTransition,
} from "react";
import "@event-calendar/core/index.css";
import { addDays, addMinutes, format, isValid, startOfWeek } from "date-fns";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { useCardSize } from "@/hooks/useCardSize";
import { formatTime, roundDateToNearestInterval } from "@/utils/dateUtils";
import { AppointmentQuickView } from "./AppointmentQuickView";
import { ScheduleToolbar } from "./ScheduleToolbar";
import {
	getCalendarCardColors,
	normalizeStatus,
} from "./shared/appointment-status";

type ViewType = "day" | "week" | "month";

const VIEW_MAP: Record<ViewType, string> = {
	day: "timeGridDay",
	week: "timeGridWeek",
	month: "dayGridMonth",
};
const WEEK_HEADER_HEIGHT = 48; // Updated for better accuracy of the clinical header
const WEEK_SLOT_COUNT = 56; // 14 hours (07-21) * 4 slots per hour.

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
	const { cssVariables, heightMultiplier } = useCardSize();
	const isWeekView = viewType === "week";
	const [weekSlotHeight, setWeekSlotHeight] = useState(15);
	const slotHeight = isWeekView ? weekSlotHeight : Math.round(24 * heightMultiplier);
	const slotDuration = "00:15:00";
	// @event-calendar/core passes slot-label Date objects in UTC.
	// Using getUTCHours/getUTCMinutes ensures the sidebar times match the
	// actual appointment times stored as local time strings (e.g. "16:00").
	const slotLabelFormat = useMemo(
		() => (time: Date) => {
			const h = time.getUTCHours();
			const m = time.getUTCMinutes();
			return m === 0 ? `${String(h).padStart(2, "0")}:00` : "";
		},
		[],
	);

	const [, startTransition] = useTransition();
	const containerRef = useRef<HTMLDivElement>(null);
	const calendarInstance = useRef<any>(null);
	const propsRef = useRef(props);
	const isDraggingRef = useRef(false);

	// State for the globally floating Popover, totally detached from calendar DOM nodes
	const [activePopover, setActivePopover] = useState<{
		event: any;
		rect: DOMRect;
	} | null>(null);
	const { getStatusConfig: getSharedStatusConfig } =
		useStatusConfig();

	const cardColorsMapRef = useRef<
		Record<string, { accent: string; background: string; text: string }>
	>({});
	const [colorVersion, setColorVersion] = useState(0);

	useEffect(() => {
		const map: Record<
			string,
			{ accent: string; background: string; text: string }
		> = {};
		const allStatuses = [
			"agendado",
			"atendido",
			"avaliacao",
			"cancelado",
			"aguardando_confirmacao",
			"faltou",
			"faltou_com_aviso",
			"faltou_sem_aviso",
			"nao_atendido",
			"nao_atendido_sem_cobranca",
			"presenca_confirmada",
			"remarcar",
		];
		allStatuses.forEach((status) => {
			const config = getSharedStatusConfig(status);
			if (config?.calendarCardColors) {
				map[status] = config.calendarCardColors;
			} else {
				map[status] = getCalendarCardColors(status);
			}
		});
		cardColorsMapRef.current = map;
		setColorVersion((v) => v + 1);
	}, [getSharedStatusConfig]);

	useEffect(() => {
		propsRef.current = props;
	}, [props]);

	useEffect(() => {
		if (
			!isWeekView ||
			!containerRef.current ||
			typeof ResizeObserver === "undefined"
		) {
			return;
		}

		const updateWeekSlotHeight = () => {
			const availableHeight =
				containerRef.current?.getBoundingClientRect().height ?? 0;
			if (!availableHeight) return;
			const nextSlotHeight = Math.max(
				10,
				Math.floor((availableHeight - WEEK_HEADER_HEIGHT) / WEEK_SLOT_COUNT),
			);
			setWeekSlotHeight((current) =>
				current === nextSlotHeight ? current : nextSlotHeight,
			);
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
							backgroundColor: "transparent",
							borderColor: "transparent",
							extendedProps: {
								...a,
								id: String(a.id || a.tempId),
								title: a.patient_name || a.patientName || "Consulta",
							},
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
						slotMaxTime: "21:15:00",
						slotDuration,
						slotHeight,
						slotLabelInterval: "01:00:00",
						slotLabelFormat,
						scrollTime: "07:00:00",
						hiddenDays: [0],
						snapDuration: "00:15:00",
						editable: true,
						droppable: true,
						selectable: true,
						scrollBarWidth: 0,
						headerToolbar: { start: "", center: "", end: "" },
						locale: "pt-br",
						firstDay: 1,
						allDaySlot: false,
						eventContent: (info: any) => {
							if (
								info.event.display === "background" ||
								info.event.id?.startsWith("closed-")
							) {
								return { html: "" };
							}
							const appointment = info.event.extendedProps;
							const formattedTime = format(info.event.start, "HH:mm");
							const normalizedStatusName = normalizeStatus(
								appointment.status || "agendado",
							);
							const isCancelled =
								appointment.status === "cancelled" ||
								normalizedStatusName === "cancelado";
							const cardDensityClass = isWeekView
								? "dayflow-event-card--compact"
								: "dayflow-event-card--default";
							const colors =
								cardColorsMapRef.current[normalizedStatusName] ||
								getCalendarCardColors(normalizedStatusName);

							const html = `
								<div class="dayflow-event-shell ${cardDensityClass} ${isCancelled ? "dayflow-event-shell--cancelled" : ""}" style="background-color:${colors.background};border-left:3px solid ${colors.accent};border-radius:6px; font-size: var(--agenda-card-font-scale, 11px); opacity: var(--agenda-card-opacity, 1);">
									<div class="dayflow-event-card" style="border-left:none;">
										<div class="dayflow-event-card__meta" style="font-size: 0.8em;">
											<span class="dayflow-event-card__time" style="color:${colors.text}; font-size: 1em;">
												${formattedTime}
											</span>
											<div class="dayflow-event-card__dot" style="background-color:${colors.accent};"></div>
										</div>
										<div class="dayflow-event-card__title" style="color:${colors.text}; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; white-space:normal; word-break:break-word; line-height:1.2; font-size: 1em;">
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
							const roundedDate = roundDateToNearestInterval(info.date, 15);
							propsRef.current.onTimeSlotClick?.(
								format(roundedDate, "yyyy-MM-dd'T'HH:mm"),
							);
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
								const roundedStart = roundDateToNearestInterval(
									info.event.start,
									15,
								);
								const durationInMinutes = Math.max(
									15,
									Math.round(
										(info.event.end.getTime() - info.event.start.getTime()) /
											60000 /
											15,
									) * 15,
								);
								const roundedEnd = addMinutes(roundedStart, durationInMinutes);
								const startStr = format(roundedStart, "yyyy-MM-dd'T'HH:mm");
								const endStr = format(roundedEnd, "yyyy-MM-dd'T'HH:mm");

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
					},
				},
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
		if (!calendar || isDraggingRef.current) return;
		try {
			calendar.setOption("events", dfEvents);
		} catch (e) {
			console.warn("[DayFlow] Color sync error:", e);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [colorVersion]);

	useEffect(() => {
		const calendar = calendarInstance.current;
		// CRITICAL: Do NOT update calendar options if a drag is in progress.
		// Updating events list mid-drag destroys the dragging mirror and crashes the UI.
		if (!calendar || isDraggingRef.current) return;

		try {
			calendar.setOption("view", VIEW_MAP[viewType]);
			calendar.setOption(
				"date",
				isValid(currentDate) ? currentDate : new Date(),
			);
			calendar.setOption("slotHeight", slotHeight);
			calendar.setOption("slotDuration", slotDuration);
			calendar.setOption("slotLabelInterval", "01:00:00");
			calendar.setOption("slotLabelFormat", slotLabelFormat);
			calendar.setOption("scrollTime", "07:00:00");
			calendar.setOption("events", dfEvents);
		} catch (e) {
			console.warn("[DayFlow] Sync error:", e);
		}
	}, [
		dfEvents,
		currentDate,
		viewType,
		slotHeight,
		slotDuration,
		slotLabelFormat,
	]);

	return (
		<div
			className="flex-1 flex flex-col min-h-0 bg-slate-50/50 overflow-hidden relative"
			style={cssVariables}
		>
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
					if (
						activePopover &&
						!target.closest(".ec-event") &&
						!target.closest('[role="dialog"]')
					) {
						setActivePopover(null);
					}
				}}
			>
				<div
					className={`flex-1 h-full min-h-0 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden relative ${isWeekView ? "dayflow-week-view" : "dayflow-regular-view"}`}
				>
					<div
						ref={containerRef}
						className="h-full w-full dayflow-vanilla-mount"
					/>
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
						time: formatTime(
							activePopover.event.start.getHours(),
							activePopover.event.start.getMinutes(),
						),
						duration: Math.round(
							(activePopover.event.end - activePopover.event.start) / 60000,
						),
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
							position: "fixed",
							top: activePopover.rect.top,
							left: activePopover.rect.left,
							width: activePopover.rect.width,
							height: activePopover.rect.height,
							pointerEvents: "none",
							visibility: "hidden",
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
					overflow-x: hidden !important;
				}
				.ec-header {
					overflow: hidden !important;
				}
				.ec-sidebar {
					width: 48px !important;
					flex-shrink: 0 !important;
					flex-grow: 0 !important;
					border-right: 1px solid #cbd5e1 !important;
					box-sizing: border-box !important;
				}
				.ec-header .ec-sidebar {
					width: 48px !important;
					flex-shrink: 0 !important;
					flex-grow: 0 !important;
					visibility: visible !important;
					display: flex !important;
					border-right: 1px solid #cbd5e1 !important;
					box-sizing: border-box !important;
				}
				.ec-lines {
					position: absolute !important;
					width: 100% !important;
					pointer-events: none !important;
				}
				/* Force header to match body width by removing scrollbar compensation */
				.ec-header {
					padding-right: 0 !important;
				}
				.ec-scrollbar-spacer,
				.ec-hidden-scroll {
					display: none !important;
					width: 0 !important;
				}
				.dayflow-week-view .ec-body .ec-time,
				.dayflow-week-view .ec-body .ec-line {
					height: var(--agenda-slot-height, 20px) !important;
				}
				.dayflow-week-view .ec-body .ec-time {
					font-size: 10px !important;
					line-height: var(--agenda-slot-height, 20px) !important;
					top: 0 !important;
					text-align: center !important;
					width: 100% !important;
					color: #64748b !important;
					font-weight: 700 !important;
					display: flex !important;
					align-items: center !important;
					justify-content: center !important;
				}
				.dayflow-event-shell {
					width: calc(100% - 2px);
					height: calc(100% - 2px);
					padding: 1px;
					overflow: hidden;
					cursor: pointer;
					border-radius: 6px;
					text-align: left;
					transition: opacity 0.2s ease;
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
					line-height: 1.05;
					font-weight: 600;
					letter-spacing: -0.01em;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
					text-transform: none;
				}
			`}</style>
		</div>
	);
}

export default DayFlowCalendarWrapper;
