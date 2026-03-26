/**
 * Grid virtualizado para visualização semanal do calendário
 * Usa react-window para renderizar apenas slots visíveis
 * @module schedule/virtualization/VirtualWeekGrid
 */

// =====================================================================
// TYPES
// =====================================================================

import React, { memo, useMemo, useRef, useCallback, useState, useEffect } from "react";
import { List } from "react-window";
import { isSameDay } from "date-fns";
import { Appointment } from "@/types/appointment";
import type { CardSize } from "@/types/agenda";
import { cn } from "@/lib/utils";
import { parseAppointmentDate, normalizeTime } from "@/lib/calendar/utils";
import { BUSINESS_HOURS } from "@/lib/calendar/constants";
import { CalendarAppointmentCard } from "../CalendarAppointmentCard";
import { TimeSlotCell } from "../TimeSlotCell";
import { useCardSize } from "@/hooks/useCardSize";
import {
	calculateAppointmentCardHeight,
	calculateSlotHeightFromCardSize,
} from "@/lib/calendar/cardHeightCalculator";

interface VirtualWeekGridProps {
	/** Dias da semana para renderizar */
	weekDays: Date[];
	/** Lista de horários (slots) */
	timeSlots: string[];
	/** Agendamentos para exibir */
	appointments: Appointment[];
	/** ID do agendamento sendo salvo */
	savingAppointmentId?: string | null;
	/** Callback ao clicar em um slot */
	onTimeSlotClick?: (date: Date, time: string) => void;
	/** Callback de edição */
	onEditAppointment?: (appointment: Appointment) => void;
	/** Callback de exclusão */
	onDeleteAppointment?: (appointment: Appointment) => void;
	/** Callback de reagendamento via drag */
	onAppointmentReschedule?: (
		appointment: Appointment,
		newDate: Date,
		newTime: string,
	) => Promise<void>;
	/** Estado de drag */
	dragState?: { appointment: Appointment | null; isDragging: boolean };
	/** Alvo de drop */
	dropTarget?: { date: Date; time: string } | null;
	/** Handlers de drag */
	handleDragStart?: (e: React.DragEvent, appointment: Appointment) => void;
	handleDragEnd?: () => void;
	handleDragOver?: (e: React.DragEvent, date: Date, time: string) => void;
	handleDragLeave?: () => void;
	handleDrop?: (e: React.DragEvent, date: Date, time: string) => void;
	/** Verificar se horário está bloqueado */
	checkTimeBlocked?: (
		date: Date,
		time: string,
	) => { blocked: boolean; reason?: string };
	/** Verificar se dia está fechado */
	isDayClosedForDate?: (date: Date) => boolean;
	/** Popover state */
	openPopoverId?: string | null;
	setOpenPopoverId?: (id: string | null) => void;
	/** Seleção múltipla */
	selectionMode?: boolean;
	selectedIds?: Set<string>;
	onToggleSelection?: (id: string) => void;
}

interface ItemData {
	weekDays: Date[];
	appointments: Appointment[];
	savingAppointmentId?: string | null;
	timeSlots: string[];
	appointmentsByTimeSlot: Record<string, Appointment[]>;
	cardSize: string;
	heightScale: number;
	onTimeSlotClick?: (date: Date, time: string) => void;
	onEditAppointment?: (appointment: Appointment) => void;
	onDeleteAppointment?: (appointment: Appointment) => void;
	onAppointmentReschedule?: (
		appointment: Appointment,
		newDate: Date,
		newTime: string,
	) => Promise<void>;
	dragState?: { appointment: Appointment | null; isDragging: boolean };
	dropTarget?: { date: Date; time: string } | null;
	handleDragStart?: (e: React.DragEvent, appointment: Appointment) => void;
	handleDragEnd?: () => void;
	handleDragOver?: (e: React.DragEvent, date: Date, time: string) => void;
	handleDragLeave?: () => void;
	handleDrop?: (e: React.DragEvent, date: Date, time: string) => void;
	checkTimeBlocked?: (
		date: Date,
		time: string,
	) => { blocked: boolean; reason?: string };
	isDayClosedForDate?: (date: Date) => boolean;
	openPopoverId?: string | null;
	setOpenPopoverId?: (id: string | null) => void;
	selectionMode?: boolean;
	selectedIds?: Set<string>;
	onToggleSelection?: (id: string) => void;
}

// =====================================================================
// TIME SLOT ROW COMPONENT
// =====================================================================

type TimeSlotRowProps = ItemData & { index: number; style: React.CSSProperties };

const TimeSlotRow: React.FC<TimeSlotRowProps> = memo(
	({ index, style, weekDays, timeSlots, appointmentsByTimeSlot, ...props }) => {
		const time = timeSlots[index];

		if (!time) return null;

		const isHour = time.endsWith(":00");

		return (
			<div
				style={style}
				className="relative flex w-full border-b border-slate-100 dark:border-slate-800/50"
			>
				{/* Time Label */}
				<div
					className={cn(
						"w-[60px] flex-shrink-0 border-r border-slate-100 dark:border-slate-800 text-[11px] font-medium flex justify-end pr-2 pt-2 bg-white dark:bg-slate-950 sticky left-0 z-10",
						isHour
							? "text-slate-900 dark:text-slate-200 -mt-2.5"
							: "text-slate-300 dark:text-slate-600 hidden",
					)}
				>
					{isHour ? time : ""}
				</div>

				{/* Day Columns */}
				{weekDays.map((day, colIndex) => {
					const isClosed = props.isDayClosedForDate?.(day);
					const { blocked } = props.checkTimeBlocked?.(day, time) || {
						blocked: false,
					};
					const isDropTarget =
						props.dropTarget &&
						isSameDay(props.dropTarget.date, day) &&
						props.dropTarget.time === time;

					return (
						<TimeSlotCell
							key={`cell-${colIndex}-${index}`}
							day={day}
							time={time}
							rowIndex={index}
							colIndex={colIndex}
							isClosed={isClosed}
							isBlocked={blocked}
							isDropTarget={!!isDropTarget}
							onTimeSlotClick={props.onTimeSlotClick}
							handleDragOver={props.handleDragOver}
							handleDragLeave={props.handleDragLeave}
							handleDrop={props.handleDrop}
						/>
					);
				})}

				{/* Appointments for this time slot */}
				{appointmentsByTimeSlot[time]?.map((apt) => {
					const aptDate = parseAppointmentDate(apt.date);
					if (!aptDate) return null;

					const dayIndex = weekDays.findIndex((d) => isSameDay(d, aptDate));
					if (dayIndex === -1) return null;

					// Duration-based height calculation
					const duration = apt.duration || 60;
					const height = calculateAppointmentCardHeight(
						data.cardSize as CardSize,
						duration,
						data.heightScale,
					);

					// Calcular posicionamento
					const sameTimeAppointments = appointmentsByTimeSlot[time] || [];
					const aptIndex = sameTimeAppointments.findIndex(
						(a) => a.id === apt.id,
					);
					const count = sameTimeAppointments.length;

					const outerMargin = 4;
					const gap = 4;

					const appointmentStyle = {
						position: "absolute" as const,
						gridColumn: `${dayIndex + 2} / span 1`,
						gridRow: index + 1,
						height: `${height}px`,
						width: `calc((100% - ${(count + 1) * 4}px) / ${count})`,
						left: `calc(${outerMargin}px + ${aptIndex} * ((100% - ${(count + 1) * 4}px) / ${count} + ${gap}px))`,
						top: "0px",
						zIndex: 10 + aptIndex,
						marginLeft: "60px", // Compensar coluna de tempo
					};

					const isDraggable = !!props.onAppointmentReschedule;
					const isDraggingThis =
						props.dragState?.isDragging &&
						props.dragState.appointment?.id === apt.id;
					const isSaving = data.savingAppointmentId === apt.id;

					return (
						<div key={apt.id} style={appointmentStyle} className="absolute">
							<CalendarAppointmentCard
								appointment={apt}
								style={appointmentStyle}
								isDraggable={isDraggable}
								isDragging={isDraggingThis}
								isSaving={isSaving}
								onDragStart={props.handleDragStart}
								onDragEnd={props.handleDragEnd}
								onEditAppointment={props.onEditAppointment}
								onDeleteAppointment={props.onDeleteAppointment}
								onOpenPopover={props.setOpenPopoverId}
								isPopoverOpen={props.openPopoverId === apt.id}
								selectionMode={props.selectionMode}
								isSelected={props.selectedIds?.has(apt.id)}
								onToggleSelection={props.onToggleSelection}
							/>
						</div>
					);
				})}
			</div>
		);
	},
);

TimeSlotRow.displayName = "TimeSlotRow";

// =====================================================================
// MAIN COMPONENT
// =====================================================================

	export const VirtualWeekGrid: React.FC<VirtualWeekGridProps> = memo(
	({
		weekDays,
		timeSlots,
		appointments,
		savingAppointmentId,
		onTimeSlotClick,
		onEditAppointment,
		onDeleteAppointment,
		onAppointmentReschedule,
		dragState,
		dropTarget,
		handleDragStart,
		handleDragEnd,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		checkTimeBlocked,
		isDayClosedForDate,
		openPopoverId,
		setOpenPopoverId,
		selectionMode = false,
		selectedIds = new Set(),
		onToggleSelection,
	}) => {
		const listRef = useRef<any>(null);
		const { cardSize, heightScale } = useCardSize();
		const slotHeight = calculateSlotHeightFromCardSize(cardSize, heightScale);

		// Dynamic height calculation for virtual list
		const [containerHeight, setContainerHeight] = useState(600);

		useEffect(() => {
			const updateHeight = () => {
				// Calculate available height: viewport - header - footer - padding
				const headerHeight = 200; // Approximate header height
				const newHeight = window.innerHeight - headerHeight;
				setContainerHeight(Math.max(400, newHeight)); // Minimum 400px
			};

			updateHeight();
			window.addEventListener("resize", updateHeight);
			return () => window.removeEventListener("resize", updateHeight);
		}, []);

		// Agrupar appointments por time slot
		const appointmentsByTimeSlot = useMemo(() => {
			const result: Record<string, Appointment[]> = {};

			appointments.forEach((apt) => {
				const aptDate = parseAppointmentDate(apt.date);
				if (!aptDate) return;

				const dayIndex = weekDays.findIndex((d) => isSameDay(d, aptDate));
				if (dayIndex === -1) return;

				const time = normalizeTime(apt.time);
				const key = time;

				if (!result[key]) result[key] = [];
				result[key].push(apt);
			});

			return result;
		}, [appointments, weekDays]);

		// Preparar item data para react-window
		const itemData: ItemData = useMemo(
			() => ({
				weekDays,
				timeSlots,
				appointments,
				appointmentsByTimeSlot,
				savingAppointmentId,
				cardSize,
				heightScale,
				onTimeSlotClick,
				onEditAppointment,
				onDeleteAppointment,
				onAppointmentReschedule,
				dragState,
				dropTarget,
				handleDragStart,
				handleDragEnd,
				handleDragOver,
				handleDragLeave,
				handleDrop,
				checkTimeBlocked,
				isDayClosedForDate,
				openPopoverId,
				setOpenPopoverId,
				selectionMode,
				selectedIds,
				onToggleSelection,
			}),
			[
				weekDays,
				timeSlots,
				appointments,
				appointmentsByTimeSlot,
				savingAppointmentId,
				cardSize,
				heightScale,
				onTimeSlotClick,
				onEditAppointment,
				onDeleteAppointment,
				onAppointmentReschedule,
				dragState,
				dropTarget,
				handleDragStart,
				handleDragEnd,
				handleDragOver,
				handleDragLeave,
				handleDrop,
				checkTimeBlocked,
				isDayClosedForDate,
				openPopoverId,
				setOpenPopoverId,
				selectionMode,
				selectedIds,
				onToggleSelection,
			],
		);

		// Scroll para horário atual
		const scrollToCurrentTime = useCallback(() => {
			const now = new Date();
			const currentHour = now.getHours();
			const currentMinutes = now.getMinutes();

			if (
				currentHour < BUSINESS_HOURS.START ||
				currentHour >= BUSINESS_HOURS.END
			) {
				return;
			}

			const totalMinutesFromStart =
				(currentHour - BUSINESS_HOURS.START) * 60 + currentMinutes;
			const rowIndex = Math.floor(
				totalMinutesFromStart / BUSINESS_HOURS.DEFAULT_SLOT_DURATION,
			);

			if (typeof rowIndex === "number" && isFinite(rowIndex) && rowIndex >= 0) {
				if (listRef.current?.scrollToRow) {
					listRef.current.scrollToRow({ index: rowIndex, align: "start" });
				} else {
					listRef.current?.scrollToItem?.(rowIndex, "start");
				}
			}
		}, []);

		// Auto-scroll na montagem
		React.useEffect(() => {
			scrollToCurrentTime();
		}, [scrollToCurrentTime]);

		return (
			<div className="relative bg-white dark:bg-slate-950">
				{/* Virtual Grid */}
				<List
					listRef={listRef}
					height={containerHeight}
					rowCount={timeSlots.length}
					rowHeight={slotHeight}
					style={{ width: "100%" }}
					rowProps={itemData}
					rowComponent={TimeSlotRow}
					overscanCount={3}
				/>
			</div>
		);
	},
);

VirtualWeekGrid.displayName = "VirtualWeekGrid";

export default VirtualWeekGrid;
