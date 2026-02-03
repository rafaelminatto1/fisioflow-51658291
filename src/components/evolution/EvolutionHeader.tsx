import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    ArrowLeft, Stethoscope, Calendar, Phone, FileText,
    Zap, Eye, EyeOff, Save, Clock, Keyboard, CheckCircle2, UserCog,
    MoreVertical, BarChart2
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
  type TherapistOption,
  THERAPIST_SELECT_NONE,
  THERAPIST_PLACEHOLDER,
  getTherapistById,
} from '@/hooks/useTherapists';
import { PatientHelpers } from '@/types';
import { SessionTimer } from '@/components/evolution/SessionTimer';
import { EvolutionStats } from '@/components/evolution/EvolutionStats';
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

    const appointmentDateLabel = appointment?.appointment_date
        ? format(parseResponseDate(appointment.appointment_date), "dd/MM 'às' HH:mm", { locale: ptBR })
        : '';

    return (
        <div
            className="flex flex-wrap items-center gap-2 sm:gap-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-2 sm:p-3 h-11 min-h-11"
            role="banner"
            aria-label="Cabeçalho da evolução"
        >
            {/* Esquerda: Voltar + identidade compacta do paciente */}
            <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/schedule')}
                    className="shrink-0 h-8 w-8 hover:bg-primary/10 touch-target"
                    aria-label="Voltar para agenda"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div
                    className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial"
                    title={[PatientHelpers.getName(patient), appointmentDateLabel, patient?.phone].filter(Boolean).join(' · ')}
                >
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                        <Stethoscope className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <h1 className="text-sm font-semibold truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">
                                {PatientHelpers.getName(patient)}
                            </h1>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                                {treatmentDuration}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-x-2 text-[10px] text-muted-foreground truncate">
                            {appointment?.appointment_date && (
                                <span className="flex items-center gap-0.5 shrink-0">
                                    <Calendar className="h-2.5 w-2.5" />
                                    {format(parseResponseDate(appointment.appointment_date), 'dd/MM HH:mm', { locale: ptBR })}
                                </span>
                            )}
                            {evolutionStats.totalEvolutions > 0 && (
                                <span className="flex items-center gap-0.5 shrink-0">
                                    <FileText className="h-2.5 w-2.5" />
                                    {evolutionStats.totalEvolutions} evol.
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Centro: fisioterapeuta + cronômetro (em telas maiores) */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
                <div className="h-6 w-px bg-border" aria-hidden />
                {therapists.length > 0 && onTherapistChange && (
                    <>
                        <Select
                            value={selectedTherapistId || THERAPIST_SELECT_NONE}
                            onValueChange={(v) => onTherapistChange(v === THERAPIST_SELECT_NONE ? '' : v)}
                            aria-label={THERAPIST_PLACEHOLDER}
                        >
                            <SelectTrigger className="h-8 w-[160px] text-xs bg-background/80 border-border/60">
                                <UserCog className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-1" />
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
                            <Badge variant="secondary" className="text-[9px] font-mono shrink-0">
                                CREFITO {selectedTherapist.crefito}
                            </Badge>
                        )}
                        <div className="h-6 w-px bg-border" aria-hidden />
                    </>
                )}
                <SessionTimer startTime={sessionStartTime} className="shrink-0" />
            </div>

            {/* Mobile: fisioterapeuta + timer em linha separada ou colapsados */}
            <div className="flex md:hidden items-center gap-2 shrink-0">
                <div className="h-6 w-px bg-border" aria-hidden />
                {therapists.length > 0 && onTherapistChange && (
                    <Select
                        value={selectedTherapistId || THERAPIST_SELECT_NONE}
                        onValueChange={(v) => onTherapistChange(v === THERAPIST_SELECT_NONE ? '' : v)}
                        aria-label={THERAPIST_PLACEHOLDER}
                    >
                        <SelectTrigger className="h-8 w-[130px] text-xs bg-background/80 border-border/60">
                            <SelectValue placeholder={THERAPIST_PLACEHOLDER} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={THERAPIST_SELECT_NONE}>{THERAPIST_PLACEHOLDER}</SelectItem>
                            {showTherapistFallback && <SelectItem value={selectedTherapistId}>Responsável atual</SelectItem>}
                            {therapists.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                    {t.crefito ? `${t.name} (${t.crefito})` : t.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                <SessionTimer startTime={sessionStartTime} className="shrink-0" />
            </div>

            {/* Direita: Resumo (popover) + Salvar + Concluir + Mais */}
            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
                <div className="h-6 w-px bg-border hidden sm:block" aria-hidden />
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 sm:px-2.5 hover:bg-primary/10"
                            aria-label="Ver resumo da evolução"
                            title="Resumo"
                        >
                            <BarChart2 className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1 text-xs">Resumo</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto min-w-[320px] max-w-[95vw] p-3" align="end" sideOffset={8}>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
                            Resumo
                        </p>
                        <EvolutionStats stats={evolutionStats} />
                    </PopoverContent>
                </Popover>
                <Button
                    onClick={onSave}
                    size="sm"
                    variant="outline"
                    disabled={isSaving}
                    className="h-8 px-2.5 sm:px-3 min-w-[64px] sm:min-w-[72px] shadow-sm hover:bg-primary/5"
                    aria-label={isSaving ? 'Salvando...' : 'Salvar'}
                    title={lastSavedAt && autoSaveEnabled ? `Último salvamento: ${format(lastSavedAt, 'HH:mm')}` : undefined}
                >
                    <Save className="h-4 w-4" />
                    <span className="ml-1 text-xs">{isSaving ? '...' : 'Salvar'}</span>
                </Button>
                <Button
                    onClick={onComplete}
                    size="sm"
                    disabled={isSaving || isCompleting}
                    className="h-8 px-2.5 sm:px-3 min-w-[72px] sm:min-w-[88px] bg-green-600 hover:bg-green-700 text-white shadow-md"
                    aria-label={isCompleting ? 'Concluindo...' : 'Concluir sessão'}
                >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="ml-1 text-xs font-medium">{isCompleting ? '...' : 'Concluir'}</span>
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
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
    );
});

EvolutionHeader.displayName = 'EvolutionHeader';
