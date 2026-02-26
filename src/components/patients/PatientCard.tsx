import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Calendar, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
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
      className="group flex flex-col gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border-none shadow-premium-sm hover:shadow-premium-md hover-lift transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary/20"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      <div
        className="flex items-start gap-4 w-full min-w-0 cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={`Paciente: ${patientName || 'Sem nome'}, Status: ${patient.status || 'Inicial'}`}
        onClick={onClick}
        onKeyDown={handleKeyDown}
      >
        <div className="relative shrink-0">
          <Avatar className="h-14 w-14 ring-4 ring-slate-50 dark:ring-slate-800/50 shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105">
            <AvatarFallback className={cn(
              "text-sm font-black uppercase tracking-tighter",
              patient.status === 'Em Tratamento'
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                : patient.status === 'Inicial'
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            )}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900",
            patient.status === 'Em Tratamento' ? "bg-emerald-500" : "bg-slate-300"
          )} />
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          {/* Linha 1: nome + status */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-base font-black text-slate-900 dark:text-white truncate leading-tight tracking-tight group-hover:text-primary transition-colors">
                {patientName || 'Paciente sem nome'}
              </p>
              {patient.main_condition && (
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mt-0.5 flex items-center gap-1.5">
                  <Stethoscope className="h-3 w-3 text-primary/60" />
                  {patient.main_condition}
                </p>
              )}
            </div>
            <Badge className={cn(
              "shrink-0 inline-flex items-center rounded-lg border-none text-[9px] font-black uppercase tracking-widest px-2 py-1",
              patient.status === 'Em Tratamento'
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : patient.status === 'Inicial'
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            )}>
              {patient.status || 'Inicial'}
            </Badge>
          </div>
          
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary/40" />
                <span>{sessionsInfo || '0 sessões'}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="uppercase tracking-wider">Último: {formatLastActivity(stats)}</span>
            </div>

            {((patient.progress ?? 0) > 0) && (
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <span>Evolução do tratamento</span>
                  <span className="text-primary">{patient.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${patient.progress}%` }}
                    className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.3)]" 
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-3 flex items-center justify-between">
            {classificationInfo ? (
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider",
                stats?.classification === 'active' ? "border-emerald-100 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800" :
                stats?.classification === 'no_show_risk' ? "border-red-100 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-800" :
                "border-slate-100 bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:border-slate-800"
              )}>
                <div className={cn(
                  "w-1 h-1 rounded-full",
                  stats?.classification === 'active' ? "bg-emerald-500" :
                  stats?.classification === 'no_show_risk' ? "bg-red-500" :
                  "bg-slate-400"
                )} />
                {classificationInfo.label}
              </div>
            ) : <div />}

            <div className="text-[10px] font-bold text-slate-400">
              ID: {patient.id.substring(0, 6)}
            </div>
          </div>
        </div>

        <div className="shrink-0 w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all self-center shadow-inner-border">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* Actions */}
      {actions && (
        <div className="shrink-0 flex justify-end border-t border-slate-50 dark:border-slate-800/50 pt-3 -mb-1">
          {actions}
        </div>
      )}
    </Card>
  );
});

PatientCard.displayName = 'PatientCard';
