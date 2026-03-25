/**
 * CalendarView - Main calendar component for appointment scheduling
 *
 * This component provides day, week, and month views of appointments with
 * drag-and-drop rescheduling, filtering, and selection capabilities.
 *
 * VIRTUALIZATION STATUS:
 * - Virtualization infrastructure is available in src/components/schedule/virtualized/
 * - VirtualizedCalendarGrid and VirtualizedAppointmentList are ready for integration
 * - Currently NOT integrated because default slot counts (<50) are below threshold
 * - See src/components/schedule/VIRTUALIZATION_README.md for integration guide
 * - Virtualization will automatically activate when slot count exceeds 50
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Memoized components (AppointmentCard, TimeSlot)
 * - Optimistic updates for drag-and-drop
 * - Indexed appointment lookups by date
 * - Debounced drop target announcements
 * - Lazy-loaded modals
 */

/**
 * Feature flag to enable @dnd-kit implementation for drag and drop.
 * Set to true to use the new @dnd-kit implementation, false to use HTML5 native.
 */

import { useState, useMemo, useEffect, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	format,
	startOfWeek,
	addDays,
	addWeeks,
	addMonths,
	subDays,
	subWeeks,
	subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	ChevronLeft,
	ChevronRight,
	Plus,
	CheckSquare,
	Settings as SettingsIcon,
	Sparkles,
	Search,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Appointment } from "@/types/appointment";
import { generateTimeSlots } from "@/lib/config/agenda";
import { RescheduleConfirmDialog } from "./RescheduleConfirmDialog";
import { RescheduleCapacityDialog } from "./RescheduleCapacityDialog";
import { AdvancedFilters } from "./AdvancedFilters";
import { useAvailableTimeSlots } from "@/hooks/useAvailableTimeSlots";
import { CalendarDayView } from "./CalendarDayView";
import { CalendarWeekViewDndKit } from "./CalendarWeekViewDndKit";
import { CalendarMonthView } from "./CalendarMonthView";
import { useCalendarDragDndKit } from "@/hooks/useCalendarDragDndKit";
import { useCalendarDrag } from "@/hooks/useCalendarDrag";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";
import { formatDateToLocalISO } from "@/lib/utils/dateFormat";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { WaitlistIndicator } from "./WaitlistIndicator";
import {
	applyOptimisticAppointmentOverlay,
	hasOptimisticUpdateSynced,
	type PendingOptimisticUpdate,
} from "./calendarOptimistic";
import { NON_CAPACITY_STATUSES, isMarkedOverbooked } from "./shared/capacity";
import { useCardSize } from "@/hooks/useCardSize";
import { BUSINESS_HOURS, calculateSlotHeightFromCardSize } from "@/lib/config/agenda";

export type CalendarViewType = "day" | "week" | "month";

interface CalendarViewProps {
	appointments: Appointment[];
	currentDate: Date;
	onDateChange: (date: Date) => void;
	viewType: CalendarViewType;
	onViewTypeChange: (type: CalendarViewType) => void;
	onTimeSlotClick: (date: Date, time: string) => void;
	onAppointmentReschedule?: (
		appointment: Appointment,
		newDate: Date,
		newTime: string,
		ignoreCapacity?: boolean,
	) => Promise<void>;
	onEditAppointment?: (appointment: Appointment) => void;
	onDeleteAppointment?: (appointment: Appointment) => void;
	onDuplicateAppointment?: (appointment: Appointment) => void;
	onStatusChange?: (id: string, status: string) => void;
	// Selection props
	selectionMode?: boolean;
	selectedIds?: Set<string>;
	onToggleSelection?: (id: string) => void;
	/** Message announced to screen readers after successful reschedule (e.g. "Reagendado com sucesso") */
	rescheduleSuccessMessage?: string | null;
	/** Optional: called when user clicks an appointment (e.g. open quick edit). Not used by day/week views; kept for API compatibility. */
	onAppointmentClick?: (appointment: Appointment) => void;
	// Toolbar action props (merged from ScheduleToolbar)
	onCreateAppointment?: () => void;
	onToggleSelectionMode?: () => void;
	onCancelAllToday?: () => void;
	filters?: { status: string[]; types: string[]; therapists: string[] };
	onFiltersChange?: (filters: {
		status: string[];
		types: string[];
		therapists: string[];
	}) => void;
	onClearFilters?: () => void;
	totalAppointmentsCount?: number;
	// Patient search filter
	patientFilter?: string | null;
	onPatientFilterChange?: (patientName: string | null) => void;
}

const normalizeSlotTime = (time: string | undefined | null): string => {
	if (!time || typeof time !== "string") return "00:00";
	return time.substring(0, 5);
};

const timeToMinutes = (time: string | undefined | null): number => {
	const normalized = normalizeSlotTime(time);
	const [hours, minutes] = normalized.split(":").map(Number);
	return (hours || 0) * 60 + (minutes || 0);
};

const parseAppointmentDate = (dateValue: Appointment["date"]): Date | null => {
	if (!dateValue) return null;

	if (dateValue instanceof Date) {
		return isNaN(dateValue.getTime()) ? null : dateValue;
	}

	if (typeof dateValue === "string") {
		if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
			const [year, month, day] = dateValue.split("-").map(Number);
			return new Date(year, month - 1, day, 12, 0, 0);
		}

		const parsed = new Date(dateValue);
		return isNaN(parsed.getTime()) ? null : parsed;
	}

	return null;
};

const CalendarViewBase = ({
		appointments,
		currentDate,
		onDateChange,
		viewType,
		onViewTypeChange,
		onTimeSlotClick,
		onAppointmentReschedule,
		onEditAppointment,
		onDeleteAppointment,
		onDuplicateAppointment,
		onStatusChange,
		selectionMode = false,
		selectedIds = new Set(),
		onToggleSelection,
		rescheduleSuccessMessage = null,
		onAppointmentClick: _onAppointmentClick,
		onCreateAppointment,
		onToggleSelectionMode,
		onCancelAllToday,
		filters,
		onFiltersChange,
		onClearFilters,
		totalAppointmentsCount,
		patientFilter,
		onPatientFilterChange,
	}: CalendarViewProps) => {
		// Patient search autocomplete state
		const [patientSearchQuery, setPatientSearchQuery] = useState("");
		const [patientSearchOpen, setPatientSearchOpen] = useState(false);
		const patientSearchRef = useRef<HTMLDivElement>(null);

		// Extract unique patient names from appointments for autocomplete suggestions
		const uniquePatients = useMemo(() => {
			const map = new Map<string, string>();
			for (const apt of appointments) {
				if (apt.patientName && apt.patientId) {
					map.set(apt.patientId, apt.patientName);
				}
			}
			return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
		}, [appointments]);

		// Filter patient suggestions based on search query
		const patientSuggestions = useMemo(() => {
			if (!patientSearchQuery.trim()) return uniquePatients;
			const q = patientSearchQuery.toLowerCase().trim();
			return uniquePatients.filter((p) => p.name.toLowerCase().includes(q));
		}, [uniquePatients, patientSearchQuery]);

		// Close patient search dropdown on outside click
		useEffect(() => {
			const handleClickOutside = (e: MouseEvent) => {
				if (
					patientSearchRef.current &&
					!patientSearchRef.current.contains(e.target as Node)
				) {
					setPatientSearchOpen(false);
				}
			};
			if (patientSearchOpen) {
				document.addEventListener("mousedown", handleClickOutside);
				return () =>
					document.removeEventListener("mousedown", handleClickOutside);
			}
		}, [patientSearchOpen]);

		// State for appointment quick view popover
		const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
		// Current time indicator
		const [currentTime, setCurrentTime] = useState(new Date());
		const { getMinCapacityForInterval } = useScheduleCapacity();
		const { cardSize, heightScale } = useCardSize();

		// Optimistic updates state - maintains a local copy of appointments with pending changes
		const [pendingOptimisticUpdate, setPendingOptimisticUpdate] =
			useState<PendingOptimisticUpdate | null>(null);

		const baseDisplayAppointments = useMemo(() => {
			const base = applyOptimisticAppointmentOverlay(
				appointments,
				pendingOptimisticUpdate,
			);
			return (base || []).filter(
				(a): a is Appointment =>
					a != null && typeof (a as Appointment).id === "string",
			);
		}, [appointments, pendingOptimisticUpdate]);

		// Marca automaticamente os agendamentos que excedem a capacidade configurada.
		const overbookedAppointmentIds = useMemo(() => {
			const groupedByDate = new Map<string, Appointment[]>();

			for (const apt of baseDisplayAppointments) {
				const aptDate = parseAppointmentDate(apt.date);
				if (!aptDate) continue;
				const dateKey = format(aptDate, "yyyy-MM-dd");
				if (!groupedByDate.has(dateKey)) groupedByDate.set(dateKey, []);
				groupedByDate.get(dateKey)!.push(apt);
			}

			const result = new Set<string>();

			groupedByDate.forEach((dayAppointments) => {
				const activeAppointments = dayAppointments
					.filter(
						(apt) =>
							!NON_CAPACITY_STATUSES.has((apt.status || "").toLowerCase()),
					)
					.sort((a, b) => {
						const byTime = timeToMinutes(a.time) - timeToMinutes(b.time);
						if (byTime !== 0) return byTime;
						return a.id.localeCompare(b.id);
					});

				const activeIntervals: Array<{ id: string; end: number }> = [];

				for (const apt of activeAppointments) {
					const aptDate = parseAppointmentDate(apt.date);
					if (!aptDate) continue;

					const startMinutes = timeToMinutes(apt.time);
					const durationMinutes = Math.max(1, apt.duration || 60);
					const endMinutes = startMinutes + durationMinutes;
					const normalizedTime = normalizeSlotTime(apt.time);

					for (let i = activeIntervals.length - 1; i >= 0; i--) {
						if (activeIntervals[i].end <= startMinutes) {
							activeIntervals.splice(i, 1);
						}
					}

					const capacityForInterval = getMinCapacityForInterval(
						aptDate.getDay(),
						normalizedTime,
						durationMinutes,
					);
					const markedByNote = isMarkedOverbooked(apt.notes);

					if (
						markedByNote ||
						activeIntervals.length + 1 > capacityForInterval
					) {
						result.add(apt.id);
					}

					activeIntervals.push({ id: apt.id, end: endMinutes });
				}
			});

			return result;
		}, [baseDisplayAppointments, getMinCapacityForInterval]);

		const displayAppointments = useMemo(() => {
			return baseDisplayAppointments.map((apt) => {
				const isOverbooked = overbookedAppointmentIds.has(apt.id);
				if (apt.isOverbooked === isOverbooked) return apt;
				return { ...apt, isOverbooked };
			});
		}, [baseDisplayAppointments, overbookedAppointmentIds]);

		// Index appointments by date string (YYYY-MM-DD) for O(1) lookup
		const appointmentsByDate = useMemo(() => {
			const map = new Map<string, Appointment[]>();

			(displayAppointments || []).forEach((apt) => {
				if (!apt || !apt.date) return;

				const aptDate = parseAppointmentDate(apt.date);
				if (!aptDate) return;
				const dateKey = format(aptDate, "yyyy-MM-dd");

				if (!map.has(dateKey)) {
					map.set(dateKey, []);
				}
				map.get(dateKey)!.push(apt);
			});

			return map;
		}, [displayAppointments]);

		// Helper function to get appointments for a specific date
		// Needs to be defined BEFORE useCalendarDrag hook
		const getAppointmentsForDate = useCallback(
			(date: Date) => {
				const dateKey = format(date, "yyyy-MM-dd");
				return appointmentsByDate.get(dateKey) || [];
			},
			[appointmentsByDate],
		);

		// Helper function to get appointments for a specific slot (date + time)
		// Used by useCalendarDrag to detect existing appointments in the drop target
		// Considers time overlap based on appointment duration
		// MUST be defined AFTER getAppointmentsForDate but BEFORE handleOptimisticUpdate
		const getAppointmentsForSlot = useCallback(
			(date: Date, time: string) => {
				const dateAppointments = getAppointmentsForDate(date);
				const normalizedTime = time.substring(0, 5); // "HH:mm"

				// Convert time to minutes for overlap calculation
				const [targetHour, targetMin] = normalizedTime.split(":").map(Number);
				const targetMinutes = targetHour * 60 + targetMin;

				// Find all appointments that overlap with the target time slot
				return dateAppointments.filter((apt) => {
					const aptTime = apt.time?.substring(0, 5) || "00:00";
					const [aptHour, aptMin] = aptTime.split(":").map(Number);
					const aptStartMinutes = aptHour * 60 + aptMin;
					const aptEndMinutes = aptStartMinutes + (apt.duration || 60);

					// Check if target time falls within the appointment's duration
					// Or if the appointment starts at exactly the target time
					return (
						aptTime === normalizedTime ||
						(targetMinutes >= aptStartMinutes && targetMinutes < aptEndMinutes)
					);
				});
			},
			[getAppointmentsForDate],
		);

		// Optimistic update handlers
		const handleOptimisticUpdate = useCallback(
			(appointmentId: string, newDate: Date, newTime: string) => {
				const safeAppointments = (appointments || []).filter(
					(a): a is Appointment =>
						a != null && typeof (a as Appointment).id === "string",
				);
				const appointment = safeAppointments.find(
					(a) => a.id === appointmentId,
				);
				if (!appointment) return;

				// Save original values for potential revert
				setPendingOptimisticUpdate({
					id: appointmentId,
					originalDate: appointment.date,
					originalTime: appointment.time,
					targetDate: formatDateToLocalISO(newDate) as Appointment["date"],
					targetTime: newTime,
				});
			},
			[appointments],
		);

		const handleRevertUpdate = useCallback((_appointmentId: string) => {
			setPendingOptimisticUpdate(null);
		}, []);

		// Drag and drop logic from hook (native HTML5)
		const {
			dragState: dragStateNative,
			dropTarget: dropTargetNative,
			showConfirmDialog: showConfirmNative,
			showOverCapacityDialog: showOverCapacityNative,
			pendingReschedule: pendingRescheduleNative,
			pendingOverCapacity: pendingOverCapacityNative,
			targetAppointments,
			handleDragStart: handleDragStartNative,
			handleDragEnd: handleDragEndNative,
			handleDragOver: handleDragOverNative,
			handleDragLeave: handleDragLeaveNative,
			handleDrop: handleDropNative,
			handleConfirmReschedule: handleConfirmNative,
			handleCancelReschedule: handleCancelNative,
			handleConfirmOverCapacity: handleConfirmOverCapacityNative,
			handleCancelOverCapacity: handleCancelOverCapacityNative,
		} = useCalendarDrag({
			onAppointmentReschedule,
			onOptimisticUpdate: handleOptimisticUpdate,
			onRevertUpdate: handleRevertUpdate,
			getAppointmentsForSlot,
			getMinCapacityForInterval,
		});

		// Drag and drop logic from hook (@dnd-kit)
		const {
			dragState,
			dropTarget,
			showConfirmDialog: showConfirmDndKit,
			pendingReschedule: pendingRescheduleDndKit,
			handleDragStart: handleDragStartDndKit,
			handleDragOver: handleDragOverDndKit,
			handleDragEnd: handleDragEndDndKit,
			handleConfirmReschedule: handleConfirmDndKit,
			handleCancelReschedule: handleCancelDndKit,
			showOverCapacityDialog: showOverCapacityDndKit,
			pendingOverCapacity: pendingOverCapacityDndKit,
			handleConfirmOverCapacity: handleConfirmOverCapacityDndKit,
			handleCancelOverCapacity: handleCancelOverCapacityDndKit,
		} = useCalendarDragDndKit({
			onAppointmentReschedule,
			onOptimisticUpdate: handleOptimisticUpdate,
			onRevertUpdate: handleRevertUpdate,
			getAppointmentsForSlot,
			getMinCapacityForInterval,
		});

		// Merged states for shared components
		const isConfirmDialogOpen = showConfirmNative || showConfirmDndKit;
		const isOverCapacityDialogOpen =
			showOverCapacityNative || showOverCapacityDndKit;
		const activePendingReschedule =
			pendingRescheduleNative || pendingRescheduleDndKit;
		const activePendingOverCapacity =
			pendingOverCapacityNative || pendingOverCapacityDndKit;

		const handleConfirmReschedule = showConfirmNative
			? handleConfirmNative
			: handleConfirmDndKit;
		const handleCancelReschedule = showConfirmNative
			? handleCancelNative
			: handleCancelDndKit;
		const handleConfirmOverCapacity = showOverCapacityNative
			? handleConfirmOverCapacityNative
			: handleConfirmOverCapacityDndKit;
		const handleCancelOverCapacity = showOverCapacityNative
			? handleCancelOverCapacityNative
			: handleCancelOverCapacityDndKit;

		useEffect(() => {
			const timer = setInterval(() => {
				setCurrentTime(new Date());
			}, 60000); // Update every minute

			return () => clearInterval(timer);
		}, []);

		const activeSavingAppointmentId =
			dragState.savingAppointmentId || dragStateNative.savingAppointmentId;

		// Keep the optimistic overlay until upstream appointments already reflect the target slot.
		useEffect(() => {
			if (!pendingOptimisticUpdate) {
				return;
			}

			if (activeSavingAppointmentId) {
				return;
			}

			if (hasOptimisticUpdateSynced(appointments, pendingOptimisticUpdate)) {
				setPendingOptimisticUpdate(null);
			}
		}, [activeSavingAppointmentId, appointments, pendingOptimisticUpdate]);

		const currentTimePosition = useMemo(() => {
			const hours = currentTime.getHours();
			const minutes = currentTime.getMinutes();
			const totalMinutesFromStart = hours * 60 + minutes - 7 * 60; // Start from 7am
			const totalDayMinutes = 17 * 60; // 7am to 12am = 17 hours
			return (totalMinutesFromStart / totalDayMinutes) * 100;
		}, [currentTime]);

		const navigateCalendar = useCallback(
			(direction: "prev" | "next") => {
				switch (viewType) {
					case "day":
						onDateChange(
							direction === "prev"
								? subDays(currentDate, 1)
								: addDays(currentDate, 1),
						);
						break;
					case "week":
						onDateChange(
							direction === "prev"
								? subWeeks(currentDate, 1)
								: addWeeks(currentDate, 1),
						);
						break;
					case "month":
						onDateChange(
							direction === "prev"
								? subMonths(currentDate, 1)
								: addMonths(currentDate, 1),
						);
						break;
				}
			},
			[viewType, currentDate, onDateChange],
		);

		const goToToday = useCallback(() => {
			onDateChange(new Date());
		}, [onDateChange]);

		const getHeaderTitle = useCallback(() => {
			switch (viewType) {
				case "day":
					return format(currentDate, "d 'de' MMMM", { locale: ptBR });
				case "week": {
					const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
					const weekEnd = addDays(weekStart, 5); // Seg to Sab
					if (weekStart.getMonth() === weekEnd.getMonth()) {
						return `${format(weekStart, "d")} - ${format(weekEnd, "d 'de' MMMM", { locale: ptBR })}`;
					}
					return `${format(weekStart, "d 'de' MMM", { locale: ptBR })} - ${format(weekEnd, "d 'de' MMM", { locale: ptBR })}`;
				}
				case "month":
					return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
				default:
					return "";
			}
		}, [viewType, currentDate]);

		// Restore focus to calendar grid when a reschedule dialog closes
		const calendarGridRef = useRef<HTMLDivElement>(null);
		const isAnyRescheduleDialogOpen =
			isConfirmDialogOpen || isOverCapacityDialogOpen;
		const prevShowDialogRef = useRef(isAnyRescheduleDialogOpen);
		useEffect(() => {
			const didClose = prevShowDialogRef.current && !isAnyRescheduleDialogOpen;
			prevShowDialogRef.current = isAnyRescheduleDialogOpen;
			if (didClose) {
				// Short delay so focus runs after Radix unmounts the dialog and releases focus
				const t = setTimeout(() => {
					calendarGridRef.current?.focus({ preventScroll: true });
				}, 0);
				return () => clearTimeout(t);
			}
		}, [isAnyRescheduleDialogOpen]);

		// Screen reader: announce drop target during drag (WCAG feedback)
		const dropTargetAnnouncement = useMemo(() => {
			if (!dragState.isDragging) return null;
			if (!dropTarget) return "Nenhum slot selecionado";
			const dayStr = format(dropTarget.date, "EEEE, d 'de' MMMM", {
				locale: ptBR,
			});
			const capitalized = dayStr.charAt(0).toUpperCase() + dayStr.slice(1);
			return `Solte em ${capitalized}, ${dropTarget.time}`;
		}, [dragState.isDragging, dropTarget]);

		// Debounce drop target announcement (150ms) to avoid excessive announcements when dragging quickly
		const [debouncedDropAnnouncement, setDebouncedDropAnnouncement] = useState<
			string | null
		>(null);
		useEffect(() => {
			if (!dragState.isDragging) {
				setDebouncedDropAnnouncement(null);
				return;
			}
			if (dropTargetAnnouncement === null) {
				setDebouncedDropAnnouncement(null);
				return;
			}
			const t = setTimeout(
				() => setDebouncedDropAnnouncement(dropTargetAnnouncement),
				150,
			);
			return () => clearTimeout(t);
		}, [dragState.isDragging, dropTargetAnnouncement]);

		const getStatusColor = useCallback(
			(status: string, isOverCapacity: boolean = false) => {
				// Over-capacity appointments get a strong alert color
				if (isOverCapacity) {
					return "bg-gradient-to-br from-red-600 to-rose-700 border-red-400 shadow-red-500/40 ring-2 ring-red-400/50 ring-offset-1";
				}

				const s = status.toLowerCase();
				switch (s) {
					case "presenca_confirmada":
						return "bg-gradient-to-br from-blue-900 to-blue-950 border-blue-800 shadow-blue-900/30";
					case "agendado":
						return "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400 shadow-blue-500/30";
					case "atendido":
						return "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 shadow-emerald-500/30";
					case "avaliacao":
						return "bg-gradient-to-br from-violet-500 to-violet-600 border-violet-400 shadow-violet-500/30";
					case "cancelado":
					case "nao_atendido_sem_cobranca":
						return "bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 shadow-slate-900/30";
					case "faltou":
						return "bg-gradient-to-br from-red-500 to-red-600 border-red-400 shadow-red-500/30";
					case "faltou_com_aviso":
						return "bg-gradient-to-br from-teal-400 to-teal-500 border-teal-300 shadow-teal-400/30";
					case "faltou_sem_aviso":
						return "bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400 shadow-orange-500/30";
					case "nao_atendido":
						return "bg-gradient-to-br from-gray-500 to-gray-600 border-gray-400 shadow-gray-500/30";
					case "remarcar":
						return "bg-gradient-to-br from-slate-400 to-slate-500 border-slate-300 shadow-slate-400/30";
					default:
						return "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400 shadow-blue-500/30";
				}
			},
			[],
		);

		// Helper to check if appointment is over capacity
		const isOverCapacity = useCallback((apt: Appointment): boolean => {
			return isMarkedOverbooked(apt.notes, apt.isOverbooked);
		}, []);

		// Hook for time slots availability
		const {
			timeSlots: dayTimeSlotInfo,
			isDayClosed,
			isTimeBlocked,
			getBlockReason,
			blockedTimes,
			businessHours,
		} = useAvailableTimeSlots(currentDate);

		const getDaySchedule = useCallback(
			(date: Date) => {
				const dayOfWeek = date.getDay();

				// Sunday default closed
				if (dayOfWeek === 0) return null;

				const config = businessHours?.find((h) => h.day_of_week === dayOfWeek);

				if (config) {
					if (!config.is_open) return null;
					return {
						open: normalizeSlotTime(config.open_time),
						close: normalizeSlotTime(config.close_time),
					};
				}

				// Fallback default hours (Mon-Fri 07-21, Sat 07-13)
				const defaultClose = dayOfWeek === 6 ? "13:00" : "21:00";
				return {
					open: "07:00",
					close: defaultClose,
				};
			},
			[businessHours],
		);

		// Helper to check if time is blocked for any date
		const checkTimeBlocked = useCallback(
			(date: Date, time: string): { blocked: boolean; reason?: string } => {
				const schedule = getDaySchedule(date);
				if (!schedule) {
					return { blocked: true, reason: "Fora do horário de funcionamento" };
				}

				const timeMinutes = timeToMinutes(time);
				const openMinutes = timeToMinutes(schedule.open);
				const closeMinutes = timeToMinutes(schedule.close);

				// Block outside business hours
				if (timeMinutes < openMinutes || timeMinutes >= closeMinutes) {
					return { blocked: true, reason: "Fora do horário de funcionamento" };
				}

				if (!blockedTimes || !time) {
					return { blocked: false };
				}

				const dayOfWeek = date.getDay();

				for (const block of blockedTimes) {
					const blockStart = new Date(block.start_date);
					const blockEnd = new Date(block.end_date);
					blockStart.setHours(0, 0, 0, 0);
					blockEnd.setHours(23, 59, 59, 999);

					const checkDate = new Date(date);
					checkDate.setHours(0, 0, 0, 0);

					if (checkDate >= blockStart && checkDate <= blockEnd) {
						if (block.is_all_day) {
							return { blocked: true, reason: block.title };
						}
						if (block.start_time && block.end_time) {
							const [btH, btM] = block.start_time.split(":").map(Number);
							const [etH, etM] = block.end_time.split(":").map(Number);
							if (
								timeMinutes >= btH * 60 + btM &&
								timeMinutes < etH * 60 + etM
							) {
								return { blocked: true, reason: block.title };
							}
						}
					}

					if (block.is_recurring && block.recurring_days?.includes(dayOfWeek)) {
						if (block.is_all_day) {
							return { blocked: true, reason: block.title };
						}
						if (block.start_time && block.end_time) {
							const [btH, btM] = block.start_time.split(":").map(Number);
							const [etH, etM] = block.end_time.split(":").map(Number);
							if (
								timeMinutes >= btH * 60 + btM &&
								timeMinutes < etH * 60 + etM
							) {
								return { blocked: true, reason: block.title };
							}
						}
					}
				}
				return { blocked: false };
			},
			[blockedTimes, getDaySchedule],
		);

		// Check if a day is closed based on business hours
		const isDayClosedForDate = useCallback(
			(date: Date): boolean => {
				return getDaySchedule(date) === null;
			},
			[getDaySchedule],
		);

		const memoizedTimeSlots = useMemo(() => {
			return dayTimeSlotInfo.length > 0
				? dayTimeSlotInfo.map((s) => s.time)
				: generateTimeSlots(currentDate);
		}, [dayTimeSlotInfo, currentDate]);

		const weekTimeSlots = useMemo(() => {
			const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
			const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

			let minStart = 7 * 60;
			let maxEnd = 21 * 60;

			const fallbackRange = (day: number) => ({
				start: 7 * 60,
				end: day === 6 ? 13 * 60 : 21 * 60,
			});

			if (businessHours && businessHours.length > 0) {
				days.forEach((day) => {
					const dow = day.getDay();
					const config = businessHours.find((h) => h.day_of_week === dow);

					if (!config) {
						const { start, end } = fallbackRange(dow);
						minStart = Math.min(minStart, start);
						maxEnd = Math.max(maxEnd, end);
						return;
					}

					if (!config.is_open) return;

					const open = timeToMinutes(config.open_time);
					const close = timeToMinutes(config.close_time);

					if (Number.isFinite(open) && open > 0) {
						minStart = Math.min(minStart, open);
					}

					if (Number.isFinite(close) && close > 0) {
						maxEnd = Math.max(maxEnd, close);
					}
				});
			}

			const slots: string[] = [];
			const slotDuration = 30;
			for (let minutes = minStart; minutes < maxEnd; minutes += slotDuration) {
				const hour = Math.floor(minutes / 60);
				const minute = minutes % 60;
				slots.push(
					`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
				);
			}

			return slots;
		}, [businessHours, currentDate]);

		// Single live region: success takes precedence over debounced drop target (avoids two competing announcements)
		const liveAnnouncement =
			rescheduleSuccessMessage ?? debouncedDropAnnouncement ?? "";

		return (
			<>
				{/* Screen reader: drop target during drag and reschedule success (only render when there is something to announce) */}
				{liveAnnouncement ? (
					<div
						className="sr-only"
						role="status"
						aria-live="polite"
						aria-atomic="true"
					>
						{liveAnnouncement}
					</div>
				) : null}
				<Card
					className="flex flex-col border-none shadow-premium-lg h-full flex-1 min-h-0 bg-slate-50 dark:bg-slate-950/20"
					role="region"
					aria-label="Calendário de agendamentos"
				>
					<CardContent className="p-0 flex flex-col h-full">
						{/* Modern Header (Padrão 2026 - Glassmorphism) */}
						<div className="z-[45] flex-shrink-0 sticky top-0 px-4 py-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-premium-sm transition-all duration-300">
							<div className="flex flex-wrap items-center justify-between gap-4 max-w-[1800px] mx-auto">
								{/* Left: Navigation & Date */}
								<div className="flex items-center gap-4">
									<div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/30 dark:border-slate-700/30 shadow-inner">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => navigateCalendar("prev")}
											className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-700 shadow-none hover:shadow-sm p-0"
											aria-label="Anterior"
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => navigateCalendar("next")}
											className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-700 shadow-none hover:shadow-sm p-0"
											aria-label="Próximo"
										>
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>

									<Button
										variant="outline"
										size="sm"
										onClick={goToToday}
										className="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border-blue-100 bg-white/50 hover:bg-blue-50 transition-all shadow-sm active:scale-95"
										aria-label="Ir para hoje"
									>
										Hoje
									</Button>

									<h2
										className="font-serif text-xl md:text-2xl text-blue-950 dark:text-blue-50 tracking-tight capitalize"
										aria-live="polite"
										aria-atomic="true"
									>
										{getHeaderTitle()}
									</h2>

									{/* Appointments count badge */}
									{totalAppointmentsCount !== undefined && (
										<div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 dark:bg-blue-500/20 rounded-full border border-blue-200/50 dark:border-blue-800/50">
											<Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
											<span className="text-[11px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest">
												{totalAppointmentsCount} Atendimentos
											</span>
										</div>
									)}
								</div>

								{/* Right: Search + Tools (Bento Style Layout) */}
								<div className="flex items-center gap-3">
									{/* Improved Patient Search */}
									{onPatientFilterChange && (
										<div className="relative group" ref={patientSearchRef}>
											{patientFilter ? (
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														onPatientFilterChange(null);
														setPatientSearchQuery("");
													}}
													className="h-9 px-3 rounded-xl gap-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all"
												>
													<Search className="w-3.5 h-3.5" />
													<span className="text-xs font-bold truncate max-w-[120px]">
														{patientFilter}
													</span>
													<X className="w-3.5 h-3.5 p-0.5 rounded-full bg-blue-200 text-blue-700" />
												</Button>
											) : (
												<div className="relative">
													<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
													<input
														type="text"
														placeholder="Pesquisar paciente..."
														value={patientSearchQuery}
														onChange={(e) => {
															setPatientSearchQuery(e.target.value);
															setPatientSearchOpen(true);
														}}
														onFocus={() => setPatientSearchOpen(true)}
														className="h-9 w-[200px] lg:w-[240px] pl-10 pr-4 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all duration-300 shadow-inner"
													/>
												</div>
											)}

											{/* Rich Autocomplete Dropdown */}
											<AnimatePresence>
												{patientSearchOpen && !patientFilter && (
													<motion.div
														initial={{ opacity: 0, y: 10, scale: 0.95 }}
														animate={{ opacity: 1, y: 0, scale: 1 }}
														exit={{ opacity: 0, scale: 0.95 }}
														className="absolute top-full right-0 mt-2 w-[320px] max-h-[400px] overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-blue-100/50 dark:border-slate-800 rounded-2xl shadow-premium-xl z-[60]"
													>
														<div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
															<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
																Sugestões de Pacientes
															</span>
														</div>
														<div className="overflow-y-auto max-h-[340px] custom-scrollbar">
															{patientSuggestions.length === 0 ? (
																<div className="px-4 py-10 text-center space-y-2">
																	<Search className="w-8 h-8 text-slate-200 mx-auto" />
																	<p className="text-sm text-slate-400">
																		Nenhum paciente encontrado
																	</p>
																</div>
															) : (
																patientSuggestions.map((patient) => (
																	<button
																		key={patient.id}
																		onClick={() => {
																			onPatientFilterChange(patient.name);
																			setPatientSearchQuery("");
																			setPatientSearchOpen(false);
																		}}
																		className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/50 last:border-0 group/item"
																	>
																		<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center shrink-0 shadow-sm group-hover/item:scale-110 transition-transform">
																			<span className="text-xs font-black text-blue-700 dark:text-blue-300">
																				{patient.name.charAt(0).toUpperCase()}
																			</span>
																		</div>
																		<div className="flex flex-col min-w-0">
																			<span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover/item:text-blue-600 transition-colors">
																				{patient.name}
																			</span>
																			<span className="text-[10px] text-slate-400 uppercase tracking-tight">
																				Paciente Ativo
																			</span>
																		</div>
																	</button>
																))
															)}
														</div>
													</motion.div>
												)}
											</AnimatePresence>
										</div>
									)}

									<div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden md:block" />

									<div className="flex items-center gap-1.5">
										<WaitlistIndicator
											onSchedulePatient={onCreateAppointment}
											className="hidden lg:flex"
										/>

										{/* Actions Bento Group */}
										<div className="flex items-center bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/30 shadow-inner">
											<Link to="/agenda/settings">
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all"
													title="Configurações"
												>
													<SettingsIcon className="w-4 h-4 text-slate-500" />
												</Button>
											</Link>

											{filters && onFiltersChange && onClearFilters && (
												<AdvancedFilters
													filters={filters}
													onChange={onFiltersChange}
													onClear={onClearFilters}
												/>
											)}

											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 rounded-lg text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
												onClick={() =>
													toast({
														title: "✨ IA FisioFlow Ativa",
														description:
															"Analisando 48 agendamentos e 12 conflitos potenciais para otimizar sua semana...",
													})
												}
											>
												<Sparkles className="h-4 w-4" />
											</Button>

											{onToggleSelectionMode && (
												<Button
													variant="ghost"
													size="icon"
													className={cn(
														"h-8 w-8 rounded-lg transition-all",
														selectionMode
															? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
															: "text-slate-500 hover:bg-white",
													)}
													onClick={onToggleSelectionMode}
													title="Modo Seleção"
												>
													<CheckSquare className="h-4 w-4" />
												</Button>
											)}
										</div>
									</div>

									{/* View Switcher Modern */}
									<div
										className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl shadow-inner border border-slate-200/30"
										role="radiogroup"
									>
										{(["day", "week", "month"] as CalendarViewType[]).map(
											(type) => (
												<button
													key={type}
													onClick={() => onViewTypeChange(type)}
													className={cn(
														"px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300",
														viewType === type
															? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-premium-sm"
															: "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
													)}
													role="radio"
													aria-checked={viewType === type}
												>
													{type === "day"
														? "Dia"
														: type === "week"
															? "Semana"
															: "Mês"}
												</button>
											),
										)}
									</div>

									{/* New Appointment - High Impact CTA */}
									{onCreateAppointment && (
										<Button
											onClick={onCreateAppointment}
											size="sm"
											className="h-10 px-5 bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 active:scale-95 transition-all gap-2"
										>
											<Plus className="w-4 h-4" />
											<span className="hidden xl:inline text-xs">Agendar</span>
										</Button>
									)}
								</div>
							</div>
						</div>

						<div
							ref={calendarGridRef}
							className="flex-1 relative outline-none min-h-0 overflow-hidden"
							id="calendar-grid"
							role="tabpanel"
							tabIndex={-1}
							aria-label={`Visualização ${viewType === "day" ? "diária" : viewType === "week" ? "semanal" : "mensal"} do calendário`}
						>
							<AnimatePresence mode="wait">
								{viewType === "day" && (
									<motion.div
										key="day-view"
										initial={{ opacity: 0, x: -10 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: 10 }}
										transition={{ duration: 0.2 }}
										className="h-full"
									>
										<CalendarDayView
											currentDate={currentDate}
											currentTime={currentTime}
											currentTimePosition={currentTimePosition}
											getAppointmentsForDate={getAppointmentsForDate}
											savingAppointmentId={dragStateNative.savingAppointmentId}
											timeSlots={memoizedTimeSlots}
											isDayClosed={isDayClosed}
											onTimeSlotClick={onTimeSlotClick}
											onEditAppointment={onEditAppointment}
											onDeleteAppointment={onDeleteAppointment}
											onDuplicateAppointment={onDuplicateAppointment}
											onStatusChange={onStatusChange}
											onAppointmentReschedule={onAppointmentReschedule}
											dragState={dragStateNative}
											dropTarget={dropTargetNative}
											targetAppointments={targetAppointments}
											handleDragStart={handleDragStartNative}
											handleDragEnd={handleDragEndNative}
											handleDragOver={handleDragOverNative}
											handleDragLeave={handleDragLeaveNative}
											handleDrop={handleDropNative}
											isTimeBlocked={isTimeBlocked}
											getBlockReason={getBlockReason}
											_getStatusColor={getStatusColor}
											isOverCapacity={isOverCapacity}
											openPopoverId={openPopoverId}
											setOpenPopoverId={setOpenPopoverId}
											selectionMode={selectionMode}
											selectedIds={selectedIds}
											onToggleSelection={onToggleSelection}
										/>
									</motion.div>
								)}

								{viewType === "week" && (
									<motion.div
										key="week-view"
										initial={{ opacity: 0, x: -10 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: 10 }}
										transition={{ duration: 0.2 }}
										className="h-full"
									>
										<CalendarWeekViewDndKit
											currentDate={currentDate}
											appointments={displayAppointments}
											savingAppointmentId={dragState.savingAppointmentId}
											timeSlots={weekTimeSlots}
											onTimeSlotClick={onTimeSlotClick}
											onEditAppointment={onEditAppointment}
											onDeleteAppointment={onDeleteAppointment}
											onDuplicateAppointment={onDuplicateAppointment}
											onStatusChange={onStatusChange}
											onAppointmentReschedule={onAppointmentReschedule}
											checkTimeBlocked={checkTimeBlocked}
											isDayClosedForDate={isDayClosedForDate}
											openPopoverId={openPopoverId}
											setOpenPopoverId={setOpenPopoverId}
											dragState={dragState}
											dropTarget={dropTarget}
											handleDragStart={handleDragStartDndKit}
											handleDragOver={handleDragOverDndKit}
											handleDragEnd={handleDragEndDndKit}
											selectionMode={selectionMode}
											selectedIds={selectedIds}
											onToggleSelection={onToggleSelection}
										/>
									</motion.div>
								)}

								{viewType === "month" && (
									<motion.div
										key="month-view"
										initial={{ opacity: 0, x: -10 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: 10 }}
										transition={{ duration: 0.2 }}
										className="h-full"
									>
										<CalendarMonthView
											currentDate={currentDate}
											appointments={displayAppointments}
											onDateChange={onDateChange}
											onTimeSlotClick={onTimeSlotClick}
											onEditAppointment={onEditAppointment}
											onDeleteAppointment={onDeleteAppointment}
											onDuplicateAppointment={onDuplicateAppointment}
											onStatusChange={onStatusChange}
											getAppointmentsForDate={getAppointmentsForDate}
											getStatusColor={getStatusColor}
											isOverCapacity={isOverCapacity}
											openPopoverId={openPopoverId}
											setOpenPopoverId={setOpenPopoverId}
										/>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</CardContent>
				</Card>

				<RescheduleConfirmDialog
					open={isConfirmDialogOpen}
					onOpenChange={(open) => !open && handleCancelReschedule()}
					appointment={activePendingReschedule?.appointment || null}
					newDate={activePendingReschedule?.newDate || null}
					newTime={activePendingReschedule?.newTime || null}
					onConfirm={handleConfirmReschedule}
				/>

				<RescheduleCapacityDialog
					open={isOverCapacityDialogOpen}
					onOpenChange={(open) => !open && handleCancelOverCapacity()}
					appointment={activePendingOverCapacity?.appointment || null}
					newDate={activePendingOverCapacity?.newDate || null}
					newTime={activePendingOverCapacity?.newTime || null}
					currentCount={activePendingOverCapacity?.currentCount || 0}
					maxCapacity={activePendingOverCapacity?.maxCapacity || 0}
					onConfirm={handleConfirmOverCapacity}
					onCancel={handleCancelOverCapacity}
				/>
			</>
		);
	};

// Custom comparison function for memo optimization
function calendarViewAreEqual(
	prev: CalendarViewProps,
	next: CalendarViewProps,
): boolean {
	// Compare primitive values
	if (
		prev.viewType !== next.viewType ||
		prev.selectionMode !== next.selectionMode
	) {
		return false;
	}

	// Compare dates
	if (prev.currentDate.getTime() !== next.currentDate.getTime()) {
		return false;
	}

	// Compare appointments array length first (quick check)
	if (prev.appointments.length !== next.appointments.length) {
		return false;
	}

	// Deep compare appointments only if length matches
	if (prev.appointments !== next.appointments) {
		return false;
	}

	// Compare selected sets
	if (prev.selectedIds?.size !== next.selectedIds?.size) {
		return false;
	}

	if (prev.rescheduleSuccessMessage !== next.rescheduleSuccessMessage) {
		return false;
	}

	// Compare function references
	return (
		prev.onDateChange === next.onDateChange &&
		prev.onViewTypeChange === next.onViewTypeChange &&
		prev.onTimeSlotClick === next.onTimeSlotClick &&
		prev.onEditAppointment === next.onEditAppointment &&
		prev.onDeleteAppointment === next.onDeleteAppointment &&
		prev.onToggleSelection === next.onToggleSelection
	);
}

export default memo(CalendarViewBase, calendarViewAreEqual);
CalendarViewBase.displayName = "CalendarView";
