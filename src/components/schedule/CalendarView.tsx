import {
	addDays,
	addMonths,
	addWeeks,
	format,
	startOfWeek,
	subDays,
	subMonths,
	subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import {
	ChevronLeft,
	ChevronRight,
	Plus,
	Search,
	X,
} from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCalendarDrag } from "@/hooks/useCalendarDrag";
import { useCalendarDragDndKit } from "@/hooks/useCalendarDragDndKit";
import { useCardSize } from "@/hooks/useCardSize";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";
import { generateTimeSlots } from "@/lib/config/agenda";
import { cn } from "@/lib/utils";
import { formatDateToLocalISO } from "@/lib/utils/dateFormat";
import type { Appointment } from "@/types/appointment";
import { CalendarDayView } from "./CalendarDayView";
import { CalendarMonthView } from "./CalendarMonthView";
import { CalendarWeekViewDndKit } from "./CalendarWeekViewDndKit";
import {
	applyOptimisticAppointmentOverlay,
	hasOptimisticUpdateSynced,
	type PendingOptimisticUpdate,
} from "./calendarOptimistic";
import { RescheduleCapacityDialog } from "./RescheduleCapacityDialog";
import { RescheduleConfirmDialog } from "./RescheduleConfirmDialog";
import { isMarkedOverbooked, NON_CAPACITY_STATUSES } from "./shared/capacity";

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
	selectionMode?: boolean;
	selectedIds?: Set<string>;
	onToggleSelection?: (id: string) => void;
	rescheduleSuccessMessage?: string | null;
	onAppointmentClick?: (appointment: Appointment) => void;
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
	if (dateValue instanceof Date)
		return isNaN(dateValue.getTime()) ? null : dateValue;
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

export default function CalendarView({
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
	onCreateAppointment,
	onToggleSelectionMode,
	onCancelAllToday,
	filters,
	onFiltersChange,
	patientFilter,
	onPatientFilterChange,
}: CalendarViewProps) {
	const [patientSearchQuery, setPatientSearchQuery] = React.useState("");
	const [patientSearchOpen, setPatientSearchOpen] = React.useState(false);
	const patientSearchRef = React.useRef<HTMLDivElement>(null);

	const uniquePatients = React.useMemo(() => {
		const map = new Map<string, string>();
		for (const apt of appointments) {
			if (apt.patientName && apt.patientId)
				map.set(apt.patientId, apt.patientName);
		}
		return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
	}, [appointments]);

	const patientSuggestions = React.useMemo(() => {
		if (!patientSearchQuery.trim()) return uniquePatients;
		const q = patientSearchQuery.toLowerCase().trim();
		return uniquePatients.filter((p) => p.name.toLowerCase().includes(q));
	}, [uniquePatients, patientSearchQuery]);

	React.useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				patientSearchRef.current &&
				!patientSearchRef.current.contains(e.target as Node)
			)
				setPatientSearchOpen(false);
		};
		if (patientSearchOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () =>
				document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [patientSearchOpen]);

	const [openPopoverId, setOpenPopoverId] = React.useState<string | null>(null);
	const [currentTime, setCurrentTime] = React.useState(new Date());
	const { getMinCapacityForInterval } = useScheduleCapacity();
	const [pendingOptimisticUpdate, setPendingOptimisticUpdate] =
		React.useState<PendingOptimisticUpdate | null>(null);

	const baseDisplayAppointments = React.useMemo(() => {
		const base = applyOptimisticAppointmentOverlay(
			appointments,
			pendingOptimisticUpdate,
		);
		return (base || []).filter(
			(a): a is Appointment =>
				a != null && typeof (a as Appointment).id === "string",
		);
	}, [appointments, pendingOptimisticUpdate]);

	const overbookedAppointmentIds = React.useMemo(() => {
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
					(apt) => !NON_CAPACITY_STATUSES.has((apt.status || "").toLowerCase()),
				)
				.sort(
					(a, b) =>
						timeToMinutes(a.time) - timeToMinutes(b.time) ||
						a.id.localeCompare(b.id),
				);
			const activeIntervals: Array<{ id: string; end: number }> = [];
			for (const apt of activeAppointments) {
				const aptDate = parseAppointmentDate(apt.date);
				if (!aptDate) continue;
				const startMinutes = timeToMinutes(apt.time);
				const durationMinutes = Math.max(1, apt.duration || 60);
				const endMinutes = startMinutes + durationMinutes;
				for (let i = activeIntervals.length - 1; i >= 0; i--) {
					if (activeIntervals[i].end <= startMinutes)
						activeIntervals.splice(i, 1);
				}
				const capacityForInterval = getMinCapacityForInterval(
					aptDate.getDay(),
					normalizeSlotTime(apt.time),
					durationMinutes,
				);
				if (
					isMarkedOverbooked(apt.notes) ||
					activeIntervals.length + 1 > capacityForInterval
				)
					result.add(apt.id);
				activeIntervals.push({ id: apt.id, end: endMinutes });
			}
		});
		return result;
	}, [baseDisplayAppointments, getMinCapacityForInterval]);

	const displayAppointments = React.useMemo(
		() =>
			baseDisplayAppointments.map((apt) => {
				const isOverbooked = overbookedAppointmentIds.has(apt.id);
				return apt.isOverbooked === isOverbooked
					? apt
					: { ...apt, isOverbooked };
			}),
		[baseDisplayAppointments, overbookedAppointmentIds],
	);

	const appointmentsByDate = React.useMemo(() => {
		const map = new Map<string, Appointment[]>();
		(displayAppointments || []).forEach((apt) => {
			const aptDate = parseAppointmentDate(apt.date);
			if (!aptDate) return;
			const dateKey = format(aptDate, "yyyy-MM-dd");
			if (!map.has(dateKey)) map.set(dateKey, []);
			map.get(dateKey)!.push(apt);
		});
		return map;
	}, [displayAppointments]);

	const getAppointmentsForDate = React.useCallback(
		(date: Date) => appointmentsByDate.get(format(date, "yyyy-MM-dd")) || [],
		[appointmentsByDate],
	);

	const getAppointmentsForSlot = React.useCallback(
		(date: Date, time: string) => {
			const dateAppointments = getAppointmentsForDate(date);
			const normalizedTime = time.substring(0, 5);
			const [targetHour, targetMin] = normalizedTime.split(":").map(Number);
			const targetMinutes = targetHour * 60 + targetMin;
			return dateAppointments.filter((apt) => {
				const aptTime = apt.time?.substring(0, 5) || "00:00";
				const [aptHour, aptMin] = aptTime.split(":").map(Number);
				const aptStartMinutes = aptHour * 60 + aptMin;
				const aptEndMinutes = aptStartMinutes + (apt.duration || 60);
				return (
					aptTime === normalizedTime ||
					(targetMinutes >= aptStartMinutes && targetMinutes < aptEndMinutes)
				);
			});
		},
		[getAppointmentsForDate],
	);

	const handleOptimisticUpdate = React.useCallback(
		(appointmentId: string, newDate: Date, newTime: string) => {
			const appointment = appointments.find((a) => a?.id === appointmentId);
			if (!appointment) return;
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

	const handleRevertUpdate = React.useCallback(
		() => setPendingOptimisticUpdate(null),
		[],
	);

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
		handleCancelOverCapacity: handleCancelOverCapacityDndKitFinal,
	} = useCalendarDragDndKit({
		onAppointmentReschedule,
		onOptimisticUpdate: handleOptimisticUpdate,
		onRevertUpdate: handleRevertUpdate,
		getAppointmentsForSlot,
		getMinCapacityForInterval,
	});

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
		: handleCancelOverCapacityDndKitFinal;

	React.useEffect(() => {
		const timer = setInterval(() => setCurrentTime(new Date()), 60000);
		return () => clearInterval(timer);
	}, []);

	React.useEffect(() => {
		if (
			pendingOptimisticUpdate &&
			!(dragState.savingAppointmentId || dragStateNative.savingAppointmentId) &&
			hasOptimisticUpdateSynced(appointments, pendingOptimisticUpdate)
		) {
			setPendingOptimisticUpdate(null);
		}
	}, [
		dragState.savingAppointmentId,
		dragStateNative.savingAppointmentId,
		appointments,
		pendingOptimisticUpdate,
	]);

	const navigateCalendar = React.useCallback(
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

	const getHeaderTitle = React.useCallback(() => {
		switch (viewType) {
			case "day":
				return format(currentDate, "d 'de' MMMM", { locale: ptBR });
			case "week": {
				const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
				const weekEnd = addDays(weekStart, 5);
				return weekStart.getMonth() === weekEnd.getMonth()
					? `${format(weekStart, "d")} - ${format(weekEnd, "d 'de' MMMM", { locale: ptBR })}`
					: `${format(weekStart, "d 'de' MMM", { locale: ptBR })} - ${format(weekEnd, "d 'de' MMM", { locale: ptBR })}`;
			}
			case "month":
				return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
			default:
				return "";
		}
	}, [viewType, currentDate]);

	const getStatusColor = React.useCallback(
		(status: string, isOverCapacity = false) => {
			if (isOverCapacity)
				return "bg-gradient-to-br from-red-600 to-rose-700 border-red-400 shadow-red-500/40 ring-2 ring-red-400/50 ring-offset-1";
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

	const getDaySchedule = React.useCallback((date: Date) => {
		const dayOfWeek = date.getDay();
		if (dayOfWeek === 0) return null; // Domingo fechado
		if (dayOfWeek === 6) return { open: 7, close: 13 }; // Sábado 7h-13h
		return { open: 7, close: 21 }; // Seg-Sex 7h-21h
	}, []);

	const checkTimeBlocked = React.useCallback(
		(date: Date, time: string) => {
			const schedule = getDaySchedule(date);
			if (!schedule) return { blocked: true, reason: "Fora do horário" };
			const t = timeToMinutes(time);
			if (t < schedule.open * 60 || t >= schedule.close * 60)
				return { blocked: true, reason: "Fora do horário" };
			return { blocked: false };
		},
		[getDaySchedule],
	);

	const isDayClosedForDate = React.useCallback(
		(date: Date) => getDaySchedule(date) === null,
		[getDaySchedule],
	);

	const isTimeBlocked = React.useCallback(
		(time: string) => checkTimeBlocked(currentDate, time).blocked,
		[checkTimeBlocked, currentDate],
	);

	const getBlockReason = React.useCallback(
		(time: string) => checkTimeBlocked(currentDate, time).reason,
		[checkTimeBlocked, currentDate],
	);

	const isOverCapacity = React.useCallback(
		(apt: { id: string }) => overbookedAppointmentIds.has(apt.id),
		[overbookedAppointmentIds],
	);

	const memoizedTimeSlots = React.useMemo(
		() => generateTimeSlots(currentDate),
		[currentDate],
	);
	const weekTimeSlots = React.useMemo(
		() => generateTimeSlots(currentDate),
		[currentDate],
	);

	const currentTimePosition = React.useMemo(() => {
		const hours = currentTime.getHours();
		const minutes = currentTime.getMinutes();
		const totalMinutesFromStart = hours * 60 + minutes - 7 * 60;
		return (totalMinutesFromStart / (17 * 60)) * 100;
	}, [currentTime]);

	return (
		<>
			{rescheduleSuccessMessage && (
				<div className="sr-only" role="status" aria-live="polite">
					{rescheduleSuccessMessage}
				</div>
			)}
			<Card
				className="flex flex-col border-none shadow-premium-lg h-full flex-1 min-h-0 bg-slate-50 dark:bg-slate-950/20"
				role="region"
			>
				<CardContent className="p-0 flex flex-col h-full">
					<div className="z-[45] flex-shrink-0 sticky top-0 px-4 py-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/50 shadow-premium-sm transition-all duration-300">
						<div className="flex flex-wrap items-center justify-between gap-4 max-w-[1800px] mx-auto">
							<div className="flex items-center gap-4">
								<div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200/30 shadow-inner">
									<Button
										variant="ghost"
										size="icon"
										onClick={() => navigateCalendar("prev")}
										className="h-8 w-8 rounded-lg hover:bg-white shadow-none p-0"
									>
										<ChevronLeft className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => navigateCalendar("next")}
										className="h-8 w-8 rounded-lg hover:bg-white shadow-none p-0"
									>
										<ChevronRight className="h-4 w-4" />
									</Button>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={() => onDateChange(new Date())}
									className="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border-blue-100 bg-white/50 hover:bg-blue-50 shadow-sm"
								>
									Hoje
								</Button>
								<h2 className="font-serif text-xl md:text-2xl text-blue-950 dark:text-blue-50 tracking-tight capitalize">
									{getHeaderTitle()}
								</h2>
							</div>
							<div className="flex items-center gap-3">
								<div className="relative group" ref={patientSearchRef}>
									{patientFilter ? (
										<Button
											variant="outline"
											size="sm"
											onClick={() => onPatientFilterChange?.(null)}
											className="h-9 px-3 rounded-xl gap-2 border-blue-200 bg-blue-50 text-blue-700"
										>
											<Search className="w-3.5 h-3.5" />
											<span className="text-xs font-bold truncate max-w-[120px]">
												{patientFilter}
											</span>
											<X className="w-3.5 h-3.5 p-0.5 rounded-full bg-blue-200" />
										</Button>
									) : (
										<div className="relative">
											<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
											<input
												type="text"
												placeholder="Pesquisar paciente..."
												value={patientSearchQuery}
												onChange={(e) => {
													setPatientSearchQuery(e.target.value);
													setPatientSearchOpen(true);
												}}
												onFocus={() => setPatientSearchOpen(true)}
												className="h-9 w-[200px] lg:w-[240px] pl-10 pr-4 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none shadow-inner"
											/>
										</div>
									)}
									<AnimatePresence>
										{patientSearchOpen && !patientFilter && (
											<motion.div
												initial={{ opacity: 0, y: 10, scale: 0.95 }}
												animate={{ opacity: 1, y: 0, scale: 1 }}
												exit={{ opacity: 0, scale: 0.95 }}
												className="absolute top-full right-0 mt-2 w-[320px] max-h-[400px] overflow-hidden bg-white/95 backdrop-blur-xl border border-blue-100/50 rounded-2xl shadow-premium-xl z-[60]"
											>
												<div className="overflow-y-auto max-h-[340px]">
													{patientSuggestions.map((p) => (
														<button
															key={p.id}
															onClick={() => {
																onPatientFilterChange?.(p.name);
																setPatientSearchQuery("");
																setPatientSearchOpen(false);
															}}
															className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-all flex items-center gap-3 border-b border-slate-100 last:border-0 group/item"
														>
															<div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
																<span className="text-xs font-black text-blue-700">
																	{p.name.charAt(0).toUpperCase()}
																</span>
															</div>
															<span className="text-sm font-bold text-slate-900 truncate group-hover/item:text-blue-600">
																{p.name}
															</span>
														</button>
													))}
												</div>
											</motion.div>
										)}
									</AnimatePresence>
								</div>
								<div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/30">
									{(["day", "week", "month"] as CalendarViewType[]).map(
										(type) => (
											<button
												key={type}
												onClick={() => onViewTypeChange(type)}
												className={cn(
													"px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300",
													viewType === type
														? "bg-white text-blue-600 shadow-premium-sm"
														: "text-slate-500 hover:text-slate-900",
												)}
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
								{onCreateAppointment && (
									<Button
										onClick={onCreateAppointment}
										size="sm"
										className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 active:scale-95 transition-all gap-2"
									>
										<Plus className="w-4 h-4" />
										<span className="hidden xl:inline text-xs">Agendar</span>
									</Button>
								)}
							</div>
						</div>
					</div>
					<div
						className="flex-1 relative outline-none min-h-0 overflow-hidden"
						id="calendar-grid"
					>
						<AnimatePresence mode="wait">
							{viewType === "day" && (
								<motion.div
									key="day-view"
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: 10 }}
									className="h-full"
								>
									<CalendarDayView
										currentDate={currentDate}
										currentTime={currentTime}
										currentTimePosition={currentTimePosition}
										getAppointmentsForDate={getAppointmentsForDate}
										savingAppointmentId={dragStateNative.savingAppointmentId}
										timeSlots={memoizedTimeSlots}
										isDayClosed={isDayClosedForDate(currentDate)}
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
}
