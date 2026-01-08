import { useState, useCallback } from 'react';
import { isSameDay } from 'date-fns';
import { Appointment } from '@/types/appointment';

interface DragState {
    appointment: Appointment | null;
    isDragging: boolean;
}

interface DropTarget {
    date: Date;
    time: string;
}

interface UseCalendarDragProps {
    onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string) => Promise<void>;
}

export const useCalendarDrag = ({ onAppointmentReschedule }: UseCalendarDragProps) => {
    const [dragState, setDragState] = useState<DragState>({ appointment: null, isDragging: false });
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingReschedule, setPendingReschedule] = useState<{ appointment: Appointment; newDate: Date; newTime: string } | null>(null);

    const handleDragStart = useCallback((e: React.DragEvent, appointment: Appointment) => {
        if (!onAppointmentReschedule) return;
        e.dataTransfer.setData('text/plain', appointment.id);
        e.dataTransfer.effectAllowed = 'move';
        setDragState({ appointment, isDragging: true });
    }, [onAppointmentReschedule]);

    const handleDragEnd = useCallback(() => {
        setDragState({ appointment: null, isDragging: false });
        setDropTarget(null);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, date: Date, time: string) => {
        if (!dragState.isDragging || !onAppointmentReschedule) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTarget({ date, time });
    }, [dragState.isDragging, onAppointmentReschedule]);

    const handleDragLeave = useCallback(() => {
        setDropTarget(null);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, date: Date, time: string) => {
        e.preventDefault();
        if (!dragState.appointment || !onAppointmentReschedule) return;

        // Verificar se é o mesmo horário
        const oldDate = typeof dragState.appointment.date === 'string'
            ? new Date(dragState.appointment.date)
            : dragState.appointment.date;

        if (isSameDay(oldDate, date) && dragState.appointment.time === time) {
            handleDragEnd();
            return;
        }

        // Abrir diálogo de confirmação
        setPendingReschedule({ appointment: dragState.appointment, newDate: date, newTime: time });
        setShowConfirmDialog(true);
        handleDragEnd();
    }, [dragState.appointment, onAppointmentReschedule, handleDragEnd]);

    const handleConfirmReschedule = useCallback(async () => {
        if (!pendingReschedule || !onAppointmentReschedule) return;

        try {
            await onAppointmentReschedule(pendingReschedule.appointment, pendingReschedule.newDate, pendingReschedule.newTime);
            setShowConfirmDialog(false);
            setPendingReschedule(null);
        } catch (error) {
            console.error('Erro ao reagendar:', error);
        }
    }, [pendingReschedule, onAppointmentReschedule]);

    const handleCancelReschedule = useCallback(() => {
        setShowConfirmDialog(false);
        setPendingReschedule(null);
    }, []);

    return {
        dragState,
        dropTarget,
        showConfirmDialog,
        pendingReschedule,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleConfirmReschedule,
        handleCancelReschedule
    };
};
