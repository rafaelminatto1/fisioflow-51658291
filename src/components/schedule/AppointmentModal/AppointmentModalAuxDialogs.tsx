import { parseISO } from "date-fns";
import { UseFormSetValue, UseFormWatch } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { QuickPatientModal } from "../../modals/QuickPatientModal";
import { DuplicateAppointmentDialog } from "../DuplicateAppointmentDialog";
import { CapacityExceededDialog } from "../CapacityExceededDialog";
import { WaitlistQuickAdd } from "../WaitlistQuickAdd";
import type { AppointmentFormData, AppointmentBase } from "@/types/appointment";

interface ConflictCheck {
	totalConflictCount?: number;
}

interface PendingFormData {
	appointment_date?: string;
	appointment_time?: string;
	patient_id?: string;
}

interface AppointmentModalAuxDialogsProps {
	appointment?: AppointmentBase | null;
	quickPatientModalOpen: boolean;
	setQuickPatientModalOpen: (open: boolean) => void;
	suggestedPatientName: string;
	setSuggestedPatientName: (name: string) => void;
	setValue: UseFormSetValue<AppointmentFormData>;
	setLastCreatedPatient: (patient: { id: string; name: string } | null) => void;
	duplicateDialogOpen: boolean;
	setDuplicateDialogOpen: (open: boolean) => void;
	onDuplicate: (config: any) => void;
	capacityDialogOpen: boolean;
	setCapacityDialogOpen: (open: boolean) => void;
	conflictCheck?: ConflictCheck | null;
	watchedDate: Date | null;
	watch: UseFormWatch<AppointmentFormData>;
	getMinCapacityForInterval: (
		day: number,
		time: string,
		duration: number,
	) => number;
	onAddToWaitlist: () => void;
	onChooseAnotherTime: () => void;
	onScheduleAnyway: () => void;
	waitlistQuickAddOpen: boolean;
	setWaitlistQuickAddOpen: (open: boolean) => void;
	pendingFormData: PendingFormData | null;
	setPendingFormData: (data: PendingFormData | null) => void;
}

export function AppointmentModalAuxDialogs({
	appointment,
	quickPatientModalOpen,
	setQuickPatientModalOpen,
	suggestedPatientName,
	setSuggestedPatientName,
	setValue,
	setLastCreatedPatient,
	duplicateDialogOpen,
	setDuplicateDialogOpen,
	onDuplicate,
	capacityDialogOpen,
	setCapacityDialogOpen,
	conflictCheck,
	watchedDate,
	watch,
	getMinCapacityForInterval,
	onAddToWaitlist,
	onChooseAnotherTime,
	onScheduleAnyway,
	waitlistQuickAddOpen,
	setWaitlistQuickAddOpen,
	pendingFormData,
	setPendingFormData,
}: AppointmentModalAuxDialogsProps) {
	const queryClient = useQueryClient();

	return (
		<>
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
				onDuplicate={onDuplicate}
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
				onAddToWaitlist={onAddToWaitlist}
				onChooseAnotherTime={onChooseAnotherTime}
				onScheduleAnyway={onScheduleAnyway}
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
		</>
	);
}
