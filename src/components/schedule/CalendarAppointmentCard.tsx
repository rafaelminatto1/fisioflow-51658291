import React, { useState, forwardRef } from "react";
import { Appointment } from "@/types/appointment";
import {
	normalizeStatus,
	getCalendarCardColors,
} from "./shared/appointment-status";
import { cn } from "@/lib/utils";
import { MoreVertical } from "lucide-react";
import { AppointmentQuickView } from "./AppointmentQuickView";
import { AppointmentContextMenu } from "./AppointmentContextMenu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsTouch } from "@/hooks/use-touch";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { useReducedMotion } from "@/lib/accessibility/a11y-utils";
import { normalizeTime, calculateEndTime } from "./shared/utils";
import { isMarkedOverbooked } from "./shared/capacity";
import { AppointmentCard } from "@fisioflow/ui";

interface CalendarAppointmentCardProps {
	appointment: Appointment;
	style?: React.CSSProperties;
	isDraggable: boolean;
	isDragging: boolean;
	isSaving: boolean;
	onDragStart: (e: React.DragEvent, appointment: Appointment) => void;
	onDragEnd: () => void;
	onEditAppointment?: (appointment: Appointment) => void;
	onDeleteAppointment?: (appointment: Appointment) => void;
	onDuplicateAppointment?: (appointment: Appointment) => void;
	onStatusChange?: (id: string, status: string) => void;
	onOpenPopover: (id: string | null) => void;
	isPopoverOpen: boolean;
	onDragOver?: (e: React.DragEvent) => void;
	onDrop?: (e: React.DragEvent) => void;
	isDropTarget?: boolean;
	hideGhostWhenSiblings?: boolean;
	selectionMode?: boolean;
	isSelected?: boolean;
	onToggleSelection?: (id: string) => void;
	dragHandleOnly?: boolean;
	density?: "normal" | "compact";
	"data-appointment-popover-anchor"?: string;
}

const CalendarAppointmentCardBase = forwardRef<
	HTMLDivElement,
	CalendarAppointmentCardProps
>(
	(
		{
			appointment,
			style: styleProp,
			isDraggable,
			isDragging,
			isSaving,
			onDragStart: _onDragStart,
			onDragEnd,
			onEditAppointment,
			onDeleteAppointment,
			onDuplicateAppointment,
			onStatusChange,
			onOpenPopover,
			isPopoverOpen,
			onDragOver,
			onDrop,
			isDropTarget = false,
			hideGhostWhenSiblings = false,
			selectionMode = false,
			isSelected = false,
			onToggleSelection,
			dragHandleOnly: _dragHandleOnly = false,
			density = "normal",
			"data-appointment-popover-anchor": dataAnchor,
		},
		ref,
	) => {
		const style = styleProp || {};
		const isMobile = useIsMobile();
		const isTouch = useIsTouch();
		const reducedMotion = useReducedMotion();
		const [isHovered, setIsHovered] = useState(false);

		const { getStatusConfig: getSharedStatusConfig, getStatusColors } =
			useStatusConfig();
		const isCompact = density === "compact";
		const isOverbooked = isMarkedOverbooked(
			appointment.notes,
			appointment.isOverbooked,
		);
		const normalizedStatus = normalizeStatus(appointment.status || "agendado");
		const statusConfig = getSharedStatusConfig(normalizedStatus);
		const customColors = getStatusColors(normalizedStatus);
		const cardColors = isOverbooked
			? { accent: "#dc2626", background: "#fef2f2", text: "#7f1d1d" }
			: statusConfig.calendarCardColors ||
				getCalendarCardColors(normalizedStatus);

		const handleMouseEnter = () => setIsHovered(true);
		const handleMouseLeave = () => setIsHovered(false);

		const handleClick = (e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (selectionMode && onToggleSelection) {
				onToggleSelection(appointment.id);
				return;
			}
			if (isDragging) return;
			onOpenPopover(appointment.id);
		};

		const dragDuration = reducedMotion ? 0 : 0.15;
		const duration = appointment.duration || 60;
		const draggable = isDraggable && !selectionMode && !isTouch;

		const handleMoveToToday = () => {
			if (onAppointmentReschedule) {
				onAppointmentReschedule(appointment, new Date(), appointment.time);
			}
		};

		const cardContent = (
			<AppointmentContextMenu
				appointment={appointment}
				onStatusChange={(status) => onStatusChange?.(appointment.id, status)}
				onEdit={() => onEditAppointment?.(appointment)}
				onDelete={() => onDeleteAppointment?.(appointment)}
				onDuplicate={() => onDuplicateAppointment?.(appointment)}
				onMoveToToday={handleMoveToToday}
			>
				<AppointmentCard
					ref={ref}
					patientName={appointment.patientName}
					time={normalizeTime(appointment.time)}
					endTime={calculateEndTime(normalizeTime(appointment.time), duration)}
					type={appointment.type}
					status={normalizedStatus}
					isDragging={isDragging}
					isSaving={isSaving}
					isDropTarget={isDropTarget}
					isSelected={isSelected}
					compact={isCompact}
					statusConfig={{
						color: isOverbooked
							? "#dc2626"
							: customColors.color || cardColors.accent,
						icon: statusConfig.icon,
					}}
					data-appointment-popover-anchor={dataAnchor}
					layout={!reducedMotion}
					layoutId={isSaving ? `${appointment.id}-saving` : appointment.id}
					transition={{
						layout: reducedMotion
							? { duration: 0 }
							: { type: "spring", stiffness: 700, damping: 42 },
						opacity: { duration: reducedMotion ? 0 : 0.15 },
						scale: { duration: dragDuration },
						boxShadow: { duration: 0.15 },
					}}
					initial={reducedMotion ? false : { opacity: 0, scale: 0.98, y: 2 }}
					animate={{
						opacity: isDragging && hideGhostWhenSiblings ? 0 : 1,
						scale: reducedMotion ? 1 : isDragging ? 0.98 : 1,
						y: 0,
						boxShadow:
							isDragging || isHovered
								? "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)"
								: "0 1px 2px 0 rgba(0, 0, 0, 0.02)",
					}}
					whileTap={
						reducedMotion
							? undefined
							: {
									scale: isTouch ? 0.97 : 0.99,
									transition: { duration: 0.1 },
								}
					}
					draggable={false}
					onDragStart={undefined}
					onDragEnd={onDragEnd}
					onDragOver={(e: React.DragEvent) => {
						if (onDragOver && !selectionMode) {
							e.preventDefault();
							e.stopPropagation();
							// @ts-ignore
							e.dataTransfer.dropEffect = "move";
							onDragOver(e);
						}
					}}
					onDrop={(e: React.DragEvent) => {
						if (onDrop && !selectionMode) {
							e.preventDefault();
							e.stopPropagation();
							onDrop(e);
						}
					}}
					onMouseEnter={handleMouseEnter}
					onMouseLeave={handleMouseLeave}
					onClick={handleClick}
					className={cn(
						"absolute",
						draggable && "cursor-grab active:cursor-grabbing",
					)}
					style={{
						...style,
						pointerEvents:
							isDragging && hideGhostWhenSiblings ? "none" : undefined,
						borderRadius: "12px",
						backgroundColor: cardColors.background,
						borderLeft: `3px solid ${cardColors.accent}`,
						color: cardColors.text,
					}}
					tabIndex={0}
					role="button"
					aria-label={`${appointment.patientName} - ${normalizeTime(appointment.time)} - ${statusConfig.label}`}
				>
					{!isMobile && isHovered && !isDragging && !selectionMode && (
						<div className="absolute top-1 right-1 flex items-center gap-1 z-50">
							<button
								type="button"
								className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
								onClick={(e) => {
									e.stopPropagation();
									onEditAppointment?.(appointment);
								}}
							>
								<MoreVertical className="w-3.5 h-3.5 opacity-60" />
							</button>
						</div>
					)}
				</AppointmentCard>
			</AppointmentContextMenu>
		);

		if (selectionMode) return cardContent;

		return (
			<AppointmentQuickView
				appointment={appointment}
				open={isPopoverOpen}
				onOpenChange={(open) => {
					if (isDragging && open) return;
					onOpenPopover(open ? appointment.id : null);
				}}
				onEdit={
					onEditAppointment ? () => onEditAppointment(appointment) : undefined
				}
				onDelete={
					onDeleteAppointment
						? () => onDeleteAppointment(appointment)
						: undefined
				}
			>
				{cardContent}
			</AppointmentQuickView>
		);
	},
);

export const CalendarAppointmentCard = CalendarAppointmentCardBase;
CalendarAppointmentCard.displayName = "CalendarAppointmentCard";
