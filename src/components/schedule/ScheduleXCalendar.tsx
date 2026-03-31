/**
 * ScheduleX Calendar - Modern Calendar Component
 *
 * Built with @schedule-x/react - a modern, high-performance calendar library.
 * Replaces the custom dnd-kit implementation with better UX and performance.
 *
 * @version 1.0.0 - ScheduleX Migration
 * @see https://schedule-x.dev/
 */

import React, { useMemo, useCallback } from 'react';
import { createCalendar } from '@schedule-x/calendar';
import { createViewMonth } from '@schedule-x/calendar';
import { createViewWeek } from '@schedule-x/calendar';
import { createViewDay } from '@schedule-x/calendar';
import { ScheduleXCalendar, useCalendarApp } from '@schedule-x/react';
import {
	createDragAndDropPlugin,
} from '@schedule-x/drag-and-drop';
import { ptBR } from 'date-fns/locale';
import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from 'date-fns';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarAppointmentCard } from './CalendarAppointmentCard';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment';
import { normalizeStatus, getStatusColor } from './shared/appointment-status';

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

	return {
		id: appointment.id,
		title: appointment.patientName,
		start: startDateTime.toISOString(),
		end: endDateTime.toISOString(),
		// Custom properties for our card component
		appointment: appointment,
		status: normalizedStatus,
		statusColor: getStatusColor(normalizedStatus),
		cssClasses: [`calendar-card-${normalizedStatus}`],
	};
};

/**
 * Main ScheduleX Calendar Component Wrapper
 */
export const ScheduleXCalendarWrapper = React.memo<ScheduleXCalendarWrapperProps>(({
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
}) => {
	// Convert appointments to ScheduleX events format
	const events = useMemo(() => {
		return appointments.map(appointmentToEvent);
	}, [appointments]);

	// Create calendar app instance
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

		// View configuration based on viewType prop
		let view;
		switch (viewType) {
			case 'month':
				view = createViewMonth();
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
			view,
			events,
			selectedDate: currentDate,
			plugins: [dndPlugin],
			callbacks: {
				onDateUpdate: (date: Date) => {
					onDateChange(date);
				},
				onEventClick: (eventId: string) => {
					const appointment = appointments.find((a) => a.id === eventId);
					if (appointment) {
						onAppointmentClick?.(appointment);
					}
				},
				onSelectedDateUpdate: (date: Date) => {
					// Handle date selection from calendar
					if (onTimeSlotClick) {
						const timeStr = format(date, 'HH:mm');
						onTimeSlotClick(date, timeStr);
					}
				},
			},
			customComponents: {
				eventComponent: ({ event }: any) => {
					const appointment: Appointment = event.appointment;
					const isSelected = selectedIds.has(appointment.id);
					const isSaving = savingAppointmentId === appointment.id;

					return (
						<CalendarAppointmentCard
							ref={null as any}
							patientName={appointment.patientName}
							time={format(new Date(event.start), 'HH:mm')}
							endTime={format(new Date(event.end), 'HH:mm')}
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
				<Button
					variant="outline"
					size="sm"
					onClick={handlePrevious}
					className="h-8 w-8 p-0"
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={handleToday}
					className="h-8"
				>
					Hoje
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={handleNext}
					className="h-8 w-8 p-0"
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>

			<h2 className="text-lg font-semibold">
				{format(currentDate, 'MMMM yyyy', { locale: ptBR })}
			</h2>

			<div className="flex items-center gap-2">
				<Button
					variant={viewType === 'day' ? 'default' : 'outline'}
					size="sm"
					onClick={() => onViewTypeChange('day')}
					className="h-8"
				>
					Dia
				</Button>
				<Button
					variant={viewType === 'week' ? 'default' : 'outline'}
					size="sm"
					onClick={() => onViewTypeChange('week')}
					className="h-8"
				>
					Semana
				</Button>
				<Button
					variant={viewType === 'month' ? 'default' : 'outline'}
					size="sm"
					onClick={() => onViewTypeChange('month')}
					className="h-8"
				>
					Mês
				</Button>
			</div>
		</motion.div>
	);

	return (
		<div className="h-full flex flex-col bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
			{renderHeader()}

			{/* ScheduleX Calendar Component */}
			<div
				className="flex-1 schedulex-calendar-wrapper"
				style={{
					minHeight: '600px',
					'--sx-primary-color': 'rgb(59, 130, 246)',
					'--sx-bg-primary': 'rgb(248, 250, 252)',
					'--sx-text-primary': 'rgb(15, 23, 42)',
				} as React.CSSProperties}
			>
				{calendarApp && (
					<ScheduleXCalendar
						calendarApp={calendarApp}
						customComponents={{}}
					/>
				)}
			</div>
		</div>
	);
});

ScheduleXCalendarWrapper.displayName = 'ScheduleXCalendarWrapper';
