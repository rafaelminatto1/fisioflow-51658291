import React from "react";
import { FormProvider } from "react-hook-form";
import { CustomModal } from "@/components/ui/custom-modal";
import { useTherapists, type TherapistOption } from "@/hooks/useTherapists";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useActivePatients } from "@/hooks/patients/usePatients";
import type { Patient } from "@/types";
import { useAppointments } from "@/hooks/useAppointments";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";
import { type AppointmentBase } from "@/types/appointment";
import { useIsMobile } from "@/hooks/use-mobile";

import { AppointmentModalHeader } from "./AppointmentModalHeader";
import { AppointmentModalContent } from "./AppointmentModalContent";
import { AppointmentModalFooterActions } from "./AppointmentModalFooterActions";
import { AppointmentModalAuxDialogs } from "./AppointmentModalAuxDialogs";
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
  onSuccess?: (appointment: AppointmentBase) => void;
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
  onSuccess,
}) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { currentOrganization } = useOrganizations();

  // Use external props if available, otherwise fallback to hooks (for backward compatibility if needed)
  const { therapists: hookTherapists = [], isLoading: therapistsLoading } = useTherapists();
  const therapists = externalTherapists.length > 0 ? externalTherapists : hookTherapists;

  const { data: hookPatients, isLoading: patientsLoading } = useActivePatients({
    enabled: isOpen && externalPatients.length === 0,
    organizationId: currentOrganization?.id,
  }) as { data: Patient[] | undefined; isLoading: boolean };
  const activePatients = externalPatients.length > 0 ? externalPatients : hookPatients || [];
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
  const { setValue, watch } = methods;

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

  const { watchedDate, timeSlots, selectedPatientName, handleAutoSchedule, handleScheduleAnyway } =
    logic;

  const watchedStatus = watch("status");

  return (
    <FormProvider {...methods}>
      <CustomModal
        open={isOpen}
        onOpenChange={(open) => !open && onClose()}
        isMobile={isMobile}
        contentClassName="max-w-4xl"
      >
        <AppointmentModalHeader currentMode={currentMode} onClose={onClose} />

        <AppointmentModalContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
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
          normalizedAppointmentPatientName={getAppointmentPatientName(appointment)}
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
          selectedEquipments={selectedEquipments}
          setSelectedEquipments={setSelectedEquipments}
          recurringConfig={recurringConfig}
          setRecurringConfig={state.setRecurringConfig}
          reminders={reminders}
          setReminders={setReminders}
          onDuplicate={() => setDuplicateDialogOpen(true)}
          onSubmitAppointment={handleSave}
        />

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
            methods.handleSubmit((data) => handleSave(data, recurringConfig))();
          }}
          isMobile={isMobile}
          hasAppointment={!!appointment}
        />

        <AppointmentModalAuxDialogs
          appointment={appointment}
          quickPatientModalOpen={quickPatientModalOpen}
          setQuickPatientModalOpen={setQuickPatientModalOpen}
          suggestedPatientName={suggestedPatientName}
          setSuggestedPatientName={setSuggestedPatientName}
          setValue={setValue}
          setLastCreatedPatient={setLastCreatedPatient}
          duplicateDialogOpen={duplicateDialogOpen}
          setDuplicateDialogOpen={setDuplicateDialogOpen}
          onDuplicate={handleDuplicate}
          capacityDialogOpen={capacityDialogOpen}
          setCapacityDialogOpen={setCapacityDialogOpen}
          conflictCheck={conflictCheck}
          watchedDate={watchedDate}
          watch={watch}
          getMinCapacityForInterval={getMinCapacityForInterval}
          onAddToWaitlist={() => {
            setCapacityDialogOpen(false);
            setWaitlistQuickAddOpen(true);
          }}
          onChooseAnotherTime={() => {
            setCapacityDialogOpen(false);
            setActiveTab("info");
          }}
          onScheduleAnyway={handleScheduleAnyway}
          waitlistQuickAddOpen={waitlistQuickAddOpen}
          setWaitlistQuickAddOpen={setWaitlistQuickAddOpen}
          pendingFormData={pendingFormData}
          setPendingFormData={setPendingFormData}
        />
      </CustomModal>
    </FormProvider>
  );
};

export default AppointmentModal;
