import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    ArrowLeft, Stethoscope, Calendar, Phone, FileText,
    Zap, Eye, EyeOff, Save, Cloud, Keyboard, CheckCircle2, UserCog
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
  type TherapistOption,
  THERAPIST_SELECT_NONE,
  THERAPIST_PLACEHOLDER,
  getTherapistById,
} from '@/hooks/useTherapists';
import { PatientHelpers } from '@/types';
import { SessionTimer } from '@/components/evolution/SessionTimer';
import { parseResponseDate } from '@/utils/dateUtils';
import type { Patient, Appointment } from '@/types';

interface EvolutionHeaderProps {
    patient: Patient;
    appointment: Appointment;
    treatmentDuration: string;
    evolutionStats: {
        totalEvolutions: number;
        completedGoals: number;
        totalGoals: number;
        avgGoalProgress: number;
        activePathologiesCount: number;
        totalMeasurements: number;
        completionRate: number;
    };
    sessionStartTime: Date;
    onSave: () => void;
    onComplete: () => void;
    isSaving: boolean;
    isCompleting: boolean;
    autoSaveEnabled: boolean;
    toggleAutoSave: () => void;
    lastSavedAt: Date | null;
    showInsights: boolean;
    toggleInsights: () => void;
    onShowTemplateModal: () => void;
    onShowKeyboardHelp: () => void;
    /** Lista de fisioterapeutas para o dropdown (opcional) */
    therapists?: TherapistOption[];
    /** ID do fisioterapeuta responsável pela sessão */
    selectedTherapistId?: string;
    /** Callback ao alterar o fisioterapeuta */
    onTherapistChange?: (therapistId: string) => void;
}

export const EvolutionHeader = memo(({
    patient,
    appointment,
    treatmentDuration,
    evolutionStats,
    sessionStartTime,
    onSave,
    onComplete,
    isSaving,
    isCompleting,
    autoSaveEnabled,
    toggleAutoSave,
    lastSavedAt,
    showInsights,
    toggleInsights,
    onShowTemplateModal,
    onShowKeyboardHelp,
    therapists = [],
    selectedTherapistId = '',
    onTherapistChange,
}: EvolutionHeaderProps) => {
    const navigate = useNavigate();
    const selectedTherapist = selectedTherapistId
        ? getTherapistById(therapists, selectedTherapistId)
        : null;
    const showTherapistFallback = Boolean(selectedTherapistId && !selectedTherapist);

    return (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-border/50 backdrop-blur-sm">
            <div className="relative z-10 p-3 sm:p-4 lg:p-6">
                <div className="flex flex-col gap-4">
                    {/* Patient Info Section - Top row on mobile */}
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/schedule')}
                            className="hover:bg-primary/10 transition-colors flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 touch-target"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm flex-shrink-0">
                                <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-base sm:text-lg font-semibold truncate">{PatientHelpers.getName(patient)}</h1>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shadow-sm">
                                        {treatmentDuration}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground mt-1 flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {appointment?.appointment_date && format(parseResponseDate(appointment.appointment_date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                    </span>
                                    {patient?.phone && (
                                        <span className="flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            <span className="hidden xs:inline">{patient.phone}</span>
                                            <span className="xs:hidden">Tel</span>
                                        </span>
                                    )}
                                    {evolutionStats.totalEvolutions > 0 && (
                                        <span className="flex items-center gap-1">
                                            <FileText className="h-3 w-3" />
                                            {evolutionStats.totalEvolutions} evol.
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fisioterapeuta + CREFITO (quando informado) */}
                    {therapists.length > 0 && onTherapistChange && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
                                <UserCog className="h-3.5 w-3.5" />
                                Fisioterapeuta
                            </span>
                            <Select
                                value={selectedTherapistId || THERAPIST_SELECT_NONE}
                                onValueChange={(v) => onTherapistChange(v === THERAPIST_SELECT_NONE ? '' : v)}
                                aria-label={THERAPIST_PLACEHOLDER}
                            >
                                <SelectTrigger className="h-8 w-[180px] sm:w-[200px] text-xs">
                                    <SelectValue placeholder={THERAPIST_PLACEHOLDER} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={THERAPIST_SELECT_NONE}>
                                        {THERAPIST_PLACEHOLDER}
                                    </SelectItem>
                                    {showTherapistFallback && (
                                        <SelectItem value={selectedTherapistId}>
                                            Responsável atual
                                        </SelectItem>
                                    )}
                                    {therapists.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.crefito ? `${t.name} (${t.crefito})` : t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedTherapist?.crefito && (
                                <Badge variant="secondary" className="text-[10px] font-mono">
                                    CREFITO {selectedTherapist.crefito}
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Actions Section - Bottom row with better mobile layout */}
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
                        <SessionTimer startTime={sessionStartTime} />
                        <div className="h-6 w-px bg-border hidden sm:block" />
                        <Button
                            onClick={onShowTemplateModal}
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 sm:px-3 hover:bg-primary/10 touch-target flex-shrink-0"
                        >
                            <Zap className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1 text-[10px] xs:text-xs">Template</span>
                        </Button>
                        <Button
                            onClick={toggleInsights}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 px-2 hover:bg-primary/10 touch-target flex-shrink-0"
                        >
                            {showInsights ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                            onClick={toggleAutoSave}
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 hover:bg-primary/10 touch-target flex-shrink-0 relative"
                            title={autoSaveEnabled ? 'Auto Salvar Ativado' : 'Auto Salvar Desativado'}
                        >
                            <Save className={`h-4 w-4 ${autoSaveEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                            {lastSavedAt && autoSaveEnabled && (
                                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            )}
                        </Button>
                        {lastSavedAt && autoSaveEnabled && (
                            <span className="hidden sm:flex items-center gap-1 text-[9px] text-muted-foreground">
                                <Cloud className="h-2.5 w-2.5" />
                                {format(lastSavedAt, 'HH:mm')}
                            </span>
                        )}
                        <Button
                            onClick={() => navigate(`/patients/${patient.id}`)}
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 sm:px-3 hover:bg-primary/10 touch-target flex-shrink-0"
                            title="Ver perfil completo do paciente"
                        >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1 text-[10px] xs:text-xs">Ver Paciente</span>
                        </Button>
                        <Button
                            onClick={onShowKeyboardHelp}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 px-2 hover:bg-primary/10 touch-target flex-shrink-0"
                            title="Atalhos de teclado (?)"
                        >
                            <Keyboard className="h-4 w-4" />
                        </Button>
                        <Button
                            onClick={onSave}
                            size="sm"
                            variant="outline"
                            disabled={isSaving}
                            className="h-8 px-3 sm:px-3 shadow-sm hover:shadow touch-target flex-shrink-0 min-w-[70px]"
                        >
                            <Save className="h-4 w-4" />
                            <span className="hidden xs:inline ml-1 text-xs">{isSaving ? '...' : 'Salvar'}</span>
                        </Button>
                        <Button
                            onClick={onComplete}
                            size="sm"
                            disabled={isSaving || isCompleting}
                            className="h-8 px-3 sm:px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all touch-target flex-shrink-0 min-w-[90px]"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="hidden xs:inline ml-1.5 text-xs font-medium">{isCompleting ? '...' : 'Concluir'}</span>
                        </Button>
                    </div>
                </div>
            </div>
            {/* Subtle decorative elements */}
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-2xl -z-0" />
        </div>
    );
});

EvolutionHeader.displayName = 'EvolutionHeader';
