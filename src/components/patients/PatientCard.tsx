import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, Calendar, Stethoscope } from 'lucide-react';
import { cn, calculateAge } from '@/lib/utils';
import { Patient } from '@/schemas/patient';
import { PatientHelpers } from '@/types';
import { PatientStats, formatFirstEvaluationDate, PATIENT_CLASSIFICATIONS } from '@/hooks/usePatientStats';

interface PatientCardProps {
  patient: Patient;
  index: number;
  onClick: () => void;
  stats?: PatientStats;
  actions?: React.ReactNode;
}

function formatLastActivity(stats?: PatientStats): string {
  if (!stats) return '—';
  if (stats.sessionsCompleted === 0 && stats.totalAppointments === 0) return 'Sem sessões';
  const days = stats.daysSinceLastAppointment;
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return `${days}d atrás`;
  if (days < 30) return `${Math.floor(days / 7)} sem. atrás`;
  if (days < 365) return `${Math.floor(days / 30)} mês(es)`;
  return `${Math.floor(days / 365)} ano(s)`;
}

/**
 * Componente otimizado de card de paciente com React.memo
 * Evita re-renders desnecessários quando os props não mudam
 * Inclui melhorias de acessibilidade com ARIA labels e navegação por teclado
 */
export const PatientCard = memo(({ patient, index, onClick, stats, actions }: PatientCardProps) => {
  const patientName = PatientHelpers.getName(patient);
  const initials = patientName ? patientName.split(' ').map(n => n[0]).join('').substring(0, 2) : 'P';

  // Formatar informações de sessões
  const sessionsInfo = stats
    ? `${stats.sessionsCompleted} sessão${stats.sessionsCompleted !== 1 ? 'ões' : ''}`
    : null;

  const firstEvaluationInfo = stats?.firstEvaluationDate
    ? `Prim. aval.: ${formatFirstEvaluationDate(stats.firstEvaluationDate)}`
    : null;
    
  const classificationInfo = stats
    ? PATIENT_CLASSIFICATIONS[stats.classification]
    : null;

  // Handler para teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      className="group flex flex-col gap-3 p-3 rounded-xl bg-card hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800 transition-colors border border-transparent hover:border-border dark:hover:border-slate-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      <div
        className="flex items-start gap-3 w-full min-w-0 cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={`Paciente: ${patientName || 'Sem nome'}, Status: ${patient.status || 'Inicial'}`}
        onClick={onClick}
        onKeyDown={handleKeyDown}
      >
        <div className="relative shrink-0">
          <Avatar className="h-11 w-11 ring-2 ring-border dark:ring-slate-700 shrink-0">
            <AvatarFallback className={cn(
              "text-xs font-bold",
              patient.status === 'Em Tratamento'
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                : patient.status === 'Inicial'
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            )}>
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          {/* Linha 1: nome + status */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {patientName || 'Paciente sem nome'}
            </p>
            <Badge className={cn(
              "shrink-0 inline-flex items-center rounded-full border border-transparent text-[10px] font-semibold px-2 py-0.5",
              patient.status === 'Em Tratamento'
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : patient.status === 'Inicial'
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            )}>
              {patient.status || 'Inicial'}
            </Badge>
          </div>
          
          {/* Linha 2: condição principal */}
          {patient.main_condition && (
            <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
              <Stethoscope className="h-3 w-3 shrink-0" />
              {patient.main_condition}
            </p>
          )}
          
          <p className="text-[11px] text-muted-foreground truncate">
            {patient.phone || patient.email || `${calculateAge(patient.birth_date || patient.birthDate || '')} anos`}
          </p>

          {/* Linha 3: sessões | última atividade */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
            {sessionsInfo && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 shrink-0" />
                {sessionsInfo}
              </span>
            )}
            <span className="truncate" title={stats?.lastAppointmentDate}>
              {formatLastActivity(stats)}
            </span>
            {firstEvaluationInfo && (
              <span className="truncate hidden sm:inline">{firstEvaluationInfo}</span>
            )}
          </div>
          
          {((patient.progress ?? 0) > 0) && (
            <div className="mt-1.5">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                <span>Progresso</span>
                <span>{patient.progress}%</span>
              </div>
              <Progress value={patient.progress ?? 0} className="h-1.5" />
            </div>
          )}
          
          {classificationInfo && (
            <Badge
              variant="outline"
              className="mt-1.5 w-fit text-[9px] px-1.5 py-0 font-normal opacity-80"
            >
              {classificationInfo.label}
            </Badge>
          )}
        </div>

        <div className="shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors self-center">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* Actions */}
      {actions && (
        <div className="shrink-0 flex justify-end border-t border-border/50 pt-2 -mb-1">
          {actions}
        </div>
      )}
    </Card>
  );
});

PatientCard.displayName = 'PatientCard';
