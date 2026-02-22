import { useState, useCallback } from 'react';
import { isSameDay, startOfDay } from 'date-fns';
import { Appointment } from '@/types/appointment';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { toast } from 'sonner';
import { APPOINTMENT_CONFLICT_MESSAGE, isAppointmentConflictError } from '@/utils/appointmentErrors';
import { parseResponseDate } from '@/utils/dateUtils';

interface DragState {
  appointment: Appointment | null;
  isDragging: boolean;
  savingAppointmentId: string | null;
}

interface DropTarget {
  date: Date;
  time: string;
}

interface UseCalendarDragDndKitProps {
  onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string, ignoreCapacity?: boolean) => Promise<void>;
  onOptimisticUpdate?: (appointmentId: string, newDate: Date, newTime: string) => void;
  onRevertUpdate?: (appointmentId: string) => void;
  getAppointmentsForSlot?: (date: Date, time: string) => Appointment[];
  getMinCapacityForInterval?: (dayOfWeek: number, startTimeStr: string, duration: number) => number;
}

/**
 * Normaliza uma data para garantir consistência de timezone.
 */
const normalizeDate = (date: Date | string): Date => {
  if (typeof date === 'string') {
    return parseResponseDate(date);
  }
  return startOfDay(date);
};

/**
 * Cria uma data local a partir de componentes, evitando problemas de timezone.
 */
const createLocalDate = (year: number, month: number, day: number): Date => {
  return new Date(year, month, day, 12, 0, 0);
};

interface PendingReschedule {
  appointment: Appointment;
  newDate: Date;
  newTime: string;
  ignoreCapacity?: boolean;
}

interface PendingOverCapacity extends PendingReschedule {
  currentCount: number;
  maxCapacity: number;
}

const NON_CAPACITY_STATUSES = new Set([
  'cancelado',
  'falta',
  'faltou',
  'remarcado',
  'reagendado',
  'paciente_faltou'
]);

const isCapacityCountedStatus = (status: string | undefined): boolean => {
  return !NON_CAPACITY_STATUSES.has((status || '').toLowerCase());
};

/**
 * Hook for managing calendar drag and drop with @dnd-kit.
 *
 * This hook manages the drag state and provides handlers for drag events.
 * It integrates with the reschedule confirmation dialog and handles optimistic updates.
 */
export const useCalendarDragDndKit = ({
  onAppointmentReschedule,
  onOptimisticUpdate,
  onRevertUpdate,
  getAppointmentsForSlot,
  getMinCapacityForInterval
}: UseCalendarDragDndKitProps) => {
  const [dragState, setDragState] = useState<DragState>({
    appointment: null,
    isDragging: false,
    savingAppointmentId: null
  });
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showOverCapacityDialog, setShowOverCapacityDialog] = useState(false);
  const [pendingReschedule, setPendingReschedule] = useState<PendingReschedule | null>(null);
  const [pendingOverCapacity, setPendingOverCapacity] = useState<PendingOverCapacity | null>(null);

  const handleDragStart = useCallback((appointment: Appointment) => {
    logger.debug('[useCalendarDragDndKit] handleDragStart', {
      appointmentId: appointment.id,
      hasOnAppointmentReschedule: !!onAppointmentReschedule
    }, 'useCalendarDragDndKit');

    if (!onAppointmentReschedule) {
      logger.warn('[useCalendarDragDndKit] onAppointmentReschedule não está definido, drag não será iniciado', {}, 'useCalendarDragDndKit');
      return;
    }

    setDragState({
      appointment,
      isDragging: true,
      savingAppointmentId: null
    });
    setDropTarget(null);
  }, [onAppointmentReschedule]);

  const handleDragOver = useCallback((date: Date, time: string) => {
    if (!dragState.isDragging) return;

    setDropTarget({ date, time });
  }, [dragState.isDragging]);

  const handleDragEnd = useCallback((
    appointment: Appointment | null,
    droppableId: string | null
  ) => {
    // Clear drag state immediately
    setDragState({
      appointment: null,
      isDragging: false,
      savingAppointmentId: null
    });

    if (!droppableId || !appointment || !onAppointmentReschedule) {
      setDropTarget(null);
      return;
    }

    // Parse droppable ID: "slot-YYYY-MM-DD-HH:mm"
    const match = droppableId.match(/slot-(\d{4}-\d{2}-\d{2})-(\d{2}:\d{2})/);
    if (!match) {
      setDropTarget(null);
      return;
    }

    const [, dateStr, timeStr] = match;

    // Parse dateStr (YYYY-MM-DD) safely using utility to avoid timezone issues
    const newDate = parseResponseDate(dateStr);
    const newTime = timeStr;

    // Normalizar a data antiga do appointment para comparação
    const oldDate = normalizeDate(appointment.date);

    // Criar uma nova data local a partir dos componentes da newDate
    const targetDate = createLocalDate(
      newDate.getFullYear(),
      newDate.getMonth(),
      newDate.getDate()
    );

    // Verificar se é o mesmo horário (sem mudança real)
    if (isSameDay(oldDate, targetDate) && appointment.time === newTime) {
      setDropTarget(null);
      return;
    }

    const nextPending: PendingReschedule = {
      appointment,
      newDate: targetDate,
      newTime
    };

    if (getAppointmentsForSlot && getMinCapacityForInterval) {
      const slotAppointments = getAppointmentsForSlot(targetDate, newTime).filter((apt) => apt.id !== appointment.id);
      const activeAppointmentsCount = slotAppointments.filter((apt) => isCapacityCountedStatus(apt.status)).length;
      const duration = Math.max(1, appointment.duration || 60);
      const maxCapacity = getMinCapacityForInterval(targetDate.getDay(), newTime, duration);
      const currentCount = activeAppointmentsCount + 1;

      if (currentCount > maxCapacity) {
        setPendingReschedule(nextPending);
        setPendingOverCapacity({
          ...nextPending,
          currentCount,
          maxCapacity
        });
        setShowOverCapacityDialog(true);
        setDropTarget(null);
        return;
      }
    }

    // Abrir diálogo de confirmação
    setPendingReschedule(nextPending);

    setShowConfirmDialog(true);
    setDropTarget(null);
  }, [getAppointmentsForSlot, getMinCapacityForInterval, onAppointmentReschedule]);

  const executeReschedule = useCallback(async (payload: PendingReschedule) => {
    if (!onAppointmentReschedule) return;

    const { appointment, newDate, newTime } = payload;
    if (!appointment?.id) {
      setShowConfirmDialog(false);
      setShowOverCapacityDialog(false);
      setPendingReschedule(null);
      setPendingOverCapacity(null);
      return;
    }

    // Fecha os diálogos instantaneamente
    setShowConfirmDialog(false);
    setShowOverCapacityDialog(false);

    // Marca o appointment como "saving"
    setDragState({
      appointment: null,
      isDragging: false,
      savingAppointmentId: appointment.id
    });

    // Chama a atualização otimista
    if (onOptimisticUpdate) {
      onOptimisticUpdate(appointment.id, newDate, newTime);
    }

    try {
      await onAppointmentReschedule(appointment, newDate, newTime, payload.ignoreCapacity);

      setDragState({ appointment: null, isDragging: false, savingAppointmentId: null });
      setPendingReschedule(null);
      setPendingOverCapacity(null);
    } catch (error) {
      logger.error('Erro ao reagendar', { error }, 'useCalendarDragDndKit');

      if (isAppointmentConflictError(error)) {
        toast.error(APPOINTMENT_CONFLICT_MESSAGE);
      }

      // Reverte a atualização otimista
      if (onRevertUpdate) {
        onRevertUpdate(appointment.id);
      }

      setDragState({ appointment: null, isDragging: false, savingAppointmentId: null });

      // Reabre o diálogo apropriado para nova decisão do usuário
      if (pendingOverCapacity) {
        setShowOverCapacityDialog(true);
      } else {
        setShowConfirmDialog(true);
      }
    }
  }, [onAppointmentReschedule, onOptimisticUpdate, onRevertUpdate, pendingOverCapacity]);

  const handleConfirmReschedule = useCallback(async () => {
    if (!pendingReschedule) return;
    await executeReschedule(pendingReschedule);
  }, [executeReschedule, pendingReschedule]);

  const handleConfirmOverCapacity = useCallback(async () => {
    if (!pendingReschedule) return;
    await executeReschedule({ ...pendingReschedule, ignoreCapacity: true });
  }, [executeReschedule, pendingReschedule]);

  const handleCancelReschedule = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingReschedule(null);
    setPendingOverCapacity(null);
  }, []);

  const handleCancelOverCapacity = useCallback(() => {
    setShowOverCapacityDialog(false);
    setPendingReschedule(null);
    setPendingOverCapacity(null);
  }, []);

  const clearSaving = useCallback(() => {
    setDragState({ appointment: null, isDragging: false, savingAppointmentId: null });
  }, []);

  return {
    dragState,
    dropTarget,
    showConfirmDialog,
    showOverCapacityDialog,
    pendingReschedule,
    pendingOverCapacity,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleConfirmReschedule,
    handleCancelReschedule,
    handleConfirmOverCapacity,
    handleCancelOverCapacity,
    clearSaving
  };
};
