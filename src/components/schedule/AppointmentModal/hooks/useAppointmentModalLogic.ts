import { useEffect, useMemo, useCallback, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { parseISO, format } from 'date-fns';
import { toast } from 'sonner';
import { SimpleCache } from '@/lib/utils';
import { useAvailableTimeSlots } from '@/hooks/useAvailableTimeSlots';
import { type AppointmentBase, type AppointmentFormData, type RecurringConfig } from '@/types/appointment';
import { type Patient } from '@/types';

interface UseAppointmentModalLogicProps {
  isOpen: boolean;
  appointment?: AppointmentBase | null;
  defaultDate?: Date;
  defaultTime?: string;
  defaultPatientId?: string;
  initialMode: 'create' | 'edit' | 'view';
  appointments: AppointmentBase[];
  activePatients?: Patient[];
  getInitialFormData: (apt: AppointmentBase | null | undefined, defaults: any) => AppointmentFormData;
  state: any; // The state from useAppointmentModalState
  persistAppointment: (data: AppointmentFormData, config: RecurringConfig, ignore: boolean) => Promise<void>;
  methods: UseFormReturn<AppointmentFormData>;
}

const getAppointmentPatientName = (appointment?: any) =>
  appointment?.patientName ||
  appointment?.patient_name ||
  appointment?.patient?.full_name ||
  appointment?.patient?.name ||
  '';

export const useAppointmentModalLogic = ({
  isOpen,
  appointment,
  defaultDate,
  defaultTime,
  defaultPatientId,
  initialMode,
  appointments,
  activePatients,
  getInitialFormData,
  state,
  persistAppointment,
  methods,
}: UseAppointmentModalLogicProps) => {
  const { watch, setValue, reset } = methods;
  const {
    currentMode, setCurrentMode, setActiveTab, setIsNotesExpanded,
    setRecurringConfig, setCapacityDialogOpen, setPendingFormData,
    lastCreatedPatient, recurringConfig, pendingFormData
  } = state;

  const watchedPatientId = watch('patient_id');
  const watchedDateStr = watch('appointment_date');
  const watchedTime = watch('appointment_time');
  const watchedDuration = watch('duration');

  // Cache for patient history
  const patientSessionsCache = useRef(new SimpleCache<string, boolean>(60000));

  const patientSessionsMap = useMemo(() => {
    const map = new Map<string, number>();
    appointments.forEach(apt => {
      const s = (apt.status || '').toLowerCase();
      if (['atendido', 'concluido', 'realizado', 'completado'].includes(s)) {
        map.set(apt.patientId, (map.get(apt.patientId) || 0) + 1);
      }
    });
    return map;
  }, [appointments]);

  const checkPatientHasPreviousSessions = useCallback((patientId: string): boolean => {
    const cached = patientSessionsCache.current.get(patientId);
    if (cached !== undefined) return cached;
    const hasSessions = (patientSessionsMap.get(patientId) || 0) > 0;
    patientSessionsCache.current.set(patientId, hasSessions);
    return hasSessions;
  }, [patientSessionsMap]);

  const lastStatusPatientIdRef = useRef<string | null>(null);

  // Auto-set status to 'avaliacao' for new patients
  useEffect(() => {
    if (!appointment && isOpen && watchedPatientId && currentMode === 'create') {
      if (lastStatusPatientIdRef.current === watchedPatientId) return;
      lastStatusPatientIdRef.current = watchedPatientId;

      const hasPreviousSessions = checkPatientHasPreviousSessions(watchedPatientId);
      if (!hasPreviousSessions) {
        setValue('status', 'avaliacao');
      } else {
        setValue('status', 'agendado');
      }
    }
  }, [watchedPatientId, isOpen, appointment, currentMode, checkPatientHasPreviousSessions, setValue]);

  // Reset form when modal opens or appointment changes
  useEffect(() => {
    if (!isOpen) {
      lastStatusPatientIdRef.current = null;
      return;
    }
    const formData = getInitialFormData(appointment, {
      date: defaultDate,
      time: defaultTime,
      patientId: defaultPatientId
    });
    reset(formData);
    setCurrentMode(appointment ? 'edit' : initialMode);
    setActiveTab('info');
    setIsNotesExpanded(Boolean(formData.notes?.trim()));
    
    const apptDate = defaultDate || (appointment?.date ? new Date(appointment.date) : new Date());
    const apptTime = defaultTime || (appointment?.time ? String(appointment.time).substring(0, 5) : '09:00');
    setRecurringConfig({
      days: [{ day: apptDate.getDay(), time: apptTime }],
      endType: 'sessions',
      sessions: 10,
      endDate: '',
    });
  }, [appointment, isOpen, defaultDate, defaultTime, defaultPatientId, initialMode, reset, setCurrentMode, setActiveTab, setIsNotesExpanded, setRecurringConfig, getInitialFormData]);

  const watchedDate = useMemo(() => {
    if (!watchedDateStr) return null;
    return typeof watchedDateStr === 'string' ? parseISO(watchedDateStr) : watchedDateStr;
  }, [watchedDateStr]);

  const { timeSlots: slotInfo, isDayClosed } = useAvailableTimeSlots(watchedDate);

  const timeSlots = useMemo(() => {
    let slots: string[] = [];
    if (slotInfo.length === 0 && !isDayClosed) {
      for (let hour = 7; hour < 21; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
        }
      }
    } else {
      slots = slotInfo.map(s => s.time);
    }
    if (watchedTime && !slots.includes(watchedTime)) {
      return [...slots, watchedTime].sort((a, b) => a.localeCompare(b));
    }
    return slots;
  }, [slotInfo, isDayClosed, watchedTime]);

  const selectedPatientName = useMemo(() => {
    if (lastCreatedPatient?.id === watchedPatientId) {
      return lastCreatedPatient.name;
    }
    const selectedPatient = activePatients?.find((patient) => patient.id === watchedPatientId);
    return selectedPatient?.full_name || selectedPatient?.name || getAppointmentPatientName(appointment) || '';
  }, [activePatients, lastCreatedPatient, appointment, watchedPatientId]);

  const handleAutoSchedule = useCallback(() => {
    if (!watchedDate) {
      toast.error('Selecione uma data primeiro');
      return;
    }
    let preferredPeriod: 'morning' | 'afternoon' | 'evening' | null = null;
    if (watchedPatientId) {
      const patientHistory = appointments.filter(a => {
        const s = (a.status || '').toLowerCase();
        return a.patientId === watchedPatientId && !['cancelado', 'remarcar', 'canceled'].includes(s);
      });
      if (patientHistory.length > 0) {
        let morning = 0, afternoon = 0, evening = 0;
        patientHistory.forEach(apt => {
          const hour = parseInt(apt.time.split(':')[0]);
          if (hour < 12) morning++;
          else if (hour < 18) afternoon++;
          else evening++;
        });
        if (morning > afternoon && morning > evening) preferredPeriod = 'morning';
        else if (afternoon > morning && afternoon > evening) preferredPeriod = 'afternoon';
        else if (evening > morning && evening > afternoon) preferredPeriod = 'evening';
      }
    }
    const sortedSlots = [...slotInfo].sort((a, b) => {
      if (!preferredPeriod) return 0;
      const getPeriod = (time: string) => {
        const h = parseInt(time.split(':')[0]);
        if (h < 12) return 'morning';
        if (h < 18) return 'afternoon';
        return 'evening';
      };
      const periodA = getPeriod(a.time);
      const periodB = getPeriod(b.time);
      if (periodA === preferredPeriod && periodB !== preferredPeriod) return -1;
      if (periodA !== preferredPeriod && periodB === preferredPeriod) return 1;
      return 0;
    });
    const bestSlot = sortedSlots.find(slot => slot.isAvailable);
    if (bestSlot) {
      setValue('appointment_time', bestSlot.time);
      let reason = "";
      if (preferredPeriod === 'morning') reason = " (Preferência: Manhã)";
      else if (preferredPeriod === 'afternoon') reason = " (Preferência: Tarde)";
      else if (preferredPeriod === 'evening') reason = " (Preferência: Noite)";
      toast.success(`Horário sugerido: ${bestSlot.time}${reason}`);
    } else {
      toast.error('Nenhum horário livre encontrado para esta data');
    }
  }, [watchedDate, watchedPatientId, appointments, slotInfo, setValue]);

  const handleScheduleAnyway = async () => {
    if (!pendingFormData) return;
    try {
      await persistAppointment(pendingFormData, recurringConfig, true);
      toast.warning('Agendamento confirmado acima da capacidade configurada.');
      setCapacityDialogOpen(false);
      setPendingFormData(null);
    } catch (error: any) {
      toast.error('Erro ao confirmar agendamento.');
    }
  };

  return {
    watchedPatientId,
    watchedDateStr,
    watchedTime,
    watchedDuration,
    watchedDate,
    timeSlots,
    selectedPatientName,
    handleAutoSchedule,
    handleScheduleAnyway,
  };
};
