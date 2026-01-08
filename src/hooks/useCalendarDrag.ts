import { useState, useCallback } from 'react';
import { isSameDay, startOfDay } from 'date-fns';
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

/**
 * Normaliza uma data para garantir consistência de timezone.
 * Usa startOfDay para evitar problemas com offset de horário que
 * podem causar a data parecer ser do dia anterior.
 */
const normalizeDate = (date: Date | string): Date => {
    const d = typeof date === 'string' ? new Date(date) : date;
    // Se a data veio como string ISO (ex: "2026-01-08"), ela será interpretada como UTC
    // Precisamos garantir que seja tratada como local
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Data no formato YYYY-MM-DD - interpretar como local
        const [year, month, day] = date.split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0); // Meio-dia para evitar edge cases
    }
    return startOfDay(d);
};

/**
 * Cria uma data local a partir de componentes, evitando problemas de timezone.
 */
const createLocalDate = (year: number, month: number, day: number): Date => {
    return new Date(year, month, day, 12, 0, 0); // Meio-dia para evitar edge cases
};

export const useCalendarDrag = ({ onAppointmentReschedule }: UseCalendarDragProps) => {
    const [dragState, setDragState] = useState<DragState>({ appointment: null, isDragging: false });
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingReschedule, setPendingReschedule] = useState<{ appointment: Appointment; newDate: Date; newTime: string } | null>(null);

    const handleDragStart = useCallback((e: React.DragEvent, appointment: Appointment) => {
        if (!onAppointmentReschedule) return;

        // Configurar o drag transfer
        e.dataTransfer.setData('text/plain', appointment.id);
        e.dataTransfer.setData('application/json', JSON.stringify({
            id: appointment.id,
            date: appointment.date,
            time: appointment.time
        }));
        e.dataTransfer.effectAllowed = 'move';

        // Criar imagem de preview customizada (opcional)
        if (e.currentTarget instanceof HTMLElement) {
            const rect = e.currentTarget.getBoundingClientRect();
            e.dataTransfer.setDragImage(e.currentTarget, rect.width / 2, 20);
        }

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

    const handleDragLeave = useCallback((e?: React.DragEvent) => {
        // Verificar se realmente saiu do elemento (não para elemento filho)
        if (e) {
            const relatedTarget = e.relatedTarget as Node | null;
            if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
                return;
            }
        }
        setDropTarget(null);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, targetDate: Date, time: string) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('!!! CALENDAR DRAG HANDLE DROP TRIGGERED !!!');
        console.log('[SAFE_DATE_LOG] targetDate:', targetDate);
        console.log('[DEBUG handleDrop] targetDate.toString():', targetDate.toString());
        console.log('[DEBUG handleDrop] targetDate components:', {
            year: targetDate.getFullYear(),
            month: targetDate.getMonth(),
            date: targetDate.getDate(),
            hours: targetDate.getHours()
        });

        // Normalizar a data antiga do appointment para comparação
        const oldDate = normalizeDate(dragState.appointment.date);

        // Criar uma nova data local a partir dos componentes da targetDate
        // Isso garante que não há offset de timezone
        const newDate = createLocalDate(
            targetDate.getFullYear(),
            targetDate.getMonth(),
            targetDate.getDate()
        );

        // DEBUG: Log the created newDate
        console.log('[DEBUG handleDrop] createLocalDate result:', newDate);
        console.log('[DEBUG handleDrop] newDate.toString():', newDate.toString());
        console.log('[DEBUG handleDrop] newDate components:', {
            year: newDate.getFullYear(),
            month: newDate.getMonth(),
            date: newDate.getDate(),
            hours: newDate.getHours()
        });

        // Verificar se é o mesmo horário (sem mudança real)
        if (isSameDay(oldDate, newDate) && dragState.appointment.time === time) {
            handleDragEnd();
            return;
        }

        // Abrir diálogo de confirmação com a data correta
        setPendingReschedule({
            appointment: dragState.appointment,
            newDate: newDate,
            newTime: time
        });
        setShowConfirmDialog(true);
        handleDragEnd();
    }, [dragState.appointment, onAppointmentReschedule, handleDragEnd]);

    const handleConfirmReschedule = useCallback(async () => {
        if (!pendingReschedule || !onAppointmentReschedule) return;

        try {
            await onAppointmentReschedule(
                pendingReschedule.appointment,
                pendingReschedule.newDate,
                pendingReschedule.newTime
            );
            setShowConfirmDialog(false);
            setPendingReschedule(null);
        } catch (error) {
            console.error('Erro ao reagendar:', error);
            // Manter o dialog aberto para que o usuário veja o erro
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
