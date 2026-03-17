import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import { FormProvider } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  Calendar as CalendarIcon, SlidersHorizontal, Check, X
} from 'lucide-react';
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs';
import {
  CustomModal,
  CustomModalFooter
} from '@/components/ui/custom-modal';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  useTherapists,
} from '@/hooks/useTherapists';
import { SimpleCache } from '@/lib/utils';

import { useAuth } from '@/contexts/AuthContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useActivePatients } from '@/hooks/usePatients';
import type { Patient } from '@/types';
import {
  useAppointments,
} from '@/hooks/useAppointments';
import { useScheduleCapacity } from '@/hooks/useScheduleCapacity';
import { useAvailableTimeSlots } from '@/hooks/useAvailableTimeSlots';
import {
  type AppointmentBase,
  type AppointmentFormData,
} from '@/types/appointment';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

import { QuickPatientModal } from '../../modals/QuickPatientModal';
import { DuplicateAppointmentDialog } from '../DuplicateAppointmentDialog';
import { CapacityExceededDialog } from '../CapacityExceededDialog';
import { WaitlistQuickAdd } from '../WaitlistQuickAdd';

import { AppointmentModalHeader } from './AppointmentModalHeader';
import { AppointmentInfoTab } from './AppointmentInfoTab';
import { AppointmentOptionsTab } from './AppointmentOptionsTab';
import { AppointmentModalFooterActions } from './AppointmentModalFooterActions';
import { useAppointmentModalState } from './hooks/useAppointmentModalState';
import { useAppointmentForm } from './hooks/useAppointmentForm';

export interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: AppointmentBase | null;
  defaultDate?: Date;
  defaultTime?: string;
  defaultPatientId?: string;
  mode?: 'create' | 'edit' | 'view';
}

const getAppointmentPatientName = (appointment?: any) =>
  appointment?.patientName ||
  appointment?.patient_name ||
  appointment?.patient?.full_name ||
  appointment?.patient?.name ||
  '';

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  appointment,
  defaultDate,
  defaultTime,
  defaultPatientId,
  mode: initialMode = 'create'
}) => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentOrganization } = useOrganizations();
  const { therapists, isLoading: therapistsLoading } = useTherapists();
  const { data: activePatients, isLoading: patientsLoading } = useActivePatients({
    enabled: isOpen,
    organizationId: currentOrganization?.id,
  }) as { data: Patient[] | undefined; isLoading: boolean };
  const { data: appointments = [] } = useAppointments({ enabled: isOpen, enableRealtime: false });
  const { getMinCapacityForInterval } = useScheduleCapacity();

  const state = useAppointmentModalState({ initialMode });
  const {
    currentMode, setCurrentMode, activeTab, setActiveTab,
    isCalendarOpen, setIsCalendarOpen, recurringConfig, setRecurringConfig,
    conflictCheck, setConflictCheck, quickPatientModalOpen, setQuickPatientModalOpen,
    suggestedPatientName, setSuggestedPatientName, lastCreatedPatient, setLastCreatedPatient,
    selectedEquipments, setSelectedEquipments, reminders, setReminders,
    duplicateDialogOpen, setDuplicateDialogOpen, capacityDialogOpen, setCapacityDialogOpen,
    pendingFormData, setPendingFormData, waitlistQuickAddOpen, setWaitlistQuickAddOpen,
    isNotesExpanded, setIsNotesExpanded
  } = state;
  
  const watchedTherapistId = currentMode === 'view' ? appointment?.therapistId : ''; 
  const effectiveTherapistId = (watchedTherapistId && String(watchedTherapistId).trim()) || user?.uid || '';

  const form = useAppointmentForm({
    appointment,
    defaultDate,
    defaultTime,
    defaultPatientId,
    onClose,
    onOpenCapacityDialog: (data, check) => {
      setPendingFormData(data);
      setConflictCheck(check);
      setCapacityDialogOpen(true);
    },
    appointments,
    effectiveTherapistId,
  });

  const { methods, handleSave, handleDelete, handleDuplicate, isCreating, isUpdating, getInitialFormData, persistAppointment, scheduleOnlyRef } = form;
  const { watch, setValue, handleSubmit, reset } = methods;

  const watchedPatientId = watch('patient_id');
  const watchedDateStr = watch('appointment_date');
  const watchedTime = watch('appointment_time');
  const watchedDuration = watch('duration');
  const watchedStatus = watch('status');
  const watchedNotes = watch('notes');
  const watchPaymentStatus = watch('payment_status');
  const watchPaymentMethod = watch('payment_method');
  const watchPaymentAmount = watch('payment_amount');
  const formWatchedTherapistId = watch('therapist_id');
  
  const currentEffectiveTherapistId = (formWatchedTherapistId && String(formWatchedTherapistId).trim()) || user?.uid || '';

  // Cache para checkPatientHasPreviousSessions
  const patientSessionsCache = useRef(new SimpleCache<string, boolean>(60000));

  const patientSessionsMap = useMemo(() => {
    const map = new Map<string, number>();
    appointments.forEach(apt => {
      if (['concluido', 'atendido', 'em_andamento', 'completado'].includes(apt.status)) {
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

  const handleAutoSchedule = () => {
    if (!watchedDate) {
      toast.error('Selecione uma data primeiro');
      return;
    }
    let preferredPeriod: 'morning' | 'afternoon' | 'evening' | null = null;
    if (watchedPatientId) {
      const patientHistory = appointments.filter(a =>
        a.patientId === watchedPatientId && a.status !== 'cancelado'
      );
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
  };

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

  return (
    <CustomModal open={isOpen} onOpenChange={(open) => !open && onClose()} isMobile={isMobile}>
      <AppointmentModalHeader currentMode={currentMode} onClose={onClose} />

      <FormProvider {...methods}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <div className="px-5 sm:px-6 py-3 border-b shrink-0">
            <TabsList className="grid w-full grid-cols-2 h-10">
              <TabsTrigger value="info" className="flex items-center gap-2 text-xs sm:text-sm">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>Agendamento</span>
              </TabsTrigger>
              <TabsTrigger value="options" className="flex items-center gap-2 text-xs sm:text-sm">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Configurações</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <form id="appointment-form" onSubmit={(e) => {
              e.preventDefault();
              handleSubmit((data) => handleSave(data, recurringConfig), (errors) => {
                logger.error('Form validation errors', { errors }, 'AppointmentModal');
                toast.error('Verifique os campos obrigatórios do formulário');
              })(e);
            }} className="px-5 sm:px-6 py-4">
              <TabsContent value="info">
                <AppointmentInfoTab
                  currentMode={currentMode}
                  patients={activePatients || []}
                  patientsLoading={patientsLoading}
                  defaultPatientId={defaultPatientId}
                  onQuickPatientCreate={(searchTerm) => {
                    setSuggestedPatientName(searchTerm);
                    setQuickPatientModalOpen(true);
                  }}
                  lastCreatedPatient={lastCreatedPatient}
                  normalizedAppointmentPatientName={getAppointmentPatientName(appointment)}
                  selectedPatientName={selectedPatientName}
                  watchedPatientId={watchedPatientId}
                  timeSlots={timeSlots}
                  isCalendarOpen={isCalendarOpen}
                  setIsCalendarOpen={setIsCalendarOpen}
                  getMinCapacityForInterval={getMinCapacityForInterval}
                  conflictCount={conflictCheck?.totalConflictCount || 0}
                  watchedDateStr={watchedDateStr}
                  watchedTime={watchedTime}
                  watchedDuration={watchedDuration}
                  onAutoSchedule={handleAutoSchedule}
                  therapists={therapists}
                  therapistsLoading={therapistsLoading}
                  isNotesExpanded={isNotesExpanded}
                  setIsNotesExpanded={setIsNotesExpanded}
                  watchedNotes={watchedNotes}
                  watchPaymentStatus={watchPaymentStatus}
                  watchPaymentMethod={watchPaymentMethod}
                  watchPaymentAmount={watchPaymentAmount}
                />
              </TabsContent>

              <TabsContent value="options">
                <AppointmentOptionsTab
                  currentMode={currentMode}
                  disabled={currentMode === 'view'}
                  selectedEquipments={selectedEquipments}
                  setSelectedEquipments={setSelectedEquipments}
                  recurringConfig={recurringConfig}
                  setRecurringConfig={setRecurringConfig}
                  reminders={reminders}
                  setReminders={setReminders}
                  onDuplicate={() => setDuplicateDialogOpen(true)}
                />
              </TabsContent>
            </form>
          </div>
        </Tabs>
      </FormProvider>

      <AppointmentModalFooterActions
        currentMode={currentMode}
        isCreating={isCreating}
        isUpdating={isUpdating}
        watchedStatus={watchedStatus}
        onClose={onClose}
        onDelete={handleDelete}
        onEdit={() => setCurrentMode('edit')}
        onSave={() => { scheduleOnlyRef.current = false; }}
        onScheduleOnly={() => {
          scheduleOnlyRef.current = true;
          handleSubmit((data) => handleSave(data, recurringConfig))();
        }}
        isMobile={isMobile}
        hasAppointment={!!appointment}
      />

      <QuickPatientModal
        open={quickPatientModalOpen}
        onOpenChange={(open) => {
          setQuickPatientModalOpen(open);
          if (!open) setSuggestedPatientName('');
        }}
        onPatientCreated={(patientId, patientName) => {
          setValue('patient_id', patientId);
          setLastCreatedPatient({ id: patientId, name: patientName });
          setQuickPatientModalOpen(false);
          setSuggestedPatientName('');
          queryClient.invalidateQueries({ queryKey: ['patients'] });
        }}
        suggestedName={suggestedPatientName}
      />

      <DuplicateAppointmentDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        appointment={appointment || null}
        onDuplicate={handleDuplicate}
      />

      <CapacityExceededDialog
        open={capacityDialogOpen}
        onOpenChange={setCapacityDialogOpen}
        currentCount={(conflictCheck?.totalConflictCount || 0) + 1}
        maxCapacity={watchedDate && watchedTime ? getMinCapacityForInterval(watchedDate.getDay(), watchedTime, watchedDuration) : 1}
        selectedTime={watchedTime || ''}
        selectedDate={watchedDate || new Date()}
        onAddToWaitlist={() => {
          setCapacityDialogOpen(false);
          setWaitlistQuickAddOpen(true);
        }}
        onChooseAnotherTime={() => {
          setCapacityDialogOpen(false);
          setActiveTab('info');
        }}
        onScheduleAnyway={handleScheduleAnyway}
      />

      {waitlistQuickAddOpen && pendingFormData && (
        <WaitlistQuickAdd
          open={waitlistQuickAddOpen}
          onOpenChange={(open) => {
            setWaitlistQuickAddOpen(open);
            if (!open) setPendingFormData(null);
          }}
          date={pendingFormData.appointment_date ? parseISO(pendingFormData.appointment_date) : new Date()}
          time={pendingFormData.appointment_time}
          defaultPatientId={pendingFormData.patient_id}
        />
      )}
    </CustomModal>
  );
};

export default AppointmentModal;
