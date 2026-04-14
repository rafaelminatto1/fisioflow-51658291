/**
 * ScheduleXAppointmentCard
 *
 * Card de agendamento simplificado para uso com @schedule-x/react.
 * Sem props de dnd-kit — o ScheduleX gerencia drag & drop internamente.
 */

import type React from "react";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/appointment";
import { AppointmentContextMenu } from "./AppointmentContextMenu";
import {
	normalizeStatus,
	getCalendarCardColors,
} from "./shared/appointment-status";
import { calculateEndTime, normalizeTime } from "./shared/utils";

interface ScheduleXAppointmentCardProps {
	appointment: Appointment;
	onEditAppointment?: (appointment: Appointment) => void;
	onDeleteAppointment?: (appointment: Appointment) => void;
	onStatusChange?: (id: string, status: string) => void;
	selectionMode?: boolean;
	isSelected?: boolean;
	onToggleSelection?: (id: string) => void;
}

export function ScheduleXAppointmentCard({
	appointment,
	onEditAppointment,
	onDeleteAppointment,
	onStatusChange,
	selectionMode = false,
	isSelected = false,
	onToggleSelection,
}: ScheduleXAppointmentCardProps) {
	const { getStatusConfig } = useStatusConfig();
	const normalizedStatus = normalizeStatus(appointment.status || "agendado");
	const statusConfig = getStatusConfig(normalizedStatus);
	const duration = appointment.duration || 60;
	const time = normalizeTime(appointment.time);
	const endTime = calculateEndTime(time, duration);
	const colors =
		statusConfig.calendarCardColors || getCalendarCardColors(normalizedStatus);

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (selectionMode && onToggleSelection) {
			onToggleSelection(appointment.id);
			return;
		}
		onEditAppointment?.(appointment);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onEditAppointment?.(appointment);
		}
	};

	return (
		<AppointmentContextMenu
			appointment={appointment}
			onStatusChange={(status) => onStatusChange?.(appointment.id, status)}
			onEdit={() => onEditAppointment?.(appointment)}
			onDelete={() => onDeleteAppointment?.(appointment)}
		>
			<div
				role="button"
				tabIndex={0}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				aria-label={`${appointment.patientName} - ${time} - ${statusConfig.label}`}
				aria-selected={isSelected}
				className={cn(
					"h-full w-full flex flex-col gap-0.5 px-2 py-1.5 text-xs overflow-hidden rounded-md border-l-4 shadow-sm transition-all",
					"cursor-pointer select-none outline-none",
					"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
					isSelected && "ring-2 ring-primary ring-offset-1",
					normalizedStatus === "cancelado" && "opacity-70",
				)}
				style={{
					backgroundColor: colors.background,
					borderLeftColor: colors.accent,
					color: colors.text,
				}}
			>
				<div className="flex items-center justify-between gap-1 mb-0.5">
					<span className="font-bold text-[10px] uppercase tracking-wider opacity-70">
						{time}
						{endTime && endTime !== time && (
							<span className="font-normal"> – {endTime}</span>
						)}
					</span>
				</div>

				<span className="font-bold leading-tight line-clamp-2 break-words text-xs">
					{appointment.patientName}
				</span>

				{appointment.type && (
					<span className="text-[10px] font-medium opacity-60 uppercase tracking-tighter mt-auto">
						{appointment.type}
					</span>
				)}
			</div>
		</AppointmentContextMenu>
	);
}
