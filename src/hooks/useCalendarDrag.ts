import { useState, useCallback } from 'react';
import { isSameDay, startOfDay } from 'date-fns';
import { Appointment } from '@/types/appointment';
import { logger } from '@/lib/errors/logger';

interface DragState {
    appointment: Appointment | null;
    isDragging: boolean;
    savingAppointmentId: string | null;
}

interface DropTarget {
    date: Date;
    time: string;
}

interface UseCalendarDragProps {
    onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string) => Promise<void>;
    onOptimisticUpdate?: (appointmentId: string, newDate: Date, newTime: string) => void;
    onRevertUpdate?: (appointmentId: string) => void;
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

export const useCalendarDrag = ({ onAppointmentReschedule, onOptimisticUpdate, onRevertUpdate }: UseCalendarDragProps) => {
    const [dragState, setDragState] = useState<DragState>({ appointment: null, isDragging: false, savingAppointmentId: null });
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingReschedule, setPendingReschedule] = useState<{ appointment: Appointment; newDate: Date; newTime: string } | null>(null);

    const handleDragStart = useCallback((e: React.DragEvent, appointment: Appointment) => {
        logger.info('[useCalendarDrag] handleDragStart chamado', {
            appointmentId: appointment.id,
            hasOnAppointmentReschedule: !!onAppointmentReschedule
        }, 'useCalendarDrag');

        if (!onAppointmentReschedule) {
            logger.warn('[useCalendarDrag] onAppointmentReschedule não está definido, drag não será iniciado', {}, 'useCalendarDrag');
            return;
        }

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

        logger.info('[useCalendarDrag] Drag iniciado com sucesso', { appointmentId: appointment.id }, 'useCalendarDrag');
        setDragState({ appointment, isDragging: true, savingAppointmentId: null });
    }, [onAppointmentReschedule]);

    const handleDragEnd = useCallback(() => {
        setDragState({ appointment: null, isDragging: false, savingAppointmentId: null });
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

        const appointmentToMove = dragState.appointment;

        // Fallback: Tentar recuperar do dataTransfer se o state estiver vazio
        if (!appointmentToMove) {
            try {
                const data = e.dataTransfer.getData('application/json');
                if (data) {
                    const parsed = JSON.parse(data);
                    // Apenas logar aviso se precisarmos usar o fallback
                    console.debug('[useCalendarDrag] Using dataTransfer fallback', parsed);
                }
            } catch (err) {
                // Silently fail or minimal log
                console.warn('[useCalendarDrag] Failed to parse dataTransfer');
            }
        }

        // Validar que existe appointment para fazer drag
        if (!appointmentToMove || !appointmentToMove.date) {
            handleDragEnd();
            return;
        }

        // Normalizar a data antiga do appointment para comparação
        const oldDate = normalizeDate(appointmentToMove.date);

        // Criar uma nova data local a partir dos componentes da targetDate
        const newDate = createLocalDate(
            targetDate.getFullYear(),
            targetDate.getMonth(),
            targetDate.getDate()
        );

        // Verificar se é o mesmo horário (sem mudança real)
        if (isSameDay(oldDate, newDate) && appointmentToMove.time === time) {
            handleDragEnd();
            return;
        }

        // Abrir diálogo de confirmação com a data correta
        setPendingReschedule({
            appointment: appointmentToMove,
            newDate: newDate,
            newTime: time
        });

        // Limpar o estado de drag visualmente antes de abrir o modal para evitar conflitos de sobreposição (z-index)
        setDragState({ appointment: null, isDragging: false, savingAppointmentId: null });
        setDropTarget(null);

        setShowConfirmDialog(true);
    }, [dragState.appointment, handleDragEnd]);

    const handleConfirmReschedule = useCallback(async () => {
        if (!pendingReschedule || !onAppointmentReschedule) return;

        const { appointment, newDate, newTime } = pendingReschedule;

        // OPTIMISTIC UPDATE: Atualiza a UI imediatamente
        // 1. Fecha o diálogo instantaneamente para melhor UX
        setShowConfirmDialog(false);

        // 2. Marca o appointment como "saving" para mostrar feedback visual
        setDragState({ appointment: null, isDragging: false, savingAppointmentId: appointment.id });

        // 3. Chama a atualização otimista (move o card visualmente imediatamente)
        if (onOptimisticUpdate) {
            onOptimisticUpdate(appointment.id, newDate, newTime);
        }

        try {
            // 4. Faz a chamada API em background
            await onAppointmentReschedule(appointment, newDate, newTime);

            // 5. Limpa o estado de saving após sucesso
            setDragState({ appointment: null, isDragging: false, savingAppointmentId: null });
            setPendingReschedule(null);
        } catch (error) {
            logger.error('Erro ao reagendar', { error }, 'useCalendarDrag');

            // 6. Reverte a atualização otimista em caso de erro
            if (onRevertUpdate) {
                onRevertUpdate(appointment.id);
            }

            setDragState({ appointment: null, isDragging: false, savingAppointmentId: null });

            // 7. Reabre o diálogo para mostrar o erro
            setShowConfirmDialog(true);
        }
    }, [pendingReschedule, onAppointmentReschedule, onOptimisticUpdate, onRevertUpdate]);

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
