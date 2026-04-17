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
import { LazyAppointmentModal } from "@/components/schedule/LazyAppointmentModal";
import { ScheduleModalsState, ScheduleActions } from "@/types/schedule-hooks";
import { KeyboardShortcuts } from "@/components/schedule/KeyboardShortcuts";

const DuplicateAppointmentDialog = lazy(() =>
	import("@/components/schedule/DuplicateAppointmentDialog").then((m) => ({
		default: m.DuplicateAppointmentDialog,
	}))
);
const AppointmentQuickEditModal = lazy(() =>
	import("@/components/schedule/AppointmentQuickEditModal").then((m) => ({
		default: m.AppointmentQuickEditModal,
	}))
);
const WaitlistQuickAdd = lazy(() =>
	import("@/components/schedule/WaitlistQuickAdd").then((m) => ({
		default: m.WaitlistQuickAdd,
	}))
);

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
			{modals.quickEditAppointment && (
				<Suspense fallback={null}>
					<AppointmentQuickEditModal
						appointment={modals.quickEditAppointment}
						open={!!modals.quickEditAppointment}
						onOpenChange={(open) =>
							!open && modals.setQuickEditAppointment(null)
						}
					/>
				</Suspense>
			)}

			<LazyAppointmentModal
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

			{modals.waitlistQuickAdd && (
				<Suspense fallback={null}>
					<WaitlistQuickAdd
						open={!!modals.waitlistQuickAdd}
						onOpenChange={(open) => !open && modals.setWaitlistQuickAdd(null)}
						date={modals.waitlistQuickAdd.date}
						time={modals.waitlistQuickAdd.time}
					/>
				</Suspense>
			)}

			<KeyboardShortcuts
				open={modals.showKeyboardShortcuts}
				onOpenChange={modals.setShowKeyboardShortcuts}
			/>

			<Suspense fallback={null}>
				<DuplicateAppointmentDialog
					open={modals.duplicateDialogOpen}
					onOpenChange={modals.setDuplicateDialogOpen}
					appointment={modals.selectedAppointment}
					onDuplicate={() => modals.setDuplicateDialogOpen(false)}
				/>
			</Suspense>

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

			<AlertDialog
				open={!!modals.capacityConfirmation}
				onOpenChange={(open) => !open && modals.setCapacityConfirmation(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Capacidade máxima atingida</AlertDialogTitle>
						<AlertDialogDescription>
							O horário selecionado já atingiu a capacidade máxima de pacientes.
							Deseja agendar mesmo assim?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (modals.capacityConfirmation) {
									actions.handleAppointmentReschedule(
										modals.capacityConfirmation.appointment,
										modals.capacityConfirmation.newDate,
										modals.capacityConfirmation.newTime,
										true,
									);
								}
							}}
							className="bg-primary hover:bg-primary/90"
						>
							Confirmar Agendamento
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};
