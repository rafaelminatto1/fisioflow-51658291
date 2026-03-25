/**
 * Schedule Page - React Router v7 Framework Mode Migration
 */

import { format } from "date-fns";
import { AlertTriangle, Cake, MessageCircle, Sparkles } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
	Link,
	useActionData,
	useLoaderData,
	useNavigation,
	useSearchParams,
	useSubmit,
} from "react-router";
import { appointmentsApi } from "@/api/v2/appointments";
import { patientsApi } from "@/api/v2/patients";
import { profileApi } from "@/api/v2/system";
import { MainLayout } from "@/components/layout/MainLayout";
import { BulkActionsBar } from "@/components/schedule/BulkActionsBar";
import { ScheduleModals } from "@/components/schedule/ScheduleModals";
import { CalendarSkeletonEnhanced } from "@/components/schedule/skeletons/CalendarSkeletonEnhanced";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useBirthdayNotification } from "@/hooks/useBirthdayNotification";
import { useBulkActions } from "@/hooks/useBulkActions";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { usePatientReengagement } from "@/hooks/usePatientReengagement";
import { usePrefetchAdjacentPeriods } from "@/hooks/usePrefetchAdjacentPeriods";
import { useScheduleHandlers } from "@/hooks/useScheduleHandlers";
import type { ViewType as CalendarViewType } from "@/hooks/useScheduleState";
import { KEYBOARD_SHORTCUTS } from "@/lib/calendar/constants";
import { logger } from "@/lib/errors/logger";
import { AppointmentService } from "@/services/appointmentService";
import type {
	AppointmentRow,
	PatientRow,
	TherapistProfileRow,
} from "@/types/workers";
import type { Route } from "./+types/Schedule";

// Lazy load CalendarView for performance
const CalendarView = lazy(() => import("@/components/schedule/CalendarView"));

import "@/styles/schedule.css";

// --- Types ---
export type ViewType = "day" | "week" | "month";

export interface ScheduleLoaderData {
	appointments: AppointmentRow[];
	therapists: TherapistProfileRow[];
	patients: PatientRow[];
	birthdaysToday: PatientRow[];
	staffBirthdaysToday: TherapistProfileRow[];
	organizationId: string;
	filters: {
		date: string;
		view: ViewType;
		status: string[];
		types: string[];
		therapists: string[];
		patient?: string;
	};
}

// --- Loader ---
export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const dateParam =
		url.searchParams.get("date") || format(new Date(), "yyyy-MM-dd");
	const viewParam = (url.searchParams.get("view") || "week") as ViewType;
	const statusParam =
		url.searchParams.get("status")?.split(",").filter(Boolean) || [];
	const typesParam =
		url.searchParams.get("types")?.split(",").filter(Boolean) || [];
	const therapistsParam =
		url.searchParams.get("therapists")?.split(",").filter(Boolean) || [];
	const patientParam = url.searchParams.get("patient") || undefined;

	// In a real scenario, we'd fetch organizationId from the auth session on the server
	// For now, we'll assume the API handles it or it's provided in the request context

	try {
		// Parallel data fetching for performance (Single Fetch Pattern)
		const [appointmentsRes, therapistsRes, patientsRes] = await Promise.all([
			appointmentsApi.list({
				dateFrom: dateParam,
				dateTo: dateParam,
				viewType: viewParam,
				status: statusParam.length > 0 ? statusParam.join(",") : undefined,
				therapistId:
					therapistsParam.length > 0 ? therapistsParam.join(",") : undefined,
			}),
			profileApi.listTherapists(),
			patientsApi.list({ limit: 50 }),
		]);

		const therapists = therapistsRes.data || [];
		const patients = patientsRes.data || [];
		const appointments = appointmentsRes.data || [];

		// Calculate birthdays from loaded data
		const todayStr = format(new Date(), "MM-dd");
		const birthdaysToday = patients.filter(
			(p) => p.birth_date && p.birth_date.slice(5, 10) === todayStr,
		);
		const staffBirthdaysToday = therapists.filter(
			(t) => t.birth_date && t.birth_date.slice(5, 10) === todayStr,
		);

		return {
			appointments,
			therapists,
			patients,
			birthdaysToday,
			staffBirthdaysToday,
			organizationId: appointmentsRes.meta?.organizationId || "", // Extract from meta if available
			filters: {
				date: dateParam,
				view: viewParam,
				status: statusParam,
				types: typesParam,
				therapists: therapistsParam,
				patient: patientParam,
			},
		};
	} catch (error) {
		logger.error("Error loading schedule data", { error }, "ScheduleLoader");
		throw new Error("Falha ao carregar dados da agenda");
	}
}

// --- Action ---
export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData();
	const intent = formData.get("intent");
	const organizationId = formData.get("organizationId") as string;

	try {
		switch (intent) {
			case "create": {
				const data = JSON.parse(formData.get("data") as string);
				await AppointmentService.createAppointment({ ...data, organizationId });
				return { success: "Agendamento criado com sucesso" };
			}
			case "update": {
				const id = formData.get("id") as string;
				const data = JSON.parse(formData.get("data") as string);
				await AppointmentService.updateAppointment(id, {
					...data,
					organizationId,
				});
				return { success: "Agendamento atualizado com sucesso" };
			}
			case "delete": {
				const id = formData.get("id") as string;
				await AppointmentService.deleteAppointment(id, organizationId);
				return { success: "Agendamento excluído com sucesso" };
			}
			case "updateStatus": {
				const id = formData.get("id") as string;
				const status = formData.get("status") as string;
				await AppointmentService.updateStatus(id, status);
				return { success: "Status atualizado com sucesso" };
			}
			default:
				return { error: "Intenção não reconhecida" };
		}
	} catch (error: any) {
		logger.error(
			"Error in schedule action",
			{ error, intent },
			"ScheduleAction",
		);
		return { error: error.message || "Erro inesperado na operação" };
	}
}

// --- Component ---
export default function Schedule() {
	const {
		appointments,
		therapists,
		patients,
		birthdaysToday,
		staffBirthdaysToday,
		organizationId: loaderOrgId,
		filters: loaderFilters,
	} = useLoaderData<ScheduleLoaderData>();
	const actionData = useActionData<{ success?: string; error?: string }>();
	const submit = useSubmit();
	const [searchParams, setSearchParams] = useSearchParams();
	const navigation = useNavigation();
	const { user, organizationId: authOrgId } = useAuth();

	const organizationId = loaderOrgId || authOrgId || "";
	const isNavigating = navigation.state === "loading";

	// --- Derived State from URL ---
	const currentDate = useMemo(
		() => new Date(loaderFilters.date),
		[loaderFilters.date],
	);
	const viewType = loaderFilters.view;
	const patientFilter = loaderFilters.patient || "";
	const filters = {
		status: loaderFilters.status,
		types: loaderFilters.types,
		therapists: loaderFilters.therapists,
	};

	const { sendBirthdayMessage, isSending } = useBirthdayNotification();
	const { totalToReengage } = usePatientReengagement();

	// --- Bulk Actions ---
	const {
		selectedIds,
		isSelectionMode,
		toggleSelectionMode,
		toggleSelection,
		clearSelection,
		deleteSelected,
		updateStatusSelected,
	} = useBulkActions();

	// --- Handlers & Modals ---
	const { modals, actions } = useScheduleHandlers(
		currentDate,
		() => submit(null, { method: "get", replace: true }), // Dummy refetch using revalidation
		isSelectionMode,
	);

	// Deep link checks for ?edit=
	useEffect(() => {
		actions.checkEditUrlParam(appointments);
	}, [appointments, actions]);

	// Action results toast
	useEffect(() => {
		if (actionData?.success) {
			toast({
				title: "Sucesso",
				description: actionData.success,
			});
		} else if (actionData?.error) {
			toast({
				title: "Erro",
				description: actionData.error,
				variant: "destructive",
			});
		}
	}, [actionData]);

	// URL Synchronization Helpers
	const updateSearchParams = (
		params: Record<string, string | string[] | null>,
	) => {
		const newParams = new URLSearchParams(searchParams);
		Object.entries(params).forEach(([key, value]) => {
			if (value === null) {
				newParams.delete(key);
			} else if (Array.isArray(value)) {
				newParams.delete(key);
				if (value.length > 0) newParams.set(key, value.join(","));
			} else {
				newParams.set(key, value);
			}
		});
		setSearchParams(newParams, { replace: true });
	};

	const handleDateChange = (date: Date) => {
		updateSearchParams({ date: format(date, "yyyy-MM-dd") });
	};

	const handleViewTypeChange = (view: string) => {
		updateSearchParams({ view });
	};

	const handleFiltersChange = (newFilters: any) => {
		updateSearchParams({
			status: newFilters.status,
			types: newFilters.types,
			therapists: newFilters.therapists,
		});
	};

	const handlePatientFilterChange = (val: string) => {
		updateSearchParams({ patient: val || null });
	};

	const clearFilters = () => {
		updateSearchParams({
			status: null,
			types: null,
			therapists: null,
			patient: null,
		});
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
	}, [modals, actions, toggleSelectionMode]);

	return (
		<MainLayout fullWidth noPadding showBreadcrumbs={false}>
			<div className="flex flex-col h-[calc(100vh-128px)] overflow-hidden bg-slate-50 dark:bg-slate-950">
				<div className="flex flex-col flex-1 relative min-h-0">
					{/* Action Banner: Birthdays & Reengagement */}
					{(birthdaysToday.length > 0 ||
						staffBirthdaysToday.length > 0 ||
						totalToReengage > 0) && (
						<div className="bg-gradient-to-r from-blue-500/10 via-pink-500/5 to-amber-500/10 px-6 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
							<div className="flex items-center gap-6">
								{(birthdaysToday.length > 0 ||
									staffBirthdaysToday.length > 0) && (
									<div className="flex items-center gap-2">
										<Cake className="h-4 w-4 text-pink-600 dark:text-pink-400" />
										<p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
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
										<p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
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
										variant="ghost"
										className="h-8 text-[10px] font-black uppercase text-pink-600 hover:bg-pink-50"
										onClick={() =>
											birthdaysToday.forEach((p) =>
												sendBirthdayMessage(p.id, p.phone || ""),
											)
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
										variant="ghost"
										className="h-8 text-[10px] font-black uppercase text-amber-600 hover:bg-amber-50"
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

					<div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white dark:bg-slate-950">
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
