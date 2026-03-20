import { useState } from "react";
import {
	type AppointmentBase,
	type RecurringConfig,
} from "@/types/appointment";
import { type SelectedEquipment } from "../EquipmentSelector";
import { type AppointmentReminderData } from "../AppointmentReminder";
import { type AppointmentFormData } from "@/types/appointment";

interface AppointmentModalStateOptions {
	initialMode: "create" | "edit" | "view";
}

export const useAppointmentModalState = ({
	initialMode,
}: AppointmentModalStateOptions) => {
	const [currentMode, setCurrentMode] = useState<"create" | "edit" | "view">(
		initialMode,
	);
	const [activeTab, setActiveTab] = useState("info");
	const [isCalendarOpen, setIsCalendarOpen] = useState(false);
	const [recurringConfig, setRecurringConfig] = useState<RecurringConfig>({
		days: [],
		endType: "sessions",
		sessions: 10,
		endDate: "",
	});
	const [conflictCheck, setConflictCheck] = useState<{
		hasConflict: boolean;
		conflictingAppointment?: AppointmentBase;
		conflictCount?: number;
		totalConflictCount?: number;
	} | null>(null);

	const [quickPatientModalOpen, setQuickPatientModalOpen] = useState(false);
	const [suggestedPatientName, setSuggestedPatientName] = useState("");
	const [lastCreatedPatient, setLastCreatedPatient] = useState<{
		id: string;
		name: string;
	} | null>(null);

	const [selectedEquipments, setSelectedEquipments] = useState<
		SelectedEquipment[]
	>([]);
	const [reminders, setReminders] = useState<AppointmentReminderData[]>([]);

	const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
	const [capacityDialogOpen, setCapacityDialogOpen] = useState(false);
	const [pendingFormData, setPendingFormData] =
		useState<AppointmentFormData | null>(null);
	const [waitlistQuickAddOpen, setWaitlistQuickAddOpen] = useState(false);
	const [isNotesExpanded, setIsNotesExpanded] = useState(false);

	return {
		currentMode,
		setCurrentMode,
		activeTab,
		setActiveTab,
		isCalendarOpen,
		setIsCalendarOpen,
		recurringConfig,
		setRecurringConfig,
		conflictCheck,
		setConflictCheck,
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
	};
};
