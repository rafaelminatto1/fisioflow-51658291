// =====================================================================
// MAIN COMPONENT
// =====================================================================

export const CalendarWeekViewDndKit = memo(
	({
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
		selectionMode = false,
		selectedIds = new Set(),
		onToggleSelection,
	}: CalendarWeekViewDndKitProps) => {
		useRenderTracking("CalendarWeekViewDndKit", {
			appointmentsCount: appointments?.length,
		});

		// Get card size configuration from user preferences
		const { cardSize, heightScale } = useCardSize();

		const sensors = useSensors(
			useSensor(PointerSensor, {
				activationConstraint: {
					// Use specific distance to avoid accidental drags during clicks
					distance: 5,
				},
			}),
			useSensor(KeyboardSensor, {
				coordinateGetter: sortableKeyboardCoordinates,
			}),
		);

		// Group appointments by day and time slot for efficient lookup
		const appointmentsByDayAndTime = useMemo(() => {
			const result: Record<string, Appointment[]> = {};

			appointments.forEach((apt) => {
				const aptDate = parseAppointmentDate(apt.date);
				if (!aptDate) return;

				const dayStr = format(aptDate, "yyyy-MM-dd");
				const time = normalizeTime(apt.time);
				const key = `${dayStr}_${time}`;

				if (!result[key]) result[key] = [];
				result[key].push(apt);
			});

			return result;
		}, [appointments]);

		// Pre-process time slots for consistent formatting
		const timeSlots = useMemo(() => {
			return timeSlotsProp.map(normalizeTime);
		}, [timeSlotsProp]);

		// Handle drag end with optimized coordinate calculation
		const handleDragEnd = useCallback(
			(event: any) => {
				const { active, over } = event;
				handleDragEndHook?.();

				if (over && active.id !== over.id) {
					const activeAppointment = active.data.current?.appointment;
					if (!activeAppointment) return;

					// Find the slot date and time from the drop target id
					const [datePart, timePart] = over.id.split("_");
					if (datePart && timePart) {
						const newDate = new Date(datePart);
						onAppointmentReschedule?.(activeAppointment, newDate, timePart);
					}
				}
			},
			[onAppointmentReschedule, handleDragEndHook],
		);

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
						{/* Schedule Header */}
						<div className="grid grid-cols-[60px_repeat(7,1fr)] bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm">
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

						{/* Grid Content with Virtualization */}
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
								checkTimeBlocked={checkTimeBlocked}
								isDayClosedForDate={isDayClosedForDate}
								openPopoverId={openPopoverId}
								setOpenPopoverId={setOpenPopoverId}
								selectionMode={selectionMode}
								selectedIds={selectedIds}
								onToggleSelection={onToggleSelection}
							>
								{/* Current Time Indicator Overlay */}
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
	},
);

CalendarWeekViewDndKit.displayName = "CalendarWeekViewDndKit";
