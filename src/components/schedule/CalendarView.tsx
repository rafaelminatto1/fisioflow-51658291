/**
 * CalendarView - Main calendar component for appointment scheduling
 */

import React, { useState, useMemo, useEffect, useCallback, useRef, memo } from "react";
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
	isSameDay
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
	if (dateValue instanceof Date) return isNaN(dateValue.getTime()) ? null : dateValue;
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

const CalendarView = ({
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
	onClearFilters,
	totalAppointmentsCount,
	patientFilter,
	onPatientFilterChange,
}: CalendarViewProps) => {
	const [patientSearchQuery, setPatientSearchQuery] = useState("");
	const [patientSearchOpen, setPatientSearchOpen] = useState(false);
	const patientSearchRef = useRef<HTMLDivElement>(null);

	const uniquePatients = useMemo(() => {
		const map = new Map<string, string>();
		for (const apt of appointments) {
			if (apt.patientName && apt.patientId) {
				map.set(apt.patientId, apt.patientName);
			}
		}
		return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
	}, [appointments]);

	const patientSuggestions = useMemo(() => {
		if (!patientSearchQuery.trim()) return uniquePatients;
		const q = patientSearchQuery.toLowerCase().trim();
		return uniquePatients.filter((p) => p.name.toLowerCase().includes(q));
	}, [uniquePatients, patientSearchQuery]);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (patientSearchRef.current && !patientSearchRef.current.contains(e.target as Node)) {
				setPatientSearchOpen(false);
			}
		};
		if (patientSearchOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [patientSearchOpen]);

	const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
	const [currentTime, setCurrentTime] = useState(new Date());
	const { getMinCapacityForInterval } = useScheduleCapacity();
	const { cardSize, heightScale } = useCardSize();

	const [pendingOptimisticUpdate, setPendingOptimisticUpdate] = useState<PendingOptimisticUpdate | null>(null);

	const baseDisplayAppointments = useMemo(() => {
		const base = applyOptimisticAppointmentOverlay(appointments, pendingOptimisticUpdate);
		return (base || []).filter((a): a is Appointment => a != null && typeof (a as Appointment).id === "string");
	}, [appointments, pendingOptimisticUpdate]);

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
				.filter((apt) => !NON_CAPACITY_STATUSES.has((apt.status || "").toLowerCase()))
				.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time) || a.id.localeCompare(b.id));
			const activeIntervals: Array<{ id: string; end: number }> = [];
			for (const apt of activeAppointments) {
				const aptDate = parseAppointmentDate(apt.date);
				if (!aptDate) continue;
				const startMinutes = timeToMinutes(apt.time);
				const durationMinutes = Math.max(1, apt.duration || 60);
				const endMinutes = startMinutes + durationMinutes;
				const normalizedTime = normalizeSlotTime(apt.time);
				for (let i = activeIntervals.length - 1; i >= 0; i--) {
					if (activeIntervals[i].end <= startMinutes) activeIntervals.splice(i, 1);
				}
				const capacityForInterval = getMinCapacityForInterval(aptDate.getDay(), normalizedTime, durationMinutes);
				if (isMarkedOverbooked(apt.notes) || activeIntervals.length + 1 > capacityForInterval) result.add(apt.id);
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

	const appointmentsByDate = useMemo(() => {
		const map = new Map<string, Appointment[]>();
		(displayAppointments || []).forEach((apt) => {
			if (!apt || !apt.date) return;
			const aptDate = parseAppointmentDate(apt.date);
			if (!aptDate) return;
			const dateKey = format(aptDate, "yyyy-MM-dd");
			if (!map.has(dateKey)) map.set(dateKey, []);
			map.get(dateKey)!.push(apt);
		});
		return map;
	}, [displayAppointments]);

	const getAppointmentsForDate = useCallback((date: Date) => {
		const dateKey = format(date, "yyyy-MM-dd");
		return appointmentsByDate.get(dateKey) || [];
	}, [appointmentsByDate]);

	const getAppointmentsForSlot = useCallback((date: Date, time: string) => {
		const dateAppointments = getAppointmentsForDate(date);
		const normalizedTime = time.substring(0, 5);
		const [targetHour, targetMin] = normalizedTime.split(":").map(Number);
		const targetMinutes = targetHour * 60 + targetMin;
		return dateAppointments.filter((apt) => {
			const aptTime = apt.time?.substring(0, 5) || "00:00";
			const [aptHour, aptMin] = aptTime.split(":").map(Number);
			const aptStartMinutes = aptHour * 60 + aptMin;
			const aptEndMinutes = aptStartMinutes + (apt.duration || 60);
			return aptTime === normalizedTime || (targetMinutes >= aptStartMinutes && targetMinutes < aptEndMinutes);
		});
	}, [getAppointmentsForDate]);

	const handleOptimisticUpdate = useCallback((appointmentId: string, newDate: Date, newTime: string) => {
		const safeAppointments = (appointments || []).filter((a): a is Appointment => a != null && typeof (a as Appointment).id === "string");
		const appointment = safeAppointments.find((a) => a.id === appointmentId);
		if (!appointment) return;
		setPendingOptimisticUpdate({
			id: appointmentId,
			originalDate: appointment.date,
			originalTime: appointment.time,
			targetDate: formatDateToLocalISO(newDate) as Appointment["date"],
			targetTime: newTime,
		});
	}, [appointments]);

	const handleRevertUpdate = useCallback(() => setPendingOptimisticUpdate(null), []);

	const {
		dragState: dragStateNative, dropTarget: dropTargetNative, showConfirmDialog: showConfirmNative,
		showOverCapacityDialog: showOverCapacityNative, pendingReschedule: pendingRescheduleNative,
		pendingOverCapacity: pendingOverCapacityNative, targetAppointments,
		handleDragStart: handleDragStartNative, handleDragEnd: handleDragEndNative,
		handleDragOver: handleDragOverNative, handleDragLeave: handleDragLeaveNative,
		handleDrop: handleDropNative, handleConfirmReschedule: handleConfirmNative,
		handleCancelReschedule: handleCancelNative, handleConfirmOverCapacity: handleConfirmOverCapacityNative,
		handleCancelOverCapacity: handleCancelOverCapacityNative,
	} = useCalendarDrag({
		onAppointmentReschedule, onOptimisticUpdate: handleOptimisticUpdate,
		onRevertUpdate: handleRevertUpdate, getAppointmentsForSlot, getMinCapacityForInterval,
	});

	const {
		dragState, dropTarget, showConfirmDialog: showConfirmDndKit, pendingReschedule: pendingRescheduleDndKit,
		handleDragStart: handleDragStartDndKit, handleDragOver: handleDragOverDndKit, handleDragEnd: handleDragEndDndKit,
		handleConfirmReschedule: handleConfirmDndKit, handleCancelReschedule: handleCancelDndKit,
		showOverCapacityDialog: showOverCapacityDndKit, pendingOverCapacity: pendingOverCapacityDndKit,
		handleConfirmOverCapacity: handleConfirmOverCapacityDndKit, handleCancelOverCapacity: handleCancelOverCapacityDndKit,
	} = useCalendarDragDndKit({
		onAppointmentReschedule, onOptimisticUpdate: handleOptimisticUpdate,
		onRevertUpdate: handleRevertUpdate, getAppointmentsForSlot, getMinCapacityForInterval,
	});

	const isConfirmDialogOpen = showConfirmNative || showConfirmDndKit;
	const isOverCapacityDialogOpen = showOverCapacityNative || showOverCapacityDndKit;
	const activePendingReschedule = pendingRescheduleNative || pendingRescheduleDndKit;
	const activePendingOverCapacity = pendingOverCapacityNative || pendingOverCapacityDndKit;

	const handleConfirmReschedule = showConfirmNative ? handleConfirmNative : handleConfirmDndKit;
	const handleCancelReschedule = showConfirmNative ? handleCancelNative : handleCancelDndKit;
	const handleConfirmOverCapacity = showOverCapacityNative ? handleConfirmOverCapacityNative : handleConfirmOverCapacityDndKit;
	const handleCancelOverCapacity = showOverCapacityNative ? handleCancelOverCapacityNative : handleCancelOverCapacityDndKit;

	useEffect(() => {
		const timer = setInterval(() => setCurrentTime(new Date()), 60000);
		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
		if (pendingOptimisticUpdate && !(dragState.savingAppointmentId || dragStateNative.savingAppointmentId) && hasOptimisticUpdateSynced(appointments, pendingOptimisticUpdate)) {
			setPendingOptimisticUpdate(null);
		}
	}, [dragState.savingAppointmentId, dragStateNative.savingAppointmentId, appointments, pendingOptimisticUpdate]);

	const navigateCalendar = useCallback((direction: "prev" | "next") => {
		switch (viewType) {
			case "day": onDateChange(direction === "prev" ? subDays(currentDate, 1) : addDays(currentDate, 1)); break;
			case "week": onDateChange(direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1)); break;
			case "month": onDateChange(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1)); break;
		}
	}, [viewType, currentDate, onDateChange]);

	const getHeaderTitle = useCallback(() => {
		switch (viewType) {
			case "day": return format(currentDate, "d 'de' MMMM", { locale: ptBR });
			case "week": {
				const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
				const weekEnd = addDays(weekStart, 5);
				return weekStart.getMonth() === weekEnd.getMonth()
					? `${format(weekStart, "d")} - ${format(weekEnd, "d 'de' MMMM", { locale: ptBR })}`
					: `${format(weekStart, "d 'de' MMM", { locale: ptBR })} - ${format(weekEnd, "d 'de' MMM", { locale: ptBR })}`;
			}
			case "month": return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
			default: return "";
		}
	}, [viewType, currentDate]);

	const getStatusColor = useCallback((status: string, isOverCapacity = false) => {
		if (isOverCapacity) return "bg-gradient-to-br from-red-600 to-rose-700 border-red-400 shadow-red-500/40 ring-2 ring-red-400/50 ring-offset-1";
		const s = status.toLowerCase();
		switch (s) {
			case "presenca_confirmada": return "bg-gradient-to-br from-blue-900 to-blue-950 border-blue-800 shadow-blue-900/30";
			case "agendado": return "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400 shadow-blue-500/30";
			case "atendido": return "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 shadow-emerald-500/30";
			case "avaliacao": return "bg-gradient-to-br from-violet-500 to-violet-600 border-violet-400 shadow-violet-500/30";
			case "cancelado":
			case "nao_atendido_sem_cobranca": return "bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 shadow-slate-900/30";
			case "faltou": return "bg-gradient-to-br from-red-500 to-red-600 border-red-400 shadow-red-500/30";
			case "faltou_com_aviso": return "bg-gradient-to-br from-teal-400 to-teal-500 border-teal-300 shadow-teal-400/30";
			case "faltou_sem_aviso": return "bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400 shadow-orange-500/30";
			case "nao_atendido": return "bg-gradient-to-br from-gray-500 to-gray-600 border-gray-400 shadow-gray-500/30";
			case "remarcar": return "bg-gradient-to-br from-slate-400 to-slate-500 border-slate-300 shadow-slate-400/30";
			default: return "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400 shadow-blue-500/30";
		}
	}, []);

	const getDaySchedule = useCallback((date: Date) => {
		const dayOfWeek = date.getDay();
		if (dayOfWeek === 0) return null;
		const config = BUSINESS_HOURS.DEFAULT_SCHEDULE[dayOfWeek as keyof typeof BUSINESS_HOURS.DEFAULT_SCHEDULE];
		return { open: config.START, close: config.END };
	}, []);

	const checkTimeBlocked = useCallback((date: Date, time: string) => {
		const schedule = getDaySchedule(date);
		if (!schedule) return { blocked: true, reason: "Fora do horário" };
		const t = timeToMinutes(time);
		if (t < schedule.open * 60 || t >= schedule.close * 60) return { blocked: true, reason: "Fora do horário" };
		return { blocked: false };
	}, [getDaySchedule]);

	const isDayClosedForDate = useCallback((date: Date) => getDaySchedule(date) === null, [getDaySchedule]);

	const memoizedTimeSlots = useMemo(() => generateTimeSlots(currentDate), [currentDate]);
	const weekTimeSlots = useMemo(() => generateTimeSlots(currentDate), [currentDate]);

	const liveAnnouncement = rescheduleSuccessMessage ?? "";

	const currentTimePosition = useMemo(() => {
		const hours = currentTime.getHours();
		const minutes = currentTime.getMinutes();
		const totalMinutesFromStart = hours * 60 + minutes - 7 * 60; // Start from 7am
		const totalDayMinutes = 17 * 60; // 7am to 12am = 17 hours
		return (totalMinutesFromStart / totalDayMinutes) * 100;
	}, [currentTime]);

	return (
		<>
			{liveAnnouncement && <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{liveAnnouncement}</div>}
			<Card className="flex flex-col border-none shadow-premium-lg h-full flex-1 min-h-0 bg-slate-50 dark:bg-slate-950/20" role="region" aria-label="Calendário">
				<CardContent className="p-0 flex flex-col h-full">
					<div className="z-[45] flex-shrink-0 sticky top-0 px-4 py-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-premium-sm transition-all duration-300">
						<div className="flex flex-wrap items-center justify-between gap-4 max-w-[1800px] mx-auto">
							<div className="flex items-center gap-4">
								<div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/30 shadow-inner">
									<Button variant="ghost" size="icon" onClick={() => navigateCalendar("prev")} className="h-8 w-8 rounded-lg hover:bg-white shadow-none p-0"><ChevronLeft className="h-4 w-4" /></Button>
									<Button variant="ghost" size="icon" onClick={() => navigateCalendar("next")} className="h-8 w-8 rounded-lg hover:bg-white shadow-none p-0"><ChevronRight className="h-4 w-4" /></Button>
								</div>
								<Button variant="outline" size="sm" onClick={() => onDateChange(new Date())} className="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border-blue-100 bg-white/50 hover:bg-blue-50 shadow-sm">Hoje</Button>
								<h2 className="font-serif text-xl md:text-2xl text-blue-950 dark:text-blue-50 tracking-tight capitalize">{getHeaderTitle()}</h2>
								{totalAppointmentsCount !== undefined && (
									<div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 dark:bg-blue-500/20 rounded-full border border-blue-200/50 dark:border-blue-800/50">
										<Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
										<span className="text-[11px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest">{totalAppointmentsCount} Atendimentos</span>
									</div>
								)}
							</div>
							<div className="flex items-center gap-3">
								<div className="relative group" ref={patientSearchRef}>
									{patientFilter ? (
										<Button variant="outline" size="sm" onClick={() => { onPatientFilterChange?.(null); setPatientSearchQuery(""); }} className="h-9 px-3 rounded-xl gap-2 border-blue-200 bg-blue-50 text-blue-700"><Search className="w-3.5 h-3.5" /><span className="text-xs font-bold truncate max-w-[120px]">{patientFilter}</span><X className="w-3.5 h-3.5 p-0.5 rounded-full bg-blue-200" /></Button>
									) : (
										<div className="relative">
											<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
											<input type="text" placeholder="Pesquisar paciente..." value={patientSearchQuery} onChange={(e) => { setPatientSearchQuery(e.target.value); setPatientSearchOpen(true); }} onFocus={() => setPatientSearchOpen(true)} className="h-9 w-[200px] lg:w-[240px] pl-10 pr-4 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none transition-all shadow-inner" />
										</div>
									)}
									<AnimatePresence>
										{patientSearchOpen && !patientFilter && (
											<motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute top-full right-0 mt-2 w-[320px] max-h-[400px] overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-blue-100/50 rounded-2xl shadow-premium-xl z-[60]">
												<div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sugestões</span></div>
												<div className="overflow-y-auto max-h-[340px]">
													{patientSuggestions.length === 0 ? <div className="px-4 py-10 text-center"><p className="text-sm text-slate-400">Nenhum encontrado</p></div> : patientSuggestions.map((p) => (
														<button key={p.id} onClick={() => { onPatientFilterChange?.(p.name); setPatientSearchQuery(""); setPatientSearchOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-all flex items-center gap-3 border-b border-slate-100 last:border-0 group/item">
															<div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0"><span className="text-xs font-black text-blue-700">{p.name.charAt(0).toUpperCase()}</span></div>
															<div className="flex flex-col min-w-0"><span className="text-sm font-bold text-slate-900 truncate group-hover/item:text-blue-600">{p.name}</span><span className="text-[10px] text-slate-400 uppercase">Paciente Ativo</span></div>
														</button>
													))}
												</div>
											</motion.div>
										)}
									</AnimatePresence>
								</div>
								<div className="flex items-center bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/30 shadow-inner">
									<Link to="/agenda/settings"><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg transition-all"><SettingsIcon className="w-4 h-4 text-slate-500" /></Button></Link>
									{onToggleSelectionMode && <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg transition-all", selectionMode ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-slate-500 hover:bg-white")} onClick={onToggleSelectionMode} title="Modo Seleção"><CheckSquare className="h-4 w-4" /></Button>}
								</div>
								<div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/30">
									{(["day", "week", "month"] as CalendarViewType[]).map((type) => (
										<button key={type} onClick={() => onViewTypeChange(type)} className={cn("px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300", viewType === type ? "bg-white text-blue-600 shadow-premium-sm" : "text-slate-500 hover:text-slate-900")}>{type === "day" ? "Dia" : type === "week" ? "Semana" : "Mês"}</button>
									))}
								</div>
								{onCreateAppointment && <Button onClick={onCreateAppointment} size="sm" className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 active:scale-95 transition-all gap-2"><Plus className="w-4 h-4" /><span className="hidden xl:inline text-xs">Agendar</span></Button>}
							</div>
						</div>
					</div>
					<div className="flex-1 relative outline-none min-h-0 overflow-hidden" id="calendar-grid">
						<AnimatePresence mode="wait">
							{viewType === "day" && (
								<motion.div key="day-view" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="h-full">
									<CalendarDayView
										currentDate={currentDate} currentTime={currentTime} currentTimePosition={currentTimePosition}
										getAppointmentsForDate={getAppointmentsForDate} savingAppointmentId={dragStateNative.savingAppointmentId}
										timeSlots={memoizedTimeSlots} isDayClosed={isDayClosed} onTimeSlotClick={onTimeSlotClick}
										onEditAppointment={onEditAppointment} onDeleteAppointment={onDeleteAppointment}
										onDuplicateAppointment={onDuplicateAppointment} onStatusChange={onStatusChange}
										onAppointmentReschedule={onAppointmentReschedule} dragState={dragStateNative}
										dropTarget={dropTargetNative} targetAppointments={targetAppointments}
										handleDragStart={handleDragStartNative} handleDragEnd={handleDragEndNative}
										handleDragOver={handleDragOverNative} handleDragLeave={handleDragLeaveNative}
										handleDrop={handleDropNative} isTimeBlocked={isTimeBlocked}
										getBlockReason={getBlockReason} _getStatusColor={getStatusColor}
										isOverCapacity={isOverCapacity} openPopoverId={openPopoverId}
										setOpenPopoverId={setOpenPopoverId} selectionMode={selectionMode}
										selectedIds={selectedIds} onToggleSelection={onToggleSelection}
									/>
								</motion.div>
							)}
							{viewType === "week" && (
								<motion.div key="week-view" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="h-full">
									<CalendarWeekViewDndKit
										currentDate={currentDate} appointments={displayAppointments}
										savingAppointmentId={dragState.savingAppointmentId} timeSlots={weekTimeSlots}
										onTimeSlotClick={onTimeSlotClick} onEditAppointment={onEditAppointment}
										onDeleteAppointment={onDeleteAppointment} onDuplicateAppointment={onDuplicateAppointment}
										onStatusChange={onStatusChange} onAppointmentReschedule={onAppointmentReschedule}
										checkTimeBlocked={checkTimeBlocked} isDayClosedForDate={isDayClosedForDate}
										openPopoverId={openPopoverId} setOpenPopoverId={setOpenPopoverId}
										dragState={dragState} dropTarget={dropTarget}
										handleDragStart={handleDragStartDndKit} handleDragOver={handleDragOverDndKit}
										handleDragEnd={handleDragEndDndKit} selectionMode={selectionMode}
										selectedIds={selectedIds} onToggleSelection={onToggleSelection}
									/>
								</motion.div>
							)}
							{viewType === "month" && (
								<motion.div key="month-view" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="h-full">
									<CalendarMonthView
										currentDate={currentDate} appointments={displayAppointments}
										onDateChange={onDateChange} onTimeSlotClick={onTimeSlotClick}
										onEditAppointment={onEditAppointment} onDeleteAppointment={onDeleteAppointment}
										onDuplicateAppointment={onDuplicateAppointment} onStatusChange={onStatusChange}
										getAppointmentsForDate={getAppointmentsForDate} getStatusColor={getStatusColor}
										isOverCapacity={isOverCapacity} openPopoverId={openPopoverId}
										setOpenPopoverId={setOpenPopoverId}
									/>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</CardContent>
			</Card>
			<RescheduleConfirmDialog open={isConfirmDialogOpen} onOpenChange={(open) => !open && handleCancelReschedule()} appointment={activePendingReschedule?.appointment || null} newDate={activePendingReschedule?.newDate || null} newTime={activePendingReschedule?.newTime || null} onConfirm={handleConfirmReschedule} />
			<RescheduleCapacityDialog open={isOverCapacityDialogOpen} onOpenChange={(open) => !open && handleCancelOverCapacity()} appointment={activePendingOverCapacity?.appointment || null} newDate={activePendingOverCapacity?.newDate || null} newTime={activePendingOverCapacity?.newTime || null} currentCount={activePendingOverCapacity?.currentCount || 0} maxCapacity={activePendingOverCapacity?.maxCapacity || 0} onConfirm={handleConfirmOverCapacity} onCancel={handleCancelOverCapacity} />
		</>
	);
};

export default CalendarView;
