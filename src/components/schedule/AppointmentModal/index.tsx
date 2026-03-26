import React from "react";
import { FormProvider } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, SlidersHorizontal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomModal } from "@/components/ui/custom-modal";
import { useTherapists, type TherapistOption } from "@/hooks/useTherapists";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useActivePatients } from "@/hooks/usePatients";
import type { Patient } from "@/types";
import { useAppointments } from "@/hooks/useAppointments";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";
import { type AppointmentBase } from "@/types/appointment";
import { useIsMobile } from "@/hooks/use-mobile";

import { QuickPatientModal } from "../../modals/QuickPatientModal";
import { DuplicateAppointmentDialog } from "../DuplicateAppointmentDialog";
import { CapacityExceededDialog } from "../CapacityExceededDialog";
import { WaitlistQuickAdd } from "../WaitlistQuickAdd";

import { AppointmentModalHeader } from "./AppointmentModalHeader";
import { AppointmentInfoTab } from "./AppointmentInfoTab";
import { AppointmentOptionsTab } from "./AppointmentOptionsTab";
import { AppointmentModalFooterActions } from "./AppointmentModalFooterActions";
import { useAppointmentModalState } from "./hooks/useAppointmentModalState";
import { useAppointmentForm } from "./hooks/useAppointmentForm";
import { useAppointmentModalLogic } from "./hooks/useAppointmentModalLogic";

export interface AppointmentModalProps {
	isOpen: boolean;
	onClose: () => void;
	appointment?: AppointmentBase | null;
	defaultDate?: Date;
	defaultTime?: string;
	defaultPatientId?: string;
	mode?: "create" | "edit" | "view";
	therapists?: TherapistOption[];
	patients?: Patient[];
}

const getAppointmentPatientName = (appointment?: any) =>
	appointment?.patientName ||
	appointment?.patient_name ||
	appointment?.patient?.full_name ||
	appointment?.patient?.name ||
	"";

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
	isOpen,
	onClose,
	appointment,
	defaultDate,
	defaultTime,
	defaultPatientId,
	mode: initialMode = "create",
	therapists: externalTherapists = [],
	patients: externalPatients = [],
}) => {
	const isMobile = useIsMobile();
	const queryClient = useQueryClient();
	const { user } = useAuth();
	const { currentOrganization } = useOrganizations();
	
	// Use external props if available, otherwise fallback to hooks (for backward compatibility if needed)
	const { therapists: hookTherapists = [], isLoading: therapistsLoading } = useTherapists();
	const therapists = externalTherapists.length > 0 ? externalTherapists : hookTherapists;

	const { data: hookPatients, isLoading: patientsLoading } =
		useActivePatients({
			enabled: isOpen && externalPatients.length === 0,
			organizationId: currentOrganization?.id,
		}) as { data: Patient[] | undefined; isLoading: boolean };
	const activePatients = externalPatients.length > 0 ? externalPatients : (hookPatients || []);
	const { data: appointments = [] } = useAppointments({
		enabled: isOpen,
		enableRealtime: false,
	});
	const { getMinCapacityForInterval } = useScheduleCapacity();

	const state = useAppointmentModalState({ initialMode });
	const {
		currentMode,
		setCurrentMode,
		activeTab,
		setActiveTab,
		isCalendarOpen,
		setIsCalendarOpen,
		recurringConfig,
		conflictCheck,
		quickPatientModalOpen,
		setQuickPatientModalOpen,
		suggestedPatientName,
		setSuggestedPatientName,
		lastCreatedPatient,
		setLastCreatedPatient,
		selectedEquipments,
		setSelectedEquipments,
		reminders,
		setReminders,
		duplicateDialogOpen,
		setDuplicateDialogOpen,
		capacityDialogOpen,
		setCapacityDialogOpen,
		pendingFormData,
		setPendingFormData,
		waitlistQuickAddOpen,
		setWaitlistQuickAddOpen,
		isNotesExpanded,
		setIsNotesExpanded,
	} = state;

	const effectiveTherapistId = user?.uid || "";

	const form = useAppointmentForm({
		appointment,
		defaultDate,
		defaultTime,
		defaultPatientId,
		onClose,
		onOpenCapacityDialog: (data, check) => {
			setPendingFormData(data);
			state.setConflictCheck(check);
			setCapacityDialogOpen(true);
		},
		appointments,
		effectiveTherapistId,
	});

	const {
		methods,
		handleSave,
		handleDelete,
		handleDuplicate,
		isCreating,
		isUpdating,
		getInitialFormData,
		persistAppointment,
		scheduleOnlyRef,
	} = form;
	const { setValue, handleSubmit, watch } = methods;

	const logic = useAppointmentModalLogic({
		isOpen,
		appointment,
		defaultDate,
		defaultTime,
		defaultPatientId,
		initialMode,
		appointments,
		activePatients: activePatients || [],
		getInitialFormData,
		state,
		persistAppointment,
		methods,
	});

	const {
		watchedDate,
		timeSlots,
		selectedPatientName,
		handleAutoSchedule,
		handleScheduleAnyway,
	} = logic;

	const watchedStatus = watch("status");

	return (
		<FormProvider {...methods}>
			<CustomModal
				open={isOpen}
				onOpenChange={(open) => !open && onClose()}
				isMobile={isMobile}
				contentClassName="max-w-5xl"
			>
				<AppointmentModalHeader currentMode={currentMode} onClose={onClose} />

				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="flex flex-col flex-1 min-h-0"
				>
					<div className="px-5 sm:px-6 py-2 bg-blue-50/30 border-b shrink-0">
						<TabsList className="flex w-full gap-4 bg-transparent h-10 border-none">
							<TabsTrigger
								value="info"
								className="flex items-center gap-2 text-xs sm:text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent rounded-none px-1 transition-all"
							>
								<CalendarIcon className="h-3.5 w-3.5" />
								<span>Agendamento</span>
							</TabsTrigger>
							<TabsTrigger
								value="options"
								className="flex items-center gap-2 text-xs sm:text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent rounded-none px-1 transition-all"
							>
								<SlidersHorizontal className="h-3.5 w-3.5" />
								<span>Configurações</span>
							</TabsTrigger>
						</TabsList>
					</div>

					<div className="flex-1 min-h-0 overflow-y-auto">
						<form
							id="appointment-form"
							onSubmit={(e) => {
								e.preventDefault();
								handleSubmit(
									(data) => handleSave(data, recurringConfig),
									(errors) => {
										console.error("Form validation errors", errors);
										toast({
											variant: "destructive",
											title: "Erro no formulário",
											description: "Verifique os campos obrigatórios do formulário",
										});
									},
								)(e);
							}}
							className="px-5 sm:px-6 py-4"
						>
							<TabsContent value="info">
								<AppointmentInfoTab
									methods={methods}
									currentMode={currentMode}
									patients={activePatients || []}
									patientsLoading={patientsLoading}
									defaultPatientId={defaultPatientId}
									onQuickPatientCreate={(searchTerm) => {
										setSuggestedPatientName(searchTerm);
										setQuickPatientModalOpen(true);
									}}
									lastCreatedPatient={lastCreatedPatient}
									normalizedAppointmentPatientName={getAppointmentPatientName(
										appointment,
									)}
									selectedPatientName={selectedPatientName}
									timeSlots={timeSlots}
									isCalendarOpen={isCalendarOpen}
									setIsCalendarOpen={setIsCalendarOpen}
									getMinCapacityForInterval={getMinCapacityForInterval}
									conflictCount={conflictCheck?.totalConflictCount || 0}
									onAutoSchedule={handleAutoSchedule}
									therapists={therapists}
									therapistsLoading={therapistsLoading}
									isNotesExpanded={isNotesExpanded}
									setIsNotesExpanded={setIsNotesExpanded}
								/>
							</TabsContent>

							<TabsContent value="options">
								<AppointmentOptionsTab
									currentMode={currentMode}
									disabled={currentMode === "view"}
									selectedEquipments={selectedEquipments}
									setSelectedEquipments={setSelectedEquipments}
									recurringConfig={recurringConfig}
									setRecurringConfig={state.setRecurringConfig}
									reminders={reminders}
									setReminders={setReminders}
									onDuplicate={() => setDuplicateDialogOpen(true)}
								/>
							</TabsContent>
						</form>
					</div>
				</Tabs>

				<AppointmentModalFooterActions
					currentMode={currentMode}
					isCreating={isCreating}
					isUpdating={isUpdating}
					watchedStatus={watchedStatus}
					onClose={onClose}
					onDelete={handleDelete}
					onEdit={() => setCurrentMode("edit")}
					onSave={() => {
						scheduleOnlyRef.current = false;
					}}
					onScheduleOnly={() => {
						scheduleOnlyRef.current = true;
						handleSubmit((data) => handleSave(data, recurringConfig))();
					}}
					isMobile={isMobile}
					hasAppointment={!!appointment}
				/>

				<QuickPatientModal
					open={quickPatientModalOpen}
					onOpenChange={(open) => {
						setQuickPatientModalOpen(open);
						if (!open) setSuggestedPatientName("");
					}}
					onSuccess={(patient) => {
						setValue("patient_id", patient.id);
						setLastCreatedPatient(patient);
						setQuickPatientModalOpen(false);
						setSuggestedPatientName("");
						queryClient.invalidateQueries({ queryKey: ["patients"] });
					}}
					suggestedName={suggestedPatientName}
				/>

				<DuplicateAppointmentDialog
					open={duplicateDialogOpen}
					onOpenChange={setDuplicateDialogOpen}
					appointment={appointment || null}
					onDuplicate={handleDuplicate}
				/>

				<CapacityExceededDialog
					open={capacityDialogOpen}
					onOpenChange={setCapacityDialogOpen}
					currentCount={(conflictCheck?.totalConflictCount || 0) + 1}
					maxCapacity={
						watchedDate && watch("appointment_time")
							? getMinCapacityForInterval(
									watchedDate.getDay(),
									watch("appointment_time") || "08:00",
									watch("duration") || 60,
								)
							: 1
					}
					selectedTime={watch("appointment_time") || ""}
					selectedDate={watchedDate || new Date()}
					onAddToWaitlist={() => {
						setCapacityDialogOpen(false);
						setWaitlistQuickAddOpen(true);
					}}
					onChooseAnotherTime={() => {
						setCapacityDialogOpen(false);
						setActiveTab("info");
					}}
					onScheduleAnyway={handleScheduleAnyway}
				/>

				{waitlistQuickAddOpen && pendingFormData && (
					<WaitlistQuickAdd
						open={waitlistQuickAddOpen}
						onOpenChange={(open) => {
							setWaitlistQuickAddOpen(open);
							if (!open) setPendingFormData(null);
						}}
						date={
							pendingFormData.appointment_date
								? parseISO(pendingFormData.appointment_date)
								: new Date()
						}
						time={pendingFormData.appointment_time || "08:00"}
						defaultPatientId={pendingFormData.patient_id || ""}
					/>
				)}
			</CustomModal>
		</FormProvider>
	);
};

export default AppointmentModal;
