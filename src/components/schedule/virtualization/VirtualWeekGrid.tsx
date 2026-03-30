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
import { appointmentsOverlap } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { parseAppointmentDate, normalizeTime } from "@/lib/calendar/utils";
import { BUSINESS_HOURS } from "@/lib/calendar/constants";
import { CalendarAppointmentCard } from "../CalendarAppointmentCard";
import { TimeSlotCell } from "../TimeSlotCell";

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
	showCurrentTimeIndicator?: boolean;
}

interface ItemData {
	weekDays: Date[];
	appointments: Appointment[];
	savingAppointmentId?: string | null;
	timeSlots: string[];
	slotHeight: number;
	appointmentsByTimeSlot: Record<string, Appointment[]>;
	layoutByAppointmentId: Record<
		string,
		{ columnIndex: number; columnCount: number }
	>;
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
	showCurrentTimeIndicator?: boolean;
}

// =====================================================================
// TIME SLOT ROW COMPONENT
// =====================================================================

type TimeSlotRowProps = ItemData & { index: number; style: React.CSSProperties };

function buildDayOverlapLayout(dayAppointments: Appointment[]) {
	const layoutByAppointmentId: Record<
		string,
		{ columnIndex: number; columnCount: number }
	> = {};

	const sortedAppointments = [...dayAppointments].sort((a, b) => {
		const timeDiff = normalizeTime(a.time).localeCompare(normalizeTime(b.time));
		if (timeDiff !== 0) return timeDiff;
		return a.id.localeCompare(b.id);
	});

	let active: Array<{ appointment: Appointment; columnIndex: number }> = [];
	let currentGroupIds: string[] = [];
	let currentGroupMaxColumns = 1;

	const finalizeGroup = () => {
		if (currentGroupIds.length === 0) return;
		for (const appointmentId of currentGroupIds) {
			const existing = layoutByAppointmentId[appointmentId];
			if (!existing) continue;
			layoutByAppointmentId[appointmentId] = {
				...existing,
				columnCount: currentGroupMaxColumns,
			};
		}
		currentGroupIds = [];
		currentGroupMaxColumns = 1;
	};

	for (const appointment of sortedAppointments) {
		active = active.filter(({ appointment: activeAppointment }) =>
			appointmentsOverlap(activeAppointment, appointment),
		);

		if (active.length === 0) {
			finalizeGroup();
		}

		const usedColumns = new Set(active.map((item) => item.columnIndex));
		let columnIndex = 0;
		while (usedColumns.has(columnIndex)) {
			columnIndex += 1;
		}

		active.push({ appointment, columnIndex });
		currentGroupIds.push(appointment.id);
		currentGroupMaxColumns = Math.max(currentGroupMaxColumns, active.length);

		layoutByAppointmentId[appointment.id] = {
			columnIndex,
			columnCount: currentGroupMaxColumns,
		};
	}

	finalizeGroup();

	return layoutByAppointmentId;
}

const TimeSlotRow: React.FC<TimeSlotRowProps> = memo(
	({
		index,
		style,
		weekDays,
		timeSlots,
		slotHeight,
		appointmentsByTimeSlot,
		layoutByAppointmentId,
		...props
	}) => {
		const time = timeSlots[index];

		if (!time) return null;

		const isHour = time.endsWith(":00");
		const numDays = weekDays.length;

		return (
			<div
				style={{
					...style,
					display: "grid",
					gridTemplateColumns: `60px repeat(${numDays}, 1fr)`,
					zIndex: appointmentsByTimeSlot[time]?.length
						? timeSlots.length - index
						: 0,
				}}
				className="relative border-b border-slate-200 dark:border-slate-800"
			>
				{/* Time Label */}
				<div
					className={cn(
						"border-r border-slate-100 dark:border-slate-800 text-[11px] font-medium flex items-start justify-end pr-2 pt-1 bg-white dark:bg-slate-950 sticky left-0 z-10",
						isHour
							? "text-slate-500 dark:text-slate-400 -translate-y-2"
							: "invisible",
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
							isLastColumn={colIndex === numDays - 1}
							isClosed={!!isClosed}
							isBlocked={blocked}
							isDropTarget={!!isDropTarget}
							onTimeSlotClick={props.onTimeSlotClick || (() => {})}
							handleDragOver={props.handleDragOver || (() => {})}
							handleDragLeave={props.handleDragLeave || (() => {})}
							handleDrop={props.handleDrop || (() => {})}
						/>
					);
				})}

				{/* Appointments for this time slot */}
				{appointmentsByTimeSlot[time]?.map((apt) => {
					const aptDate = parseAppointmentDate(apt.date);
					if (!aptDate) return null;

					const dayIndex = weekDays.findIndex((d) => isSameDay(d, aptDate));
					if (dayIndex === -1) return null;

					const duration = apt.duration || 60;
					const slotCount = Math.max(1, Math.ceil(duration / 30));
					const verticalInset = 2;
					const height = Math.max(
						slotHeight * slotCount - verticalInset * 2,
						slotHeight - 6,
					);

					const layout = layoutByAppointmentId[apt.id] || {
						columnIndex: 0,
						columnCount: 1,
					};
					const aptIndex = layout.columnIndex;
					const count = Math.max(1, layout.columnCount);
					const gap = 4;
					const outerMargin = 4;

					// Posição dentro da coluna do dia correto
					const appointmentStyle: React.CSSProperties = {
						position: "absolute",
						height: `${height}px`,
						// Largura: fração da coluna do dia dividida por nº de sobreposições
						width: `calc(((100% - 60px) / ${numDays} - ${(count + 1) * gap}px) / ${count})`,
						// Left: início da coluna do dia + margem + offset por sobreposição
						left: `calc(60px + ${dayIndex} * (100% - 60px) / ${numDays} + ${outerMargin}px + ${aptIndex} * (((100% - 60px) / ${numDays} - ${(count + 1) * gap}px) / ${count} + ${gap}px))`,
						top: `${verticalInset}px`,
						zIndex: timeSlots.length - index + aptIndex + 1,
					};

					const isDraggable = !!props.onAppointmentReschedule;
					const isDraggingThis =
						props.dragState?.isDragging &&
						props.dragState.appointment?.id === apt.id;
					const isSaving = !!props.savingAppointmentId && props.savingAppointmentId === apt.id;

					return (
						<div
							key={apt.id}
							draggable={isDraggable}
							onDragStart={(e) =>
								(props.handleDragStart || (() => {}))(e, apt)
							}
							onDragEnd={props.handleDragEnd || (() => {})}
							className="absolute"
							style={appointmentStyle}
						>
							<CalendarAppointmentCard
								appointment={apt}
								style={{
									position: "absolute",
									inset: 0,
									width: "100%",
									height: "100%",
								}}
								density="compact"
								isDraggable={isDraggable}
								isDragging={isDraggingThis}
								isSaving={isSaving}
								onDragStart={props.handleDragStart || (() => {})}
								onDragEnd={props.handleDragEnd || (() => {})}
								onEditAppointment={props.onEditAppointment}
								onDeleteAppointment={props.onDeleteAppointment}
								onOpenPopover={props.setOpenPopoverId || (() => {})}
								isPopoverOpen={props.openPopoverId === apt.id}
								selectionMode={!!props.selectionMode}
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
		showCurrentTimeIndicator = true,
	}) => {
		const listRef = useRef<any>(null);
		const containerRef = useRef<HTMLDivElement>(null);

		// Measure actual container height with ResizeObserver
		const [containerHeight, setContainerHeight] = useState(600);

		useEffect(() => {
			const el = containerRef.current;
			if (!el) return;
			const ro = new ResizeObserver((entries) => {
				const h = entries[0]?.contentRect.height;
				if (h && h > 0) setContainerHeight(h);
			});
			ro.observe(el);
			return () => ro.disconnect();
		}, []);

		const slotCount = Math.max(1, timeSlots.length);

		// Use the exact available height so the last row reaches the bottom edge
		// without leaving a remainder gap from integer rounding.
		const slotHeight = Math.max(18, containerHeight / slotCount);

		// Agrupar appointments por time slot e calcular layout lateral por conflito real
		const { appointmentsByTimeSlot, layoutByAppointmentId } = useMemo(() => {
			const byTimeSlot: Record<string, Appointment[]> = {};
			const appointmentsByDay: Record<number, Appointment[]> = {};

			appointments.forEach((apt) => {
				const aptDate = parseAppointmentDate(apt.date);
				if (!aptDate) return;

				const dayIndex = weekDays.findIndex((d) => isSameDay(d, aptDate));
				if (dayIndex === -1) return;

				const time = normalizeTime(apt.time);

				if (!byTimeSlot[time]) byTimeSlot[time] = [];
				byTimeSlot[time].push(apt);

				if (!appointmentsByDay[dayIndex]) appointmentsByDay[dayIndex] = [];
				appointmentsByDay[dayIndex].push(apt);
			});

			const layoutEntries = Object.values(appointmentsByDay).flatMap((dayApts) =>
				Object.entries(buildDayOverlapLayout(dayApts)),
			);

			return {
				appointmentsByTimeSlot: byTimeSlot,
				layoutByAppointmentId: Object.fromEntries(layoutEntries),
			};
		}, [appointments, weekDays]);

		// Preparar item data para react-window
		const itemData: ItemData = useMemo(
			() => ({
				weekDays,
				timeSlots,
				appointments,
				slotHeight,
				appointmentsByTimeSlot,
				layoutByAppointmentId,
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
				selectionMode,
				selectedIds,
				onToggleSelection,
				showCurrentTimeIndicator,
			}),
			[
				weekDays,
				timeSlots,
				appointments,
				slotHeight,
				appointmentsByTimeSlot,
				layoutByAppointmentId,
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
				selectionMode,
				selectedIds,
				onToggleSelection,
				showCurrentTimeIndicator,
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
			<div ref={containerRef} className="relative bg-white dark:bg-slate-950" style={{ flex: 1, minHeight: 0, height: "100%" }}>
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
				{showCurrentTimeIndicator &&
					weekDays.some((day) => isSameDay(day, new Date())) && (() => {
						const now = new Date();
						const minutesFromStart =
							(now.getHours() - BUSINESS_HOURS.START) * 60 + now.getMinutes();

						if (
							minutesFromStart < 0 ||
							minutesFromStart >
								(BUSINESS_HOURS.END - BUSINESS_HOURS.START) * 60
						) {
							return null;
						}

						return (
							<div
								className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
								style={{
									top: `${
										(minutesFromStart * slotHeight) /
										BUSINESS_HOURS.DEFAULT_SLOT_DURATION
									}px`,
								}}
							>
								<div className="w-[60px] flex justify-end pr-2">
									<span className="bg-red-500 text-white text-[9px] font-bold px-1 rounded shadow-sm">
										{now.toLocaleTimeString("pt-BR", {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
								</div>
								<div className="h-px bg-red-500 flex-1 shadow-sm" />
							</div>
						);
					})()}
			</div>
		);
	},
);

VirtualWeekGrid.displayName = "VirtualWeekGrid";

export default VirtualWeekGrid;
