import { useMemo, useCallback } from "react";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { format, isSameDay, startOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Appointment } from "@/types/appointment";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import VirtualizedCalendarGrid from "./virtualization/VirtualWeekGrid";
import { useCardSize } from "@/hooks/useCardSize";
import {
	BUSINESS_HOURS,
} from "@/lib/config/agenda";
import { calculateSlotHeightFromCardSize } from "@/lib/calendar/cardHeightCalculator";
import { normalizeTime } from "./shared/utils";
import { useRenderTracking } from "@/hooks/useRenderTracking";

interface CalendarWeekViewDndKitProps {
	currentDate: Date;
	appointments: Appointment[];
	savingAppointmentId?: string | null;
	timeSlots: string[];
	onTimeSlotClick: (date: Date, time: string) => void;
	onEditAppointment: (appointment: Appointment) => void;
	onDeleteAppointment: (appointment: Appointment) => void;
	onDuplicateAppointment?: (appointment: Appointment) => void;
	onStatusChange: (id: string, status: string) => void;
	onAppointmentReschedule?: (
		appointment: Appointment,
		newDate: Date,
		newTime: string,
	) => void;
	checkTimeBlocked: (
		date: Date,
		time: string,
	) => { blocked: boolean; reason?: string };
	isDayClosedForDate: (date: Date) => boolean;
	openPopoverId: string | null;
	setOpenPopoverId: (id: string | null) => void;
	dragState: any;
	dropTarget: any;
	handleDragStart: (e: any, appointment: Appointment) => void;
	handleDragOver: (e: any, date: Date, time: string) => void;
	handleDragEnd: () => void;
	handleDragLeave?: () => void;
	handleDrop?: (e: any, date: Date, time: string) => void;
	selectionMode?: boolean;
	selectedIds?: Set<string>;
	onToggleSelection?: (id: string) => void;
}

export const CalendarWeekViewDndKit = ({
	currentDate,
	appointments,
	savingAppointmentId,
	timeSlots: timeSlotsProp,
	onTimeSlotClick,
	onEditAppointment,
	onDeleteAppointment,
	onDuplicateAppointment,
	onStatusChange,
	onAppointmentReschedule,
	checkTimeBlocked,
	isDayClosedForDate,
	openPopoverId,
	setOpenPopoverId,
	dragState,
	dropTarget: _dropTarget,
	handleDragStart: handleDragStartHook,
	handleDragOver: handleDragOverHook,
	handleDragEnd: handleDragEndHook,
	handleDragLeave,
	handleDrop,
	selectionMode = false,
	selectedIds = new Set(),
	onToggleSelection,
}: CalendarWeekViewDndKitProps) => {
	useRenderTracking("CalendarWeekViewDndKit", {
		appointmentsCount: appointments?.length,
	});

	const { cardSize, heightScale } = useCardSize();

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 5,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const timeSlots = useMemo(() => {
		return timeSlotsProp.map(normalizeTime);
	}, [timeSlotsProp]);

	const handleDragEnd = useCallback(
		(event: any) => {
			const { active, over } = event;
			handleDragEndHook?.();

			if (over && active.id !== over.id) {
				const activeAppointment = active.data.current?.appointment;
				if (!activeAppointment) return;

				const [datePart, timePart] = over.id.split("_");
				if (datePart && timePart) {
					const newDate = new Date(datePart);
					onAppointmentReschedule?.(activeAppointment, newDate, timePart);
				}
			}
		},
		[onAppointmentReschedule, handleDragEndHook],
	);

	const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
	const weekDays = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

	return (
		<TooltipProvider>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={({ active }) => {
					const appointment = active.data.current?.appointment;
					if (appointment) handleDragStartHook?.(null as any, appointment);
				}}
				onDragEnd={handleDragEnd}
			>
				<div className="flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden">
					<div
						className="grid bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm"
						style={{
							gridTemplateColumns: `60px repeat(${weekDays.length}, 1fr)`,
						}}
					>
						<div className="h-14 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center">
							<div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
								<span className="text-[10px] font-bold">GMT-3</span>
							</div>
						</div>

						{weekDays.map((day, i) => {
							const isTodayDate = isSameDay(day, new Date());
							return (
								<div
									key={i}
									className={cn(
										"h-14 flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800/50 relative group transition-colors",
										isTodayDate
											? "bg-blue-50/50 dark:bg-blue-900/10"
											: "hover:bg-slate-50 dark:hover:bg-slate-900/40",
									)}
								>
									{isTodayDate && (
										<div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
									)}
									<span
										className={cn(
											"text-[10px] font-medium uppercase tracking-wider mb-0.5",
											isTodayDate
												? "text-blue-600 dark:text-blue-400"
												: "text-slate-500 dark:text-gray-500",
										)}
									>
										{format(day, "EEE", { locale: ptBR }).replace(".", "")}
									</span>
									<div
										className={cn(
											"text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center transition-all",
											isTodayDate
												? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
												: "text-slate-700 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700",
										)}
									>
										{format(day, "d")}
									</div>
								</div>
							);
						})}
					</div>

					<div className="flex-1 overflow-hidden relative">
						<VirtualizedCalendarGrid
							weekDays={weekDays}
							timeSlots={timeSlots}
							appointments={appointments}
							savingAppointmentId={savingAppointmentId}
							onTimeSlotClick={onTimeSlotClick}
							onEditAppointment={onEditAppointment}
							onDeleteAppointment={onDeleteAppointment}
							onAppointmentReschedule={onAppointmentReschedule}
							dragState={dragState}
							dropTarget={_dropTarget}
							handleDragStart={handleDragStartHook}
							handleDragEnd={handleDragEndHook}
							handleDragOver={handleDragOverHook}
							handleDragLeave={handleDragLeave}
							handleDrop={handleDrop}
							checkTimeBlocked={checkTimeBlocked}
							isDayClosedForDate={isDayClosedForDate}
							openPopoverId={openPopoverId}
							setOpenPopoverId={setOpenPopoverId}
							selectionMode={selectionMode}
							selectedIds={selectedIds}
							onToggleSelection={onToggleSelection}
						>
							{isSameDay(currentDate, new Date()) && (
								<div
									className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
									style={{
										top: `${
											((new Date().getHours() - BUSINESS_HOURS.START) * 60 +
												new Date().getMinutes()) *
											(calculateSlotHeightFromCardSize(cardSize, heightScale) /
												BUSINESS_HOURS.DEFAULT_SLOT_DURATION)
										}px`,
									}}
								>
									<div className="w-[60px] flex justify-end pr-2">
										<span className="bg-red-500 text-white text-[9px] font-bold px-1 rounded shadow-sm">
											{format(new Date(), "HH:mm")}
										</span>
									</div>
									<div className="h-px bg-red-500 flex-1 shadow-sm"></div>
								</div>
							)}
						</VirtualizedCalendarGrid>
					</div>
				</div>
			</DndContext>
		</TooltipProvider>
	);
};

CalendarWeekViewDndKit.displayName = "CalendarWeekViewDndKit";
