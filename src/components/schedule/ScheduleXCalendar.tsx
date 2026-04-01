/**
 * ScheduleX Calendar - Modern Calendar Component
 *
 * Built with @schedule-x/react - a modern, high-performance calendar library.
 * Replaces the custom dnd-kit implementation with better UX and performance.
 *
 * @version 1.1.0 - Fixed React hooks order
 * @see https://schedule-x.dev/
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { createCalendar } from '@schedule-x/calendar';
import { createViewMonthGrid, createViewWeek, createViewDay } from '@schedule-x/calendar';
import { ScheduleXCalendar, useCalendarApp } from '@schedule-x/react';
import {
	createDragAndDropPlugin,
} from '@schedule-x/drag-and-drop';
import { ptBR } from 'date-fns/locale';
import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from 'date-fns';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarAppointmentCard } from './CalendarAppointmentCard';
import { CalendarSkeletonEnhanced } from './skeletons/CalendarSkeletonEnhanced';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment';
import { normalizeStatus, getStatusColor } from './shared/appointment-status';
import { Temporal } from 'temporal-polyfill';

// Import ScheduleX custom styles
import '@/styles/schedulex.css';

export type CalendarViewType = 'day' | 'week' | 'month';

interface ScheduleXCalendarWrapperProps {
	appointments: Appointment[];
	currentDate: Date;
	viewType: CalendarViewType;
	onDateChange: (date: Date) => void;
	onViewTypeChange: (type: CalendarViewType) => void;
	onTimeSlotClick: (date: Date, time: string) => void;
	onAppointmentClick?: (appointment: Appointment) => void;
	onEditAppointment?: (appointment: Appointment) => void;
	onStatusChange?: (id: string, status: string) => void;
	onAppointmentReschedule?: (
		appointment: Appointment,
		newDate: Date,
		newTime: string,
	) => Promise<void>;
	selectionMode?: boolean;
	selectedIds?: Set<string>;
	onToggleSelection?: (id: string) => void;
	savingAppointmentId?: string | null;
	dragState?: any;
	onDragStart?: (e: any, appointment: Appointment) => void;
	onDragEnd?: () => void;
}

/**
 * Convert FisioFlow Appointment to ScheduleX Event format
 */
const appointmentToEvent = (appointment: Appointment) => {
	const dateStr =
		appointment.date instanceof Date
			? format(appointment.date, 'yyyy-MM-dd')
			: String(appointment.date).substring(0, 10);

	const startTime = appointment.time || '00:00';
	const [hours, minutes] = startTime.split(':').map(Number);

	const startDateTime = new Date(dateStr);
	startDateTime.setHours(hours || 0, minutes || 0, 0, 0);

	// Calculate end time
	const duration = appointment.duration || 60;
	const endDateTime = new Date(startDateTime);
	endDateTime.setMinutes(endDateTime.getMinutes() + duration);

	const normalizedStatus = normalizeStatus(appointment.status || 'agendado');

	// Convert to Temporal.ZonedDateTime for ScheduleX
	const startTemporal = Temporal.ZonedDateTime.from({
		year: startDateTime.getFullYear(),
		month: startDateTime.getMonth() + 1,
		day: startDateTime.getDate(),
		hour: startDateTime.getHours(),
		minute: startDateTime.getMinutes(),
		timeZone: 'America/Sao_Paulo',
	});

	const endTemporal = Temporal.ZonedDateTime.from({
		year: endDateTime.getFullYear(),
		month: endDateTime.getMonth() + 1,
		day: endDateTime.getDate(),
		hour: endDateTime.getHours(),
		minute: endDateTime.getMinutes(),
		timeZone: 'America/Sao_Paulo',
	});

	return {
		id: appointment.id,
		title: appointment.patientName,
		start: startTemporal,
		end: endTemporal,
		// Custom properties for our card component
		appointment: appointment,
		status: normalizedStatus,
		statusColor: getStatusColor(normalizedStatus),
		cssClasses: [`calendar-card-${normalizedStatus}`],
	};
};

/**
 * Main ScheduleX Calendar Component Wrapper
 * Fixed: No conditional rendering based on hook results
 */
export const ScheduleXCalendarWrapper = (props: ScheduleXCalendarWrapperProps) => {
	const {
		appointments,
		currentDate,
		viewType,
		onDateChange,
		onViewTypeChange,
		onTimeSlotClick,
		onAppointmentClick,
		onEditAppointment,
		onStatusChange,
		onAppointmentReschedule,
		selectionMode = false,
		selectedIds = new Set(),
		onToggleSelection,
		savingAppointmentId,
		dragState,
		onDragStart,
		onDragEnd,
	} = props;

	// Convert appointments to ScheduleX events format
	const events = useMemo(() => {
		return appointments.map(appointmentToEvent);
	}, [appointments]);

	// State to track if calendar is ready
	const [isReady, setIsReady] = useState(false);

	// Create calendar app instance - MUST be called unconditionally
	const calendarApp = useCalendarApp(() => {
		// Drag and drop plugin
		const dndPlugin = createDragAndDropPlugin({
			// Configure drag behavior
			onDrop: async (eventId: string, newTime: string) => {
				const appointment = appointments.find((a) => a.id === eventId);
				if (!appointment || !onAppointmentReschedule) return;

				// Parse the new time from ScheduleX format
				const [datePart, timePart] = newTime.split(' ');
				const newDate = new Date(datePart);

				try {
					await onAppointmentReschedule(appointment, newDate, timePart);
				} catch (error) {
					console.error('Failed to reschedule:', error);
				}
			},
		});

		// Convert currentDate to Temporal.PlainDate
		const currentTemporal = Temporal.PlainDate.from({
			year: currentDate.getFullYear(),
			month: currentDate.getMonth() + 1,
			day: currentDate.getDate(),
		});

		// View configuration based on viewType prop
		let view;
		switch (viewType) {
			case 'month':
				view = createViewMonthGrid();
				break;
			case 'week':
				view = createViewWeek();
				break;
			case 'day':
				view = createViewDay();
				break;
		}

		// Create calendar with plugins
		return createCalendar({
			selectedDate: currentTemporal,
			views: [view],
			events,
			plugins: [dndPlugin],
			callbacks: {
				onDateUpdate: (date: Temporal.PlainDate) => {
					const newDate = new Date(
						date.year,
						date.month - 1,
						date.day
					);
					onDateChange(newDate);
				},
				onEventClick: (eventId: string) => {
					const appointment = appointments.find((a) => a.id === eventId);
					if (appointment) {
						onAppointmentClick?.(appointment);
					}
				},
				onSelectedDateUpdate: (date: Temporal.PlainDate) => {
					// Handle date selection from calendar
					if (onTimeSlotClick) {
						const newDate = new Date(
							date.year,
							date.month - 1,
							date.day
						);
						const timeStr = format(newDate, 'HH:mm');
						onTimeSlotClick(newDate, timeStr);
					}
				},
			},
			customComponents: {
				eventComponent: ({ event }: any) => {
					const appointment: Appointment = event.appointment;
					const isSelected = selectedIds.has(appointment.id);
					const isSaving = savingAppointmentId === appointment.id;

					// Convert Temporal to Date for formatting
					const startDate = new Date(
						event.start.year,
						event.start.month - 1,
						event.start.day,
						event.start.hour,
						event.start.minute
					);
					const endDate = new Date(
						event.end.year,
						event.end.month - 1,
						event.end.day,
						event.end.hour,
						event.end.minute
					);

					return (
						<CalendarAppointmentCard
							ref={null as any}
							patientName={appointment.patientName}
							time={format(startDate, 'HH:mm')}
							endTime={format(endDate, 'HH:mm')}
							type={appointment.type}
							status={appointment.status}
							isDragging={dragState?.activeId === appointment.id}
							isSaving={isSaving}
							isSelected={isSelected}
							statusConfig={{
								color: event.statusColor,
								icon: null as any,
							}}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onEditAppointment?.(appointment);
							}}
							className={cn(
								'cursor-pointer',
								selectionMode && 'selectable',
								isSelected && 'ring-2 ring-primary'
							)}
						/>
					);
				},
			},
		});
	}, [
		events,
		viewType,
		currentDate,
		appointments,
		selectedIds,
		savingAppointmentId,
		dragState,
		onDateChange,
		onTimeSlotClick,
		onAppointmentClick,
		onEditAppointment,
		onAppointmentReschedule,
	]);

	// Mark as ready after calendar app is initialized
	useEffect(() => {
		if (calendarApp) {
			setIsReady(true);
		}
	}, [calendarApp]);

	// Navigation handlers
	const handlePrevious = useCallback(() => {
		let newDate: Date;
		switch (viewType) {
			case 'month':
				newDate = subMonths(currentDate, 1);
				break;
			case 'week':
				newDate = subWeeks(currentDate, 1);
				break;
			case 'day':
				newDate = subDays(currentDate, 1);
				break;
		}
		onDateChange(newDate);
	}, [currentDate, viewType, onDateChange]);

	const handleNext = useCallback(() => {
		let newDate: Date;
		switch (viewType) {
			case 'month':
				newDate = addMonths(currentDate, 1);
				break;
			case 'week':
				newDate = addWeeks(currentDate, 1);
				break;
			case 'day':
				newDate = addDays(currentDate, 1);
				break;
		}
		onDateChange(newDate);
	}, [currentDate, viewType, onDateChange]);

	const handleToday = useCallback(() => {
		onDateChange(new Date());
	}, [onDateChange]);

	// Render header
	const renderHeader = () => (
		<motion.div
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			className="flex items-center justify-between mb-4 px-2"
		>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={handlePrevious}
					className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md border border-slate-200 bg-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
				>
					<ChevronLeft className="h-4 w-4" />
				</button>
				<button
					type="button"
					onClick={handleToday}
					className="h-8 px-3 inline-flex items-center justify-center rounded-md border border-slate-200 bg-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 text-sm font-medium"
				>
					Hoje
				</button>
				<button
					type="button"
					onClick={handleNext}
					className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md border border-slate-200 bg-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
				>
					<ChevronRight className="h-4 w-4" />
				</button>
			</div>

			<h2 className="text-lg font-semibold">
				{format(currentDate, 'MMMM yyyy', { locale: ptBR })}
			</h2>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => onViewTypeChange('day')}
					className={`h-8 px-3 inline-flex items-center justify-center rounded-md text-sm font-medium ${
						viewType === 'day'
							? 'bg-primary text-primary-foreground'
							: 'border border-slate-200 bg-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
					}`}
				>
					Dia
				</button>
				<button
					type="button"
					onClick={() => onViewTypeChange('week')}
					className={`h-8 px-3 inline-flex items-center justify-center rounded-md text-sm font-medium ${
						viewType === 'week'
							? 'bg-primary text-primary-foreground'
							: 'border border-slate-200 bg-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
					}`}
				>
					Semana
				</button>
				<button
					type="button"
					onClick={() => onViewTypeChange('month')}
					className={`h-8 px-3 inline-flex items-center justify-center rounded-md text-sm font-medium ${
						viewType === 'month'
							? 'bg-primary text-primary-foreground'
							: 'border border-slate-200 bg-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
					}`}
				>
					Mês
				</button>
			</div>
		</motion.div>
	);

	return (
		<div className="h-full flex flex-col bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
			{renderHeader()}

			{/* ScheduleX Calendar Component - Always render, no conditional */}
			<div
				className="flex-1 schedulex-calendar-wrapper"
				style={{
					minHeight: '600px',
					'--sx-primary-color': 'rgb(59, 130, 246)',
					'--sx-bg-primary': 'rgb(248, 250, 252)',
					'--sx-text-primary': 'rgb(15, 23, 42)',
				} as React.CSSProperties}
			>
				{isReady && calendarApp ? (
					<ScheduleXCalendar calendarApp={calendarApp} />
				) : (
					<CalendarSkeletonEnhanced viewType={viewType} />
				)}
			</div>
		</div>
	);
};
