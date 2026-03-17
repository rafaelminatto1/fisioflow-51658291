import React from 'react';
import { useFormContext } from 'react-hook-form';
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
import { STATUS_LABELS, STATUS_COLORS } from '@/constants/appointments';
import { cn } from '@/lib/utils';
import {
  formatTherapistLabel,
  THERAPIST_SELECT_NONE,
  THERAPIST_PLACEHOLDER,
} from '@/hooks/useTherapists';
import { type Patient } from '@/types';
import { type AppointmentFormData } from '@/types/appointment';

interface AppointmentInfoTabProps {
  currentMode: 'create' | 'edit' | 'view';
  patients: Patient[];
  patientsLoading: boolean;
  defaultPatientId?: string;
  onQuickPatientCreate: (searchTerm: string) => void;
  lastCreatedPatient: { id: string; name: string } | null;
  normalizedAppointmentPatientName: string;
  selectedPatientName: string;
  watchedPatientId: string;
  timeSlots: string[];
  isCalendarOpen: boolean;
  setIsCalendarOpen: (open: boolean) => void;
  getMinCapacityForInterval: (day: number, time: string, duration: number) => number;
  conflictCount: number;
  watchedDateStr: string;
  watchedTime: string;
  watchedDuration: number;
  onAutoSchedule: () => void;
  therapists: any[];
  therapistsLoading: boolean;
  isNotesExpanded: boolean;
  setIsNotesExpanded: (expanded: boolean) => void;
  watchedNotes: string;
  watchPaymentStatus: string;
  watchPaymentMethod: string;
  watchPaymentAmount: number;
}

export const AppointmentInfoTab: React.FC<AppointmentInfoTabProps> = ({
  currentMode,
  patients,
  patientsLoading,
  defaultPatientId,
  onQuickPatientCreate,
  lastCreatedPatient,
  normalizedAppointmentPatientName,
  selectedPatientName,
  watchedPatientId,
  timeSlots,
  isCalendarOpen,
  setIsCalendarOpen,
  getMinCapacityForInterval,
  conflictCount,
  watchedDateStr,
  watchedTime,
  watchedDuration,
  onAutoSchedule,
  therapists,
  therapistsLoading,
  isNotesExpanded,
  setIsNotesExpanded,
  watchedNotes,
  watchPaymentStatus,
  watchPaymentMethod,
  watchPaymentAmount,
}) => {
  const { register, setValue, watch } = useFormContext<AppointmentFormData>();

  return (
    <div className="mt-0 space-y-4 sm:space-y-4">
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

      <div className="rounded-[24px] border border-border/70 bg-gradient-to-b from-background to-muted/20 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)] space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
            <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
            Fisioterapeuta
          </Label>
          <Select
            value={watch('therapist_id') || THERAPIST_SELECT_NONE}
            onValueChange={(value) => setValue('therapist_id', value === THERAPIST_SELECT_NONE ? '' : value)}
            disabled={currentMode === 'view' || therapistsLoading}
          >
            <SelectTrigger className="h-10 text-xs sm:text-sm rounded-2xl border-border/60">
              <SelectValue
                placeholder={therapistsLoading ? 'Carregando...' : THERAPIST_PLACEHOLDER}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={THERAPIST_SELECT_NONE}>
                {THERAPIST_PLACEHOLDER}
              </SelectItem>
              {therapists.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {formatTherapistLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-muted-foreground" />
            Status
          </Label>
          <Select
            value={watch('status') || 'agendado'}
            onValueChange={(value) => setValue('status', value as AppointmentFormData['status'])}
            disabled={currentMode === 'view'}
          >
            <SelectTrigger className="h-10 text-xs sm:text-sm rounded-2xl border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['agendado', 'confirmado', 'avaliacao', 'aguardando_confirmacao', 'em_andamento', 'concluido', 'cancelado', 'falta'] as const).map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full shrink-0', STATUS_COLORS[s] || 'bg-gray-400')} />
                    {STATUS_LABELS[s] || s}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <PaymentTab
          disabled={currentMode === 'view'}
          watchPaymentStatus={watchPaymentStatus || 'pending'}
          watchPaymentMethod={watchPaymentMethod || ''}
          watchPaymentAmount={watchPaymentAmount || 0}
          patientId={watchedPatientId}
          patientName={selectedPatientName}
        />
      </div>

      <Collapsible open={isNotesExpanded} onOpenChange={setIsNotesExpanded}>
        <div className="space-y-2">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-auto w-full items-start justify-between px-3 py-2.5 text-left"
            >
              <span className="flex items-start gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                <span className="flex flex-col">
                  <span className="text-xs sm:text-sm font-medium">Observações</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                    {watchedNotes?.trim()
                      ? 'Clique para ver ou editar as observações.'
                      : 'Opcional. Clique para adicionar observações do atendimento.'}
                  </span>
                </span>
              </span>
              {isNotesExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Observações
              </Label>
              <Textarea
                {...register('notes')}
                placeholder="Informações importantes sobre o atendimento..."
                rows={2}
                disabled={currentMode === 'view'}
                className="resize-none text-sm min-h-[70px]"
              />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};
