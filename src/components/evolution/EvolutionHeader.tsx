import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    ArrowLeft, Calendar, FileText,
    Zap, Eye, EyeOff, Save, Clock, Keyboard, CheckCircle2, UserCog,
    MoreVertical, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

function getPatientInitials(patient: Patient): string {
    const name = PatientHelpers.getName(patient);
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || '?';
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

    const appointmentDateLabel = appointment?.appointment_date
        ? format(parseResponseDate(appointment.appointment_date), "dd/MM 'às' HH:mm", { locale: ptBR })
        : '';

    const sessionNumber = evolutionStats.totalEvolutions + 1;
    const patientAvatar = (patient as Patient & { avatar_url?: string })?.avatar_url;

    return (
        <div
            className="sticky top-0 z-30 rounded-xl border border-border/50 bg-card shadow-sm backdrop-blur-sm p-4"
            role="banner"
            aria-label="Cabeçalho da evolução"
        >
            {/* Linha 1: Voltar | Identidade do paciente | Ações primárias */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/schedule')}
                        className="shrink-0 h-10 w-10 hover:bg-primary/10 touch-target min-h-[44px] min-w-[44px]"
                        aria-label="Voltar para agenda"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div
                        className="flex items-center gap-3 min-w-0 flex-1"
                        title={[PatientHelpers.getName(patient), appointmentDateLabel, patient?.phone].filter(Boolean).join(' · ')}
                    >
                        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-border/50">
                            {patientAvatar ? (
                                <AvatarImage src={patientAvatar} alt={PatientHelpers.getName(patient)} />
                            ) : null}
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
                                {getPatientInitials(patient)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg font-semibold truncate">
                                    {PatientHelpers.getName(patient)}
                                </h1>
                                <Badge variant="outline" className="text-xs px-2 py-0.5 shrink-0">
                                    Sessão #{sessionNumber}
                                </Badge>
                                {evolutionStats.totalEvolutions > 0 && (
                                    <span className="text-xs text-muted-foreground shrink-0">
                                        {evolutionStats.totalEvolutions} evol. anteriores
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground flex-wrap">
                                {appointment?.appointment_date && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                                        {format(parseResponseDate(appointment.appointment_date), 'dd/MM HH:mm', { locale: ptBR })}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <FileText className="h-3.5 w-3.5 shrink-0" />
                                    {treatmentDuration}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ações primárias */}
                <div className="flex items-center gap-2 shrink-0 flex-shrink-0">
                    <Button
                        onClick={onSave}
                        size="sm"
                        variant="outline"
                        disabled={isSaving}
                        className="h-10 px-4 min-w-[100px] shadow-sm hover:bg-primary/5 touch-target"
                        aria-label={isSaving ? 'Salvando...' : 'Salvar'}
                        title={lastSavedAt && autoSaveEnabled ? `Último salvamento: ${format(lastSavedAt, 'HH:mm')}` : undefined}
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        <span className="ml-2">{isSaving ? 'Salvando...' : 'Salvar'}</span>
                    </Button>
                    <Button
                        onClick={onComplete}
                        size="sm"
                        disabled={isSaving || isCompleting}
                        className="h-10 px-4 min-w-[110px] bg-green-600 hover:bg-green-700 text-white shadow-md touch-target font-medium"
                        aria-label={isCompleting ? 'Concluindo...' : 'Concluir sessão'}
                    >
                        {isCompleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4" />
                        )}
                        <span className="ml-2">{isCompleting ? 'Concluindo...' : 'Concluir'}</span>
                    </Button>
                </div>
            </div>

            {/* Linha 2: Fisioterapeuta | Cronômetro | Resumo | Menu */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50">
                {therapists.length > 0 && onTherapistChange && (
                    <div className="flex items-center gap-2 shrink-0">
                        <UserCog className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Select
                            value={selectedTherapistId || THERAPIST_SELECT_NONE}
                            onValueChange={(v) => onTherapistChange(v === THERAPIST_SELECT_NONE ? '' : v)}
                            aria-label={THERAPIST_PLACEHOLDER}
                        >
                            <SelectTrigger className="h-9 w-[180px] text-sm bg-background/80 border-border/60">
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
                            <Badge variant="secondary" className="text-xs font-mono shrink-0">
                                CREFITO {selectedTherapist.crefito}
                            </Badge>
                        )}
                    </div>
                )}
                <div className="h-6 w-px bg-border shrink-0" aria-hidden />
                <SessionTimer startTime={sessionStartTime} className="shrink-0" />
                <div className="flex-1" />
                <div className="flex items-center gap-1 shrink-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 shrink-0"
                                aria-label="Mais opções"
                                title="Mais opções"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={onShowTemplateModal}>
                                <Zap className="h-4 w-4 mr-2" />
                                Aplicar template
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/patients/${patient.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver perfil do paciente
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onShowKeyboardHelp}>
                                <Keyboard className="h-4 w-4 mr-2" />
                                Atalhos de teclado
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={showInsights}
                                onCheckedChange={() => toggleInsights()}
                            >
                                {showInsights ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                                Mostrar resumo na página
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={autoSaveEnabled}
                                onCheckedChange={() => toggleAutoSave()}
                            >
                                <Save className="h-4 w-4 mr-2" />
                                Auto-salvar
                            </DropdownMenuCheckboxItem>
                            {lastSavedAt && autoSaveEnabled && (
                                <>
                                    <DropdownMenuSeparator />
                                    <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        Último salvamento: {format(lastSavedAt, 'HH:mm')}
                                    </div>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
});

EvolutionHeader.displayName = 'EvolutionHeader';
