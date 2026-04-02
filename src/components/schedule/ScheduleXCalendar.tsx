/**
 * ScheduleXCalendar — Wrapper para @schedule-x/react v3.7.3
 * Versão de Diagnóstico - Sem Plugins (Apenas Core)
 */

import { useState, useMemo, useEffect, useOptimistic, useTransition, useRef, useLayoutEffect } from "react";
import { createCalendar, createViewDay, createViewMonthGrid, createViewWeek } from "@schedule-x/calendar";
import { ScheduleXCalendar } from "@schedule-x/react";
import "@schedule-x/theme-default/dist/index.css";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
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

const VIEW_MAP: Record<ViewType, string> = {
	day: "day",
	week: "week",
	month: "month-grid",
};

/**
 * Componente de Evento Customizado (Ultra-Simples para Diagnóstico)
 */
const CustomEventCard = ({ calendarEvent }: { calendarEvent: any }) => {
	return (
		<div className="w-full h-full bg-blue-500 text-white p-1 rounded text-[10px] font-bold overflow-hidden border border-blue-600">
			{calendarEvent.title}
		</div>
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

	const containerRef = useRef<HTMLDivElement>(null);
	const calendarInstance = useRef<any>(null);
	const propsRef = useRef(props);
	useEffect(() => { propsRef.current = props; }, [props]);

	// React 19: Optimistic UI
	const [optimisticAppointments] = useOptimistic(appointments);

	// Montagem Vanilla SEM PLUGINS para isolar erro Temporal
	useLayoutEffect(() => {
		if (!containerRef.current || typeof window === "undefined") return;

		try {
			if (calendarInstance.current) {
				calendarInstance.current.destroy();
			}
		} catch (e) {}

		try {
			const calendar = createCalendar({
				views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
				defaultView: VIEW_MAP[viewType] || "week",
				locale: "pt-BR",
				events: [], // Iniciar vazio
				dayBoundaries: { start: "07:00", end: "21:00" },
			});

			calendar.render(containerRef.current);
			calendarInstance.current = calendar;
		} catch (err) {
			console.error("[ScheduleX] Erro no core render:", err);
		}

		return () => {
			if (calendarInstance.current) {
				try { calendarInstance.current.destroy(); } catch (e) {}
			}
		};
	}, [viewType]); 

	// Sincronizar Dados e Data
	useEffect(() => {
		const calendar = calendarInstance.current;
		if (!calendar) return;

		const sxEvents = optimisticAppointments
			.filter(a => !!a)
			.map(a => {
				const start = String(a.start_time || "").replace('T', ' ').substring(0, 16);
				const end = String(a.end_time || "").replace('T', ' ').substring(0, 16);
				if (!start || !end) return null;
				return { id: String(a.id), title: a.patient_name || "Consulta", start, end };
			})
			.filter(Boolean);

		try {
			if (calendar.eventsService) calendar.eventsService.set(sxEvents);
			else if (calendar.events) calendar.events.set(sxEvents);
		} catch (e) {
			console.warn("[ScheduleX] Erro sync events:", e);
		}
	}, [optimisticAppointments]);

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
					<div ref={containerRef} className="h-full w-full" />
				</div>
			</div>
		</div>
	);
}
