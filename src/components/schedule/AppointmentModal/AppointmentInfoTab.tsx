import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  UserCog, Check, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  PatientSelectionSection,
  DateTimeSection,
  PaymentTab
} from '../AppointmentDialogSegments';
import { APPOINTMENT_STATUS_CONFIG } from '../shared/appointment-status';
import { cn } from '@/lib/utils';
import {
  formatTherapistLabel,
  THERAPIST_SELECT_NONE,
  THERAPIST_PLACEHOLDER,
} from '@/hooks/useTherapists';
import { type Patient } from '@/types';
import { type AppointmentFormData } from '@/types/appointment';

interface AppointmentInfoTabProps {
  methods: UseFormReturn<AppointmentFormData>;
  currentMode: 'create' | 'edit' | 'view';
  patients: Patient[];
  patientsLoading: boolean;
  defaultPatientId?: string;
  onQuickPatientCreate: (searchTerm: string) => void;
  lastCreatedPatient: { id: string; name: string } | null;
  normalizedAppointmentPatientName: string;
  selectedPatientName: string;
  timeSlots: string[];
  isCalendarOpen: boolean;
  setIsCalendarOpen: (open: boolean) => void;
  getMinCapacityForInterval: (day: number, time: string, duration: number) => number;
  conflictCount: number;
  onAutoSchedule: () => void;
  therapists: any[];
  therapistsLoading: boolean;
  isNotesExpanded: boolean;
  setIsNotesExpanded: (expanded: boolean) => void;
}

export const AppointmentInfoTab: React.FC<AppointmentInfoTabProps> = ({
  methods,
  currentMode,
  patients,
  patientsLoading,
  defaultPatientId,
  onQuickPatientCreate,
  lastCreatedPatient,
  normalizedAppointmentPatientName,
  selectedPatientName,
  timeSlots,
  isCalendarOpen,
  setIsCalendarOpen,
  getMinCapacityForInterval,
  conflictCount,
  onAutoSchedule,
  therapists,
  therapistsLoading,
  isNotesExpanded,
  setIsNotesExpanded,
}) => {
  const { register, setValue, watch } = methods;

  const watchedPatientId = watch('patient_id');
  const watchedDateStr = watch('appointment_date');
  const watchedTime = watch('appointment_time');
  const watchedDuration = watch('duration');
  const watchedNotes = watch('notes');
  const watchPaymentStatus = watch('payment_status');
  const watchPaymentMethod = watch('payment_method');
  const watchPaymentAmount = watch('payment_amount');

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      {/* Bloco 1: Paciente (Bento High-End) */}
      <div className="md:col-span-12 lg:col-span-7 rounded-2xl border border-blue-100 bg-white/50 backdrop-blur-sm p-5 shadow-premium-sm hover:shadow-premium-md transition-all duration-300">
        <h4 className="font-serif text-lg text-blue-900 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-blue-500 rounded-full" />
          Informações do Paciente
        </h4>
        <PatientSelectionSection
          patients={patients}
          isLoading={patientsLoading}
          disabled={currentMode === 'view' || currentMode === 'edit' || !!defaultPatientId}
          onCreateNew={onQuickPatientCreate}
          fallbackPatientName={
            lastCreatedPatient?.id === watchedPatientId 
              ? lastCreatedPatient.name 
              : (normalizedAppointmentPatientName && normalizedAppointmentPatientName.trim()) 
                ? normalizedAppointmentPatientName 
                : selectedPatientName || undefined
          }
          fallbackDescription={
            lastCreatedPatient?.id === watchedPatientId ? 'Recém-cadastrado' : undefined
          }
        />
      </div>

      {/* Bloco 2: Data e Hora */}
      <div className="md:col-span-6 lg:col-span-5 rounded-2xl border border-blue-100 bg-white/50 backdrop-blur-sm p-5 shadow-premium-sm hover:shadow-premium-md transition-all duration-300">
        <h4 className="font-serif text-lg text-blue-900 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-500 rounded-full" />
          Horário da Sessão
        </h4>
        <DateTimeSection
          disabled={currentMode === 'view'}
          timeSlots={timeSlots}
          isCalendarOpen={isCalendarOpen}
          setIsCalendarOpen={setIsCalendarOpen}
          getMinCapacityForInterval={getMinCapacityForInterval}
          conflictCount={conflictCount}
          watchedDateStr={watchedDateStr}
          watchedTime={watchedTime}
          watchedDuration={watchedDuration}
          onAutoSchedule={onAutoSchedule}
        />
      </div>

      {/* Bloco 3: Profissional e Status */}
      <div className="md:col-span-6 lg:col-span-5 rounded-2xl border border-blue-100 bg-white/50 backdrop-blur-sm p-5 shadow-premium-sm hover:shadow-premium-md transition-all duration-300 space-y-4">
        <h4 className="font-serif text-lg text-blue-900 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-violet-500 rounded-full" />
          Atendimento
        </h4>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <UserCog className="h-3.5 w-3.5" />
              Fisioterapeuta Responsável
            </Label>
            <Select
              value={watch('therapist_id') || THERAPIST_SELECT_NONE}
              onValueChange={(value) => setValue('therapist_id', value === THERAPIST_SELECT_NONE ? '' : value)}
              disabled={currentMode === 'view' || therapistsLoading}
            >
              <SelectTrigger className="h-11 rounded-xl border-blue-100 bg-white shadow-sm ring-offset-background focus:ring-2 focus:ring-blue-500/20">
                <SelectValue placeholder={therapistsLoading ? 'Carregando...' : THERAPIST_PLACEHOLDER} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-blue-100">
                <SelectItem value={THERAPIST_SELECT_NONE}>{THERAPIST_PLACEHOLDER}</SelectItem>
                {therapists.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{formatTherapistLabel(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              Status Atual
            </Label>
            <Select
              value={watch('status') || 'agendado'}
              onValueChange={(value) => setValue('status', value as AppointmentFormData['status'])}
              disabled={currentMode === 'view'}
            >
              <SelectTrigger className="h-11 rounded-xl border-blue-100 bg-white shadow-sm ring-offset-background focus:ring-2 focus:ring-blue-500/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-blue-100">
                {Object.entries(APPOINTMENT_STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full shrink-0', config.iconColor.replace('text-', 'bg-'))} />
                      {config.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Bloco 4: Financeiro */}
      <div className="md:col-span-12 lg:col-span-7 rounded-2xl border border-blue-100 bg-white/50 backdrop-blur-sm p-5 shadow-premium-sm hover:shadow-premium-md transition-all duration-300">
        <h4 className="font-serif text-lg text-blue-900 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-600 rounded-full" />
          Financeiro
        </h4>
        <PaymentTab
          disabled={currentMode === 'view'}
          watchPaymentStatus={watchPaymentStatus || 'pending'}
          watchPaymentMethod={watchPaymentMethod || ''}
          watchPaymentAmount={watchPaymentAmount || 0}
          patientId={watchedPatientId}
          patientName={selectedPatientName}
        />
      </div>

      {/* Bloco 5: Observações */}
      <div className="md:col-span-12 rounded-2xl border border-blue-100 bg-white/50 backdrop-blur-sm p-5 shadow-premium-sm hover:shadow-premium-md transition-all duration-300">
        <Collapsible open={isNotesExpanded} onOpenChange={setIsNotesExpanded}>
          <div className="space-y-4">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer group">
                <h4 className="font-serif text-lg text-blue-900 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-amber-400 rounded-full" />
                  Observações e Notas
                </h4>
                {isNotesExpanded ? <ChevronUp className="h-5 w-5 text-blue-400" /> : <ChevronDown className="h-5 w-5 text-blue-400" />}
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent className="pt-2">
              <Textarea
                {...register('notes')}
                placeholder="Informações importantes sobre o atendimento..."
                rows={3}
                disabled={currentMode === 'view'}
                className="resize-none text-sm min-h-[100px] border-blue-100 focus-visible:ring-blue-500/20 rounded-xl bg-white shadow-inner"
              />
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </div>
  );
};
