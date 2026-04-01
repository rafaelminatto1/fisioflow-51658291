/**
 * ScheduleXAppointmentCard
 *
 * Card de agendamento simplificado para uso com @schedule-x/react.
 * Sem props de dnd-kit — o ScheduleX gerencia drag & drop internamente.
 */

import { format } from "date-fns";
import type React from "react";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/appointment";
import { AppointmentContextMenu } from "./AppointmentContextMenu";
import { getStatusColor, normalizeStatus } from "./shared/appointment-status";
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
	const color = getStatusColor(normalizedStatus);

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
					"h-full w-full flex flex-col gap-0.5 px-2 py-1 text-xs overflow-hidden rounded-md",
					"cursor-pointer select-none outline-none",
					"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
					selectionMode && "cursor-pointer",
					isSelected && "ring-2 ring-primary ring-offset-1",
				)}
			>
				{/* Hora */}
				<span className="font-semibold leading-tight opacity-80 shrink-0">
					{time}
					{endTime && endTime !== time && (
						<span className="font-normal"> – {endTime}</span>
					)}
				</span>

				{/* Nome do paciente */}
				<span className="font-bold leading-tight line-clamp-2 break-words">
					{appointment.patientName}
				</span>

				{/* Tipo de atendimento (compact) */}
				{appointment.type && (
					<span className="opacity-70 leading-tight truncate shrink-0">
						{appointment.type}
					</span>
				)}
			</div>
		</AppointmentContextMenu>
	);
}
