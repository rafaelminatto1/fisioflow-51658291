import { Appointment } from "@/types/appointment";

export interface ScheduleModalsState {
	selectedAppointment: Appointment | null;
	quickEditAppointment: Appointment | null;
	setQuickEditAppointment: (appointment: Appointment | null) => void;
	isModalOpen: boolean;
	setIsModalOpen: (open: boolean) => void;
	modalDefaultDate: Date | undefined;
	modalDefaultTime: string | undefined;
	waitlistQuickAdd: { date: Date; time: string } | null;
	setWaitlistQuickAdd: (data: { date: Date; time: string } | null) => void;
	scheduleFromWaitlist: { patientId: string; patientName: string } | null;
	showKeyboardShortcuts: boolean;
	setShowKeyboardShortcuts: (show: boolean) => void;
	duplicateDialogOpen: boolean;
	setDuplicateDialogOpen: (open: boolean) => void;
	showCancelAllTodayDialog: boolean;
	setShowCancelAllTodayDialog: (show: boolean) => void;
	isCancellingAllToday: boolean;
	rescheduleSuccessMessage: string | null;
	setRescheduleSuccessMessage: (message: string | null) => void;
}

export interface ScheduleActions {
	handleCreateAppointment: () => void;
	handleTimeSlotClick: (date: Date, time: string) => void;
	handleModalClose: () => void;
	handleAppointmentReschedule: (
		appointment: Appointment,
		newDate: Date,
		newTime: string,
		ignoreCapacity?: boolean,
	) => Promise<void>;
	handleEditAppointment: (appointment: Appointment) => void;
	handleDeleteAppointment: (appointment: Appointment) => Promise<void>;
	handleDuplicateAppointment: (appointment: Appointment) => void;
	handleUpdateStatus: (
		appointmentId: string,
		newStatus: string,
	) => Promise<void>;
	handleAppointmentClick: (appointment: Appointment) => void;
	handleScheduleFromWaitlist: (patientId: string, patientName: string) => void;
	handleCancelAllToday: () => Promise<void>;
	checkEditUrlParam: (appointments: Appointment[]) => void;
}
