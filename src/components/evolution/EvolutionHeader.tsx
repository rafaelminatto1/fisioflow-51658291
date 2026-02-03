import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    ArrowLeft, Stethoscope, Calendar, Phone, FileText,
    Zap, Eye, EyeOff, Save, Clock, Keyboard, CheckCircle2, UserCog
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
    therapists?: TherapistOption[];
    selectedTherapistId?: string;
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
        <div className="space-y-4">
            {/* 1. Bloco do paciente: voltar + card com nome, duração, data, contato */}
            <div className="flex items-start gap-3 sm:gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/schedule')}
                    className="shrink-0 h-9 w-9 hover:bg-primary/10 transition-colors touch-target"
                    aria-label="Voltar para agenda"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-3 sm:p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                            <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">
                                    {PatientHelpers.getName(patient)}
                                </h1>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                                    {treatmentDuration}
                                </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                                {appointment?.appointment_date && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3 shrink-0" />
                                        {format(parseResponseDate(appointment.appointment_date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                    </span>
                                )}
                                {patient?.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3 shrink-0" />
                                        <span className="hidden xs:inline">{patient.phone}</span>
                                        <span className="xs:hidden">Tel</span>
                                    </span>
                                )}
                                {evolutionStats.totalEvolutions > 0 && (
                                    <span className="flex items-center gap-1">
                                        <FileText className="h-3 w-3 shrink-0" />
                                        {evolutionStats.totalEvolutions} evol.
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Barra de sessão: fisioterapeuta + ferramentas à esquerda, ações principais à direita */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-xl border border-border/50 bg-muted/30 backdrop-blur-sm p-3 sm:p-4">
                {/* Esquerda: responsável + cronômetro + template + insights + auto-save */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
                    {therapists.length > 0 && onTherapistChange && (
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                                <UserCog className="h-3.5 w-3.5" />
                                Fisioterapeuta
                            </span>
                            <Select
                                value={selectedTherapistId || THERAPIST_SELECT_NONE}
                                onValueChange={(v) => onTherapistChange(v === THERAPIST_SELECT_NONE ? '' : v)}
                                aria-label={THERAPIST_PLACEHOLDER}
                            >
                                <SelectTrigger className="h-8 w-[180px] sm:w-[200px] text-xs bg-background/80">
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
                                <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
                                    CREFITO {selectedTherapist.crefito}
                                </Badge>
                            )}
                        </div>
                    )}
                    {therapists.length > 0 && onTherapistChange && (
                        <div className="hidden sm:block h-6 w-px bg-border shrink-0" aria-hidden />
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        <SessionTimer startTime={sessionStartTime} />
                        <div className="h-6 w-px bg-border shrink-0" aria-hidden />
                        <Button
                            onClick={onShowTemplateModal}
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 sm:px-3 hover:bg-primary/10 shrink-0"
                            title="Aplicar template"
                        >
                            <Zap className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1.5 text-xs">Template</span>
                        </Button>
                        <Button
                            onClick={toggleInsights}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-primary/10 shrink-0"
                            title={showInsights ? 'Ocultar resumo' : 'Mostrar resumo'}
                        >
                            {showInsights ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                            onClick={toggleAutoSave}
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 hover:bg-primary/10 shrink-0 relative"
                            title={autoSaveEnabled ? 'Auto salvar ativado' : 'Auto salvar desativado'}
                        >
                            <Save className={`h-4 w-4 ${autoSaveEnabled ? 'text-green-600' : 'text-muted-foreground'}`} />
                            {lastSavedAt && autoSaveEnabled && (
                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            )}
                        </Button>
                        {lastSavedAt && autoSaveEnabled && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0" title="Último salvamento">
                                <Clock className="h-3 w-3" />
                                {format(lastSavedAt, 'HH:mm')}
                            </span>
                        )}
                    </div>
                </div>

                {/* Direita: Ver paciente, atalhos, Salvar, Concluir */}
                <div className="flex flex-wrap items-center gap-2 lg:pl-4 lg:border-l lg:border-border/60 shrink-0">
                    <Button
                        onClick={() => navigate(`/patients/${patient.id}`)}
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 sm:px-3 hover:bg-primary/10"
                        title="Ver perfil completo do paciente"
                    >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1.5 text-xs">Ver Paciente</span>
                    </Button>
                    <Button
                        onClick={onShowKeyboardHelp}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-primary/10"
                        title="Atalhos de teclado"
                    >
                        <Keyboard className="h-4 w-4" />
                    </Button>
                    <div className="h-6 w-px bg-border shrink-0" aria-hidden />
                    <Button
                        onClick={onSave}
                        size="sm"
                        variant="outline"
                        disabled={isSaving}
                        className="h-8 px-3 min-w-[72px] shadow-sm hover:bg-primary/5"
                    >
                        <Save className="h-4 w-4" />
                        <span className="ml-1.5 text-xs">{isSaving ? '...' : 'Salvar'}</span>
                    </Button>
                    <Button
                        onClick={onComplete}
                        size="sm"
                        disabled={isSaving || isCompleting}
                        className="h-8 px-4 min-w-[88px] bg-green-600 hover:bg-green-700 text-white shadow-md"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="ml-1.5 text-xs font-medium">{isCompleting ? '...' : 'Concluir'}</span>
                    </Button>
                </div>
            </div>
        </div>
    );
});

EvolutionHeader.displayName = 'EvolutionHeader';
