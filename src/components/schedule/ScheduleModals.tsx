import React, { Suspense, lazy } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDateToBrazilian } from "@/utils/dateUtils";
import { AppointmentModal } from "@/components/schedule/AppointmentModal";
import { DuplicateAppointmentDialog } from "@/components/schedule/DuplicateAppointmentDialog";
import { ScheduleModalsState, ScheduleActions } from "@/types/schedule-hooks";

import { AppointmentQuickEditModal } from "@/components/schedule/AppointmentQuickEditModal";
import { WaitlistQuickAdd } from "@/components/schedule/WaitlistQuickAdd";
import { KeyboardShortcuts } from "@/components/schedule/KeyboardShortcuts";

interface ScheduleModalsProps {
	currentDate: Date;
	modals: ScheduleModalsState;
	actions: ScheduleActions;
	therapists?: any[];
	patients?: any[];
}

export const ScheduleModals: React.FC<ScheduleModalsProps> = ({
	currentDate,
	modals,
	actions,
	therapists,
	patients,
}) => {
	return (
		<>
			{/* Modals Layer - AppointmentModal imported directly to avoid lazy loading issues */}
			{modals.quickEditAppointment && (
				<AppointmentQuickEditModal
					appointment={modals.quickEditAppointment}
					open={!!modals.quickEditAppointment}
					onOpenChange={(open) =>
						!open && modals.setQuickEditAppointment(null)
					}
				/>
			)}

			{modals.isModalOpen && (
				<AppointmentModal
					isOpen={modals.isModalOpen}
					onClose={() => {
						actions.handleModalClose();
					}}
					appointment={modals.selectedAppointment}
					defaultDate={modals.modalDefaultDate}
					defaultTime={modals.modalDefaultTime}
					defaultPatientId={modals.scheduleFromWaitlist?.patientId}
					mode={modals.selectedAppointment ? "edit" : "create"}
					therapists={therapists}
					patients={patients}
				/>
			)}

			{modals.waitlistQuickAdd && (
				<WaitlistQuickAdd
					open={!!modals.waitlistQuickAdd}
					onOpenChange={(open) => !open && modals.setWaitlistQuickAdd(null)}
					date={modals.waitlistQuickAdd.date}
					time={modals.waitlistQuickAdd.time}
				/>
			)}

			<KeyboardShortcuts
				open={modals.showKeyboardShortcuts}
				onOpenChange={modals.setShowKeyboardShortcuts}
			/>

			<DuplicateAppointmentDialog
				open={modals.duplicateDialogOpen}
				onOpenChange={modals.setDuplicateDialogOpen}
				appointment={modals.selectedAppointment}
				onDuplicate={() => modals.setDuplicateDialogOpen(false)}
			/>

			<AlertDialog
				open={modals.showCancelAllTodayDialog}
				onOpenChange={modals.setShowCancelAllTodayDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancelar todos os agendamentos</AlertDialogTitle>
						<AlertDialogDescription>
							Deseja cancelar todos os agendamentos de{" "}
							<strong>{formatDateToBrazilian(currentDate)}</strong>? Esta ação
							não pode ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={modals.isCancellingAllToday}>
							Voltar
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								actions.handleCancelAllToday();
							}}
							disabled={modals.isCancellingAllToday}
							className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
						>
							{modals.isCancellingAllToday ? "Cancelando…" : "Cancelar todos"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};
