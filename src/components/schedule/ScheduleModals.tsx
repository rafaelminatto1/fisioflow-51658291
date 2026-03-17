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

// Lazy load the modals - simplified by using default exports
const AppointmentQuickEditModal = lazy(() => import('@/components/schedule/AppointmentQuickEditModal'));
const AppointmentModalRefactored = lazy(() => import('@/components/schedule/AppointmentModal/index'));
const WaitlistQuickAdd = lazy(() => import('@/components/schedule/WaitlistQuickAdd'));
const KeyboardShortcuts = lazy(() => import('@/components/schedule/KeyboardShortcuts'));

interface ScheduleModalsProps {
  currentDate: Date;
  modals: any;
  actions: any;
}

export const ScheduleModals: React.FC<ScheduleModalsProps> = ({ currentDate, modals, actions }) => {
  return (
    <Suspense fallback={null}>
      {/* Modals Layer - Lazy loaded for better performance */}
      {modals.quickEditAppointment && (
        <AppointmentQuickEditModal
          appointment={modals.quickEditAppointment}
          open={!!modals.quickEditAppointment}
          onOpenChange={(open) => !open && modals.setQuickEditAppointment(null)}
        />
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
    </Suspense>
  );
};
