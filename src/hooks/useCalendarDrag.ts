import { useState, useCallback, useRef } from 'react';
import { isSameDay, startOfDay } from 'date-fns';
import { Appointment } from '@/types/appointment';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { toast } from 'sonner';
import { APPOINTMENT_CONFLICT_MESSAGE, isAppointmentConflictError } from '@/utils/appointmentErrors';
import { createSimpleDragPreview } from '@/lib/calendar/dragPreview';

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
    // Função para obter appointments em um determinado slot (para preview dinâmica)
    getAppointmentsForSlot?: (date: Date, time: string) => Appointment[];
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

interface DropState {
    dropTarget: DropTarget | null;
    targetAppointments: Appointment[];
}

const initialDropState: DropState = { dropTarget: null, targetAppointments: [] };

export const useCalendarDrag = ({ onAppointmentReschedule, onOptimisticUpdate, onRevertUpdate, getAppointmentsForSlot }: UseCalendarDragProps) => {
    const [dragState, setDragState] = useState<DragState>({ appointment: null, isDragging: false, savingAppointmentId: null });
    const [dropState, setDropState] = useState<DropState>(initialDropState);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingReschedule, setPendingReschedule] = useState<{ appointment: Appointment; newDate: Date; newTime: string } | null>(null);

    const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastDropTargetKeyRef = useRef<string | null>(null);
    const dropRafRef = useRef<number | null>(null);

    const handleDragStart = useCallback((e: React.DragEvent, appointment: Appointment) => {
        lastDropTargetKeyRef.current = null;
        logger.debug('[useCalendarDrag] handleDragStart', {
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

        // Criar preview inicial simples (será atualizado dinamicamente no dragOver)
        const previewCanvas = createSimpleDragPreview(appointment, 240, 64);
        if (previewCanvas) {
            e.dataTransfer.setDragImage(previewCanvas, 120, 32);
        }

        logger.debug('[useCalendarDrag] Drag iniciado', { appointmentId: appointment.id }, 'useCalendarDrag');
        setDragState({ appointment, isDragging: true, savingAppointmentId: null });
        setDropState(initialDropState);
    }, [onAppointmentReschedule]);

    const handleDragEnd = useCallback(() => {
        lastDropTargetKeyRef.current = null;
        if (dropRafRef.current != null) {
            cancelAnimationFrame(dropRafRef.current);
            dropRafRef.current = null;
        }
        if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
        }
        setDragState({ appointment: null, isDragging: false, savingAppointmentId: null });
        setDropState(initialDropState);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, date: Date, time: string) => {
        if (!dragState.isDragging || !onAppointmentReschedule) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
        }

        const dropKey = `${date.getTime()}-${time}`;
        if (lastDropTargetKeyRef.current === dropKey) return;

        const otherApps = getAppointmentsForSlot
            ? getAppointmentsForSlot(date, time).filter(apt => apt.id !== dragState.appointment?.id)
            : [];

        lastDropTargetKeyRef.current = dropKey;
        const nextDropState: DropState = { dropTarget: { date, time }, targetAppointments: otherApps };

        if (dropRafRef.current != null) {
            cancelAnimationFrame(dropRafRef.current);
        }
        dropRafRef.current = requestAnimationFrame(() => {
            dropRafRef.current = null;
            setDropState(nextDropState);
        });
    }, [dragState.isDragging, dragState.appointment, onAppointmentReschedule, getAppointmentsForSlot]);

    const handleDragLeave = useCallback((e?: React.DragEvent) => {
        if (e) {
            const relatedTarget = e.relatedTarget as Node | null;
            if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
                return;
            }
            // Não limpar ao passar para outra célula/card dentro da zona de drop
            const dropZone = document.querySelector('[data-calendar-drop-zone]');
            if (relatedTarget && dropZone?.contains(relatedTarget)) {
                return;
            }
        }
        if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = setTimeout(() => {
            leaveTimeoutRef.current = null;
            lastDropTargetKeyRef.current = null;
            setDropState(initialDropState);
        }, 40);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, targetDate: Date, time: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
        }

        let appointmentToMove = dragState.appointment;

        // Fallback: Tentar recuperar do dataTransfer se o state estiver vazio
        if (!appointmentToMove) {
            try {
                const data = e.dataTransfer.getData('application/json');
                if (data) {
                    const parsed = JSON.parse(data) as { id?: string; date?: string | Date; time?: string };
                    if (parsed?.id != null && (parsed.date != null || parsed.time != null)) {
                        appointmentToMove = {
                            id: parsed.id,
                            date: typeof parsed.date === 'string' ? parsed.date : (parsed.date instanceof Date ? parsed.date.toISOString().slice(0, 10) : ''),
                            time: typeof parsed.time === 'string' ? parsed.time : (parsed.time ?? ''),
                            patientName: '',
                            status: 'agendado',
                            duration: 60
                        } as import('@/types/appointment').Appointment;
                    }
                }
            } catch (err) {
                logger.warn('[useCalendarDrag] Failed to parse dataTransfer', err, 'useCalendarDrag');
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
        setDropState(initialDropState);

        setShowConfirmDialog(true);
    }, [dragState.appointment, handleDragEnd]);

    const handleConfirmReschedule = useCallback(async () => {
        if (!pendingReschedule || !onAppointmentReschedule) return;

        const { appointment, newDate, newTime } = pendingReschedule;
        if (!appointment?.id) {
            setShowConfirmDialog(false);
            setPendingReschedule(null);
            return;
        }

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

            if (isAppointmentConflictError(error)) {
                toast.error(APPOINTMENT_CONFLICT_MESSAGE);
            }

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
        dropTarget: dropState.dropTarget,
        showConfirmDialog,
        pendingReschedule,
        targetAppointments: dropState.targetAppointments,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleConfirmReschedule,
        handleCancelReschedule
    };
};
