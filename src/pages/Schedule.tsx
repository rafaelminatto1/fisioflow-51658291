/**
 * Schedule Page - React Router v7 Library Mode
 *
 * Migrated from Framework Mode to Library Mode.
 * Uses React Query for data fetching with cache and optimistic updates.
 *
 * @version 2.0.0 - Library Mode
 */

import { format } from "date-fns";
import { AlertTriangle, Cake, MessageCircle, Sparkles } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { BulkActionsBar } from "@/components/schedule/BulkActionsBar";
import { ScheduleModals } from "@/components/schedule/ScheduleModals";
import { CalendarSkeletonEnhanced } from "@/components/schedule/skeletons/CalendarSkeletonEnhanced";
import { Button } from "@/components/ui/button";
import { useBirthdayNotification } from "@/hooks/useBirthdayNotification";
import { useBulkActions } from "@/hooks/useBulkActions";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePatientReengagement } from "@/hooks/usePatientReengagement";
import { useScheduleHandlers } from "@/hooks/useScheduleHandlers";
import { useSchedulePageData, type ViewType } from "@/hooks/useSchedulePage";
import type { ViewType as CalendarViewType } from "@/hooks/useScheduleState";
import { KEYBOARD_SHORTCUTS } from "@/lib/calendar/constants";

const CalendarView = lazy(() => import("@/components/schedule/CalendarView"));
const ScheduleXCalendarWrapper = lazy(() => import("@/components/schedule/ScheduleXCalendar"));

import "@/styles/schedule.css";

// Feature Flag: Use new ScheduleX calendar instead of custom dnd-kit implementation
// Set to false to revert to the original dnd-kit calendar
const USE_SCHEDULEX = true;

export default function Schedule() {
	const [searchParams, setSearchParams] = useSearchParams();

	const dateParam =
		searchParams.get("date") || format(new Date(), "yyyy-MM-dd");
	const viewParam = (searchParams.get("view") || "week") as ViewType;
	const statusParam =
		searchParams.get("status")?.split(",").filter(Boolean) || [];
	const typesParam =
		searchParams.get("types")?.split(",").filter(Boolean) || [];
	const therapistsParam =
		searchParams.get("therapists")?.split(",").filter(Boolean) || [];
	const patientParam = searchParams.get("patient") || undefined;

	const { data, isLoading, refetch } = useSchedulePageData(
		dateParam,
		viewParam,
		{
			status: statusParam,
			types: typesParam,
			therapists: therapistsParam,
			patient: patientParam,
		},
	);

	const {
		appointments,
		therapists,
		patients,
		birthdaysToday,
		staffBirthdaysToday,
	} = data;

	const currentDate = useMemo(() => new Date(dateParam), [dateParam]);
	const viewType = viewParam;
	const patientFilter = patientParam || "";
	const filters = {
		status: statusParam,
		types: typesParam,
		therapists: therapistsParam,
	};

	const isNavigating = isLoading && appointments.length === 0;

	const { sendBirthdayMessage, isSending } = useBirthdayNotification();
	const { totalToReengage } = usePatientReengagement();
	const isMobile = useIsMobile();

	const {
		selectedIds,
		isSelectionMode,
		toggleSelectionMode,
		toggleSelection,
		clearSelection,
		deleteSelected,
		updateStatusSelected,
	} = useBulkActions();

	const { modals, actions } = useScheduleHandlers(
		currentDate,
		() => refetch(),
		isSelectionMode,
	);

	useEffect(() => {
		if (!isLoading) {
			actions.checkEditUrlParam(appointments);
		}
	}, [appointments, actions, isLoading]);

	const handleDateChange = useCallback(
		(date: Date) => {
			const newParams = new URLSearchParams(searchParams);
			newParams.set("date", format(date, "yyyy-MM-dd"));
			setSearchParams(newParams, { replace: true });
		},
		[searchParams, setSearchParams],
	);

	const handleViewTypeChange = useCallback(
		(view: string) => {
			const newParams = new URLSearchParams(searchParams);
			newParams.set("view", view);
			setSearchParams(newParams, { replace: true });
		},
		[searchParams, setSearchParams],
	);

	const handleFiltersChange = (newFilters: any) => {
		const newParams = new URLSearchParams(searchParams);
		if (newFilters.status?.length > 0) {
			newParams.set("status", newFilters.status.join(","));
		} else {
			newParams.delete("status");
		}
		if (newFilters.types?.length > 0) {
			newParams.set("types", newFilters.types.join(","));
		} else {
			newParams.delete("types");
		}
		if (newFilters.therapists?.length > 0) {
			newParams.set("therapists", newFilters.therapists.join(","));
		} else {
			newParams.delete("therapists");
		}
		setSearchParams(newParams, { replace: true });
	};

	const handlePatientFilterChange = (val: string) => {
		const newParams = new URLSearchParams(searchParams);
		if (val) {
			newParams.set("patient", val);
		} else {
			newParams.delete("patient");
		}
		setSearchParams(newParams, { replace: true });
	};

	const clearFilters = () => {
		const newParams = new URLSearchParams(searchParams);
		newParams.delete("status");
		newParams.delete("types");
		newParams.delete("therapists");
		newParams.delete("patient");
		setSearchParams(newParams, { replace: true });
	};

	// Keyboard Shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement ||
				e.target instanceof HTMLSelectElement
			)
				return;

			const isModalActive =
				modals.isModalOpen ||
				modals.showKeyboardShortcuts ||
				modals.quickEditAppointment;
			if (isModalActive && e.key !== "Escape") return;

			const key = e.key.toLowerCase();
			switch (key) {
				case "a":
					e.preventDefault();
					toggleSelectionMode();
					break;
				case KEYBOARD_SHORTCUTS.NEW_APPOINTMENT:
					e.preventDefault();
					actions.handleCreateAppointment();
					break;
				case KEYBOARD_SHORTCUTS.SEARCH:
					e.preventDefault();
					document
						.querySelector<HTMLInputElement>('input[aria-label*="paciente"]')
						?.focus();
					break;
				case KEYBOARD_SHORTCUTS.DAY_VIEW:
					handleViewTypeChange("day");
					break;
				case KEYBOARD_SHORTCUTS.WEEK_VIEW:
					handleViewTypeChange("week");
					break;
				case KEYBOARD_SHORTCUTS.MONTH_VIEW:
					handleViewTypeChange("month");
					break;
				case KEYBOARD_SHORTCUTS.TODAY:
					handleDateChange(new Date());
					break;
				case KEYBOARD_SHORTCUTS.HELP:
				case KEYBOARD_SHORTCUTS.HELP_ALT:
					e.preventDefault();
					modals.setShowKeyboardShortcuts(true);
					break;
				case "escape":
					if (modals.showKeyboardShortcuts)
						modals.setShowKeyboardShortcuts(false);
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		modals,
		actions,
		toggleSelectionMode,
		handleDateChange,
		handleViewTypeChange,
	]);

	return (
		<MainLayout fullWidth noPadding showBreadcrumbs={false}>
			<div className="flex flex-col h-[calc(100vh-128px)] md:h-[calc(100dvh-4rem)] overflow-hidden bg-slate-50 dark:bg-slate-950">
				<div className="flex flex-col flex-1 relative min-h-0">
					{/* Action Banner: Birthdays & Reengagement */}
					{(birthdaysToday.length > 0 ||
						staffBirthdaysToday.length > 0 ||
						totalToReengage > 0) && (
						<div className="gradient-brand-light px-6 py-3 border-b border-primary/20 flex items-center justify-between">
							<div className="flex items-center gap-6">
								{(birthdaysToday.length > 0 ||
									staffBirthdaysToday.length > 0) && (
									<div className="flex items-center gap-2">
										<Cake className="h-4 w-4 text-pink-600 dark:text-pink-400" />
										<p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-display">
											<span className="text-pink-600">Aniversários:</span>{" "}
											{[
												...birthdaysToday.map((p) => p.full_name),
												...staffBirthdaysToday.map((s) => s.full_name),
											].join(", ")}
										</p>
									</div>
								)}
								{totalToReengage > 0 && (
									<div className="flex items-center gap-2 border-l border-slate-200 pl-6">
										<AlertTriangle className="h-4 w-4 text-amber-600" />
										<p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-display">
											<span className="text-amber-600">
												{totalToReengage} pacientes
											</span>{" "}
											sem retorno
										</p>
									</div>
								)}
							</div>
							<div className="flex items-center gap-2">
								{birthdaysToday.length > 0 && (
									<Button
										size="sm"
										variant="brand"
										className="h-8 text-[10px] font-black uppercase magnetic-button glow-on-hover font-display"
										onClick={() =>
											birthdaysToday.forEach((p) => {
												sendBirthdayMessage(p.id, p.phone || "");
											})
										}
										disabled={isSending}
									>
										<Sparkles className="h-3.5 w-3.5 mr-2" />
										Parabéns + Cupom
									</Button>
								)}
								{totalToReengage > 0 && (
									<Button
										size="sm"
										variant="warm"
										className="h-8 text-[10px] font-black uppercase magnetic-button glow-on-hover font-display"
										asChild
									>
										<Link to="/marketing/dashboard">
											<MessageCircle className="h-3.5 w-3.5 mr-2" />
											Reengajar
										</Link>
									</Button>
								)}
							</div>
						</div>
					)}

					<div
						className="flex-1 flex flex-col min-w-0 min-h-0 bg-white dark:bg-slate-950"
						data-testid={isMobile ? "mobile-schedule-list" : "schedule-content"}
					>
						<div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative min-h-0">
							<Suspense
								fallback={
									<CalendarSkeletonEnhanced
										viewType={viewType as CalendarViewType}
									/>
								}
							>
								{isNavigating && appointments.length === 0 ? (
									<CalendarSkeletonEnhanced
										viewType={viewType as CalendarViewType}
									/>
								) : (
									<>
										{USE_SCHEDULEX ? (
											<Suspense
												fallback={
													<CalendarSkeletonEnhanced
														viewType={viewType as CalendarViewType}
													/>
												}
											>
												<ScheduleXCalendarWrapper
													appointments={appointments}
													currentDate={currentDate}
													onDateChange={handleDateChange}
													viewType={viewType as CalendarViewType}
													onViewTypeChange={handleViewTypeChange}
													onAppointmentClick={actions.handleAppointmentClick}
													onTimeSlotClick={actions.handleTimeSlotClick}
													onAppointmentReschedule={
														actions.handleAppointmentReschedule
													}
													onEditAppointment={actions.handleEditAppointment}
													onStatusChange={actions.handleUpdateStatus}
													selectionMode={isSelectionMode}
													selectedIds={selectedIds}
													onToggleSelection={toggleSelection}
													onCreateAppointment={actions.handleCreateAppointment}
													onToggleSelectionMode={toggleSelectionMode}
													filters={filters as any}
													onFiltersChange={handleFiltersChange}
													onClearFilters={clearFilters}
													totalAppointmentsCount={appointments.length}
													patientFilter={patientFilter}
													onPatientFilterChange={handlePatientFilterChange}
													therapists={therapists}
												/>
											</Suspense>
										) : (
											<CalendarView
												appointments={appointments}
												currentDate={currentDate}
												onDateChange={handleDateChange}
												viewType={viewType as CalendarViewType}
												onViewTypeChange={handleViewTypeChange}
												onAppointmentClick={actions.handleAppointmentClick}
												onTimeSlotClick={actions.handleTimeSlotClick}
												onAppointmentReschedule={
													actions.handleAppointmentReschedule
												}
												onEditAppointment={actions.handleEditAppointment}
												onDeleteAppointment={actions.handleDeleteAppointment}
												onDuplicateAppointment={actions.handleDuplicateAppointment}
												onStatusChange={actions.handleUpdateStatus}
												selectionMode={isSelectionMode}
												selectedIds={selectedIds}
												onToggleSelection={toggleSelection}
												rescheduleSuccessMessage={modals.rescheduleSuccessMessage}
												onCreateAppointment={actions.handleCreateAppointment}
												onToggleSelectionMode={toggleSelectionMode}
												onCancelAllToday={() =>
													modals.setShowCancelAllTodayDialog(true)
												}
												filters={filters as any}
												onFiltersChange={handleFiltersChange}
												onClearFilters={clearFilters}
												totalAppointmentsCount={appointments.length}
												patientFilter={patientFilter}
												onPatientFilterChange={handlePatientFilterChange}
												therapists={therapists}
											/>
										)}
									</>
								)}
							</Suspense>
						</div>
					</div>
				</div>

				<BulkActionsBar
					selectedCount={selectedIds.size}
					onClearSelection={clearSelection}
					onDeleteSelected={deleteSelected}
					onUpdateStatusSelected={updateStatusSelected}
				/>

				<ScheduleModals
					currentDate={currentDate}
					modals={modals}
					actions={actions}
					therapists={therapists}
					patients={patients}
				/>
			</div>
		</MainLayout>
	);
}
