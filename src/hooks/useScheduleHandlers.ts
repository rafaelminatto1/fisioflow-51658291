import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { AppointmentService } from '@/services/appointmentService';
import { getUserOrganizationId } from '@/utils/userHelpers';
import { formatDateToLocalISO, formatDateToBrazilian } from '@/utils/dateUtils';
import { isAppointmentConflictError, APPOINTMENT_CONFLICT_TITLE, APPOINTMENT_CONFLICT_MESSAGE } from '@/utils/appointmentErrors';
import { fisioLogger as logger } from '@/lib/errors/logger';
import type { Appointment } from '@/types/appointment';
import { useRescheduleAppointment } from '@/hooks/useAppointments';
import { ScheduleModalsState, ScheduleActions } from '@/types/schedule-hooks';

const BUSINESS_HOURS = {
  start: 7,
  end: 21,
  defaultRound: 30,
} as const;

export const roundToNextSlot = (date: Date): string => {
  const minutes = date.getMinutes();
  const roundedMinutes = minutes < BUSINESS_HOURS.defaultRound ? BUSINESS_HOURS.defaultRound : 0;
  let hour = minutes < BUSINESS_HOURS.defaultRound ? date.getHours() : date.getHours() + 1;

  if (hour >= BUSINESS_HOURS.end) {
    hour = BUSINESS_HOURS.start;
  } else if (hour < BUSINESS_HOURS.start) {
    hour = BUSINESS_HOURS.start;
  }

  return `${String(hour).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
};

export function useScheduleHandlers(
  currentDate: Date, 
  refetchAppointments: () => void, 
  isSelectionMode: boolean
): { modals: ScheduleModalsState; actions: ScheduleActions } {
  const [, setSearchParams] = useSearchParams();

  // Modals state
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [quickEditAppointment, setQuickEditAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState<Date | undefined>();
  const [modalDefaultTime, setModalDefaultTime] = useState<string | undefined>();
  
  const [waitlistQuickAdd, setWaitlistQuickAdd] = useState<{ date: Date; time: string } | null>(null);
  const [scheduleFromWaitlist, setScheduleFromWaitlist] = useState<{ patientId: string; patientName: string } | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  
  const [showCancelAllTodayDialog, setShowCancelAllTodayDialog] = useState(false);
  const [isCancellingAllToday, setIsCancellingAllToday] = useState(false);
  const [rescheduleSuccessMessage, setRescheduleSuccessMessage] = useState<string | null>(null);

  const { mutateAsync: rescheduleAppointmentMutation } = useRescheduleAppointment();

  const handleCreateAppointment = useCallback(() => {
    setSelectedAppointment(null);
    const now = new Date();
    setModalDefaultDate(now);
    setModalDefaultTime(roundToNextSlot(now));
    setIsModalOpen(true);
  }, []);

  const handleTimeSlotClick = useCallback((date: Date, time: string) => {
    if (isSelectionMode) return;
    setSelectedAppointment(null);
    setModalDefaultDate(date);
    setModalDefaultTime(time);
    setIsModalOpen(true);
  }, [isSelectionMode]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    // Don't reset selectedAppointment immediately to avoid UI flashing before modal closes fully
    setTimeout(() => {
        setSelectedAppointment(null);
        setModalDefaultDate(undefined);
        setModalDefaultTime(undefined);
        setScheduleFromWaitlist(null);
    }, 300);
  }, []);

  const handleAppointmentReschedule = useCallback(async (appointment: Appointment, newDate: Date, newTime: string, ignoreCapacity?: boolean) => {
    try {
      const formattedDate = formatDateToLocalISO(newDate);
      await rescheduleAppointmentMutation({
        appointmentId: appointment.id,
        appointment_date: formattedDate,
        appointment_time: newTime,
        duration: appointment.duration,
        ignoreCapacity
      });
      toast({
        title: '✅ Reagendado com sucesso',
        description: `Atendimento de ${appointment.patientName} movido para ${formatDateToBrazilian(newDate)} às ${newTime}.`,
      });
      setRescheduleSuccessMessage('Reagendado com sucesso');
    } catch (error) {
      if (isAppointmentConflictError(error)) {
        toast({
          title: APPOINTMENT_CONFLICT_TITLE,
          description: APPOINTMENT_CONFLICT_MESSAGE,
          variant: 'destructive'
        });
      } else {
        toast({
          title: '❌ Erro ao reagendar',
          description: 'Não foi possível reagendar o atendimento.',
          variant: 'destructive'
        });
      }
      throw new Error('Failed to reschedule appointment');
    }
  }, [rescheduleAppointmentMutation]);

  const handleEditAppointment = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  }, []);

  const handleDeleteAppointment = useCallback(async (appointment: Appointment) => {
    try {
      const organizationId = await getUserOrganizationId();
      if (!organizationId) {
        toast({ title: 'Erro', description: 'Organização não encontrada.', variant: 'destructive' });
        return;
      }
      await AppointmentService.deleteAppointment(appointment.id, organizationId);

      toast({
        title: '✅ Agendamento excluído',
        description: `Agendamento de ${appointment.patientName} foi excluído.`
      });
      refetchAppointments();
    } catch (err) {
      logger.error('Erro ao excluir agendamento', err, 'ScheduleHandlers');
      toast({
        title: '❌ Erro ao excluir',
        description: 'Não foi possível excluir o agendamento.',
        variant: 'destructive'
      });
    }
  }, [refetchAppointments]);

  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    setQuickEditAppointment(appointment);
  }, []);

  const handleScheduleFromWaitlistFn = useCallback((patientId: string, patientName: string) => {
    setScheduleFromWaitlist({ patientId, patientName });
    setSelectedAppointment(null);
    setModalDefaultDate(currentDate);
    setIsModalOpen(true);
  }, [currentDate]);

  const handleCancelAllToday = useCallback(async () => {
    const organizationId = await getUserOrganizationId();
    if (!organizationId) {
      toast({
        title: 'Erro',
        description: 'Organização não encontrada. Faça login novamente.',
        variant: 'destructive',
      });
      setShowCancelAllTodayDialog(false);
      return;
    }
    const dateStr = formatDateToLocalISO(currentDate);
    setIsCancellingAllToday(true);
    try {
      const { cancelled, errors } = await AppointmentService.cancelAllAppointmentsForDate(organizationId, dateStr);
      setShowCancelAllTodayDialog(false);
      refetchAppointments();
      if (errors > 0) {
        toast({
          title: 'Concluído com ressalvas',
          description: `${cancelled} agendamento(s) cancelado(s). ${errors} falha(s).`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Agendamentos cancelados',
          description: cancelled === 0
            ? 'Nenhum agendamento encontrado para esta data.'
            : `${cancelled} agendamento(s) de ${formatDateToBrazilian(currentDate)} cancelado(s).`,
        });
      }
    } catch (err) {
      logger.error('Erro ao cancelar agendamentos do dia', err, 'ScheduleHandlers');
      toast({
        title: 'Erro ao cancelar',
        description: 'Não foi possível cancelar os agendamentos.',
        variant: 'destructive',
      });
    } finally {
      setIsCancellingAllToday(false);
    }
  }, [currentDate, refetchAppointments]);

  // Open edit modal directly if ?edit= URL parameter is present
  const checkEditUrlParam = useCallback((appointments: Appointment[]) => {
    const urlParams = new URLSearchParams(window.location.search);
    const editAppointmentId = urlParams.get('edit');
    if (editAppointmentId && appointments.length > 0) {
      const appointmentToEdit = appointments.find(a => a.id === editAppointmentId);
      if (appointmentToEdit) {
        setQuickEditAppointment(appointmentToEdit);
        // Remove param from URL without refreshing
        urlParams.delete('edit');
        setSearchParams(urlParams, { replace: true });
      }
    }
  }, [setSearchParams]);

  const handleDuplicateAppointment = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDuplicateDialogOpen(true);
  }, [setSelectedAppointment, setDuplicateDialogOpen]);

  const handleUpdateStatus = useCallback(async (appointmentId: string, newStatus: string) => {
    try {
      await AppointmentService.updateStatus(appointmentId, newStatus);
      toast({
        title: '✅ Status atualizado',
        description: `Agendamento marcado como ${newStatus}.`,
      });
      refetchAppointments();
    } catch (err) {
      logger.error('Erro ao atualizar status', err, 'ScheduleHandlers');
      toast({
        title: '❌ Erro ao atualizar',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive'
      });
    }
  }, [refetchAppointments]);

  return {
    modals: {
      selectedAppointment,
      quickEditAppointment,
      setQuickEditAppointment,
      isModalOpen,
      setIsModalOpen,
      modalDefaultDate,
      modalDefaultTime,
      waitlistQuickAdd,
      setWaitlistQuickAdd,
      scheduleFromWaitlist,
      showKeyboardShortcuts,
      setShowKeyboardShortcuts,
      showCancelAllTodayDialog,
      setShowCancelAllTodayDialog,
      isCancellingAllToday,
      rescheduleSuccessMessage,
      setRescheduleSuccessMessage
    },
    actions: {
      handleCreateAppointment,
      handleTimeSlotClick,
      handleModalClose,
      handleAppointmentReschedule,
      handleEditAppointment,
      handleDeleteAppointment,
      handleDuplicateAppointment,
      handleUpdateStatus,
      handleAppointmentClick,
      handleScheduleFromWaitlist: handleScheduleFromWaitlistFn,
      handleCancelAllToday,
      checkEditUrlParam
    }
  };
}
