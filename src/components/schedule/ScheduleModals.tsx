import React, { Suspense, lazy } from 'react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { formatDateToBrazilian } from '@/utils/dateUtils';
import AppointmentModalRefactored from '@/components/schedule/AppointmentModal/index';

// Lazy load the modals - simplified by using default exports
const AppointmentQuickEditModal = lazy(() => import('@/components/schedule/AppointmentQuickEditModal'));
const WaitlistQuickAdd = lazy(() => import('@/components/schedule/WaitlistQuickAdd'));
const KeyboardShortcuts = lazy(() => import('@/components/schedule/KeyboardShortcuts'));

interface ScheduleModalsProps {
  currentDate: Date;
  modals: any;
  actions: any;
}

export const ScheduleModals: React.FC<ScheduleModalsProps> = ({ currentDate, modals, actions }) => {
  return (
    <>
      {/* Modals Layer - AppointmentModal imported directly to avoid lazy loading issues */}
      {modals.quickEditAppointment && (
        <Suspense fallback={null}>
          <AppointmentQuickEditModal
            appointment={modals.quickEditAppointment}
            open={!!modals.quickEditAppointment}
            onOpenChange={(open) => !open && modals.setQuickEditAppointment(null)}
          />
        </Suspense>
      )}

      {modals.isModalOpen && (
        <AppointmentModalRefactored
          isOpen={modals.isModalOpen}
          onClose={() => {
            actions.handleModalClose();
          }}
          appointment={modals.selectedAppointment}
          defaultDate={modals.modalDefaultDate}
          defaultTime={modals.modalDefaultTime}
          defaultPatientId={modals.scheduleFromWaitlist?.patientId}
          mode={modals.selectedAppointment ? 'edit' : 'create'}
        />
      )}

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

      <Suspense fallback={null}>
        <KeyboardShortcuts
          open={modals.showKeyboardShortcuts}
          onOpenChange={modals.setShowKeyboardShortcuts}
        />
      </Suspense>

      <AlertDialog open={modals.showCancelAllTodayDialog} onOpenChange={modals.setShowCancelAllTodayDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar todos os agendamentos</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja cancelar todos os agendamentos de <strong>{formatDateToBrazilian(currentDate)}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={modals.isCancellingAllToday}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                actions.handleCancelAllToday();
              }}
              disabled={modals.isCancellingAllToday}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {modals.isCancellingAllToday ? 'Cancelando…' : 'Cancelar todos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
