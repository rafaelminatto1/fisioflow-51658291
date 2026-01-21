import { memo } from 'react';
import { Card } from '@/components/shared/ui/card';
import { Avatar, AvatarFallback } from '@/components/shared/ui/avatar';
import { Badge } from '@/components/shared/ui/badge';
import { ChevronRight, Calendar, Phone, Mail } from 'lucide-react';
import { cn, calculateAge } from '@/lib/utils';
import { Patient } from '@/schemas/patient';
import { PatientHelpers } from '@/types';
import { PatientStats, formatFirstEvaluationDate } from '@/hooks/usePatientStats';

interface PatientCardProps {
  patient: Patient;
  index: number;
  onClick: () => void;
  stats?: PatientStats;
}

/**
 * Componente otimizado de card de paciente com React.memo
 * Evita re-renders desnecessários quando os props não mudam
 * Inclui melhorias de acessibilidade com ARIA labels e navegação por teclado
 */
export const PatientCard = memo(({ patient, index, onClick, stats }: PatientCardProps) => {
  const patientName = PatientHelpers.getName(patient);
  const initials = patientName ? patientName.split(' ').map(n => n[0]).join('').substring(0, 2) : 'P';

  // Determinar informação de contato prioritária para exibição
  const getContactDisplay = () => {
    if (patient.phone) {
      return { icon: Phone, text: patient.phone };
    }
    if (patient.email) {
      return { icon: Mail, text: patient.email };
    }
    return { icon: null, text: `${calculateAge(patient.birthDate || '')} anos` };
  };

  const contactDisplay = getContactDisplay();

  // Formatar informações de sessões
  const sessionsInfo = stats
    ? `${stats.sessionsCompleted} sessão${stats.sessionsCompleted !== 1 ? 'ões' : ''}`
    : null;

  const firstEvaluationInfo = stats?.firstEvaluationDate
    ? `Primeira avaliação: ${formatFirstEvaluationDate(stats.firstEvaluationDate)}`
    : null;

  // Definir cores baseado no status
  const statusColors = cn(
    "inline-flex items-center rounded-full border border-transparent text-[10px] font-semibold px-2 py-0.5",
    patient.status === 'Em Tratamento'
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
      : patient.status === 'Inicial'
        ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
  );

  const avatarFallbackColors = cn(
    "text-sm font-bold",
    patient.status === 'Em Tratamento'
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
      : patient.status === 'Inicial'
        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
  );

  // Handler para teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Paciente: ${patientName || 'Sem nome'}, Status: ${patient.status || 'Inicial'}`}
      className="group flex items-center gap-4 p-3 rounded-xl bg-card hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-border dark:hover:border-slate-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12 ring-2 ring-border dark:ring-slate-700 shrink-0">
          <AvatarFallback className={avatarFallbackColors}>
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {patientName || 'Paciente sem nome'}
          </p>
          <Badge className={statusColors}>
            {patient.status || 'Inicial'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
          {contactDisplay.icon && <contactDisplay.icon className="w-3 h-3 flex-shrink-0" />}
          <span className="truncate">{contactDisplay.text}</span>
        </p>

        {/* Informações adicionais de sessões e primeira avaliação */}
        {(sessionsInfo || firstEvaluationInfo) && (
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
            {sessionsInfo && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {sessionsInfo}
              </span>
            )}
            {firstEvaluationInfo && (
              <span className="truncate">{firstEvaluationInfo}</span>
            )}
          </div>
        )}
      </div>
      <div className="shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
        <ChevronRight className="w-5 h-5" />
      </div>
    </Card>
  );
});

PatientCard.displayName = 'PatientCard';
