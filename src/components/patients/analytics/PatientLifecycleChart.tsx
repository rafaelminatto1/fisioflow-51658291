/**
 * Patient Lifecycle Timeline Component
 *
 * Visualizes the patient's journey through the clinic,
 * showing all lifecycle stages, duration, and transitions.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  User,
  Phone,
  CalendarCheck,
  Calendar,
  Activity,
  Pause,
  Play,
  CheckCircle,
  Heart,
  RefreshCw,
  UserMinus,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LifecycleEventType, PatientLifecycleSummary } from '@/types/patientAnalytics';

// ============================================================================
// TYPES AND CONFIG
// ============================================================================

interface StageConfig {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
}

const STAGE_CONFIGS: Record<LifecycleEventType, StageConfig> = {
  lead_created: {
    label: 'Lead Captado',
    icon: User,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    description: 'Primeiro registro como lead potencial',
  },
  first_contact: {
    label: 'Primeiro Contato',
    icon: Phone,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-500/10',
    description: 'Primeira interação com a clínica',
  },
  first_appointment_scheduled: {
    label: 'Primeira Consulta Agendada',
    icon: Calendar,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    description: 'Agendamento da avaliação inicial',
  },
  first_appointment_completed: {
    label: 'Primeira Consulta Realizada',
    icon: CalendarCheck,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-500/10',
    description: 'Avaliação inicial concluída',
  },
  treatment_started: {
    label: 'Tratamento Iniciado',
    icon: Activity,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
    description: 'Início do plano de tratamento',
  },
  treatment_paused: {
    label: 'Tratamento Pausado',
    icon: Pause,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    description: 'Tratamento temporariamente suspenso',
  },
  treatment_resumed: {
    label: 'Tratamento Retomado',
    icon: Play,
    color: 'text-teal-600',
    bgColor: 'bg-teal-500/10',
    description: 'Retorno ao tratamento ativo',
  },
  treatment_completed: {
    label: 'Tratamento Concluído',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    description: 'Plano de tratamento finalizado',
  },
  discharged: {
    label: 'Alta',
    icon: Heart,
    color: 'text-rose-600',
    bgColor: 'bg-rose-500/10',
    description: 'Paciente recebeu alta',
  },
  follow_up_scheduled: {
    label: 'Acompanhamento',
    icon: Clock,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
    description: 'Seguamento agendado',
  },
  reactivation: {
    label: 'Reativado',
    icon: RefreshCw,
    color: 'text-violet-600',
    bgColor: 'bg-violet-500/10',
    description: 'Paciente retornou após pausa',
  },
  churned: {
    label: 'Abandono',
    icon: UserMinus,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    description: 'Paciente abandonou o tratamento',
  },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface TimelineNodeProps {
  stage: LifecycleEventType;
  date: string;
  duration?: number;
  isLast: boolean;
  isActive?: boolean;
}

function TimelineNode({ stage, date, duration, isLast, isActive }: TimelineNodeProps) {
  const config = STAGE_CONFIGS[stage] || STAGE_CONFIGS.lead_created;
  const Icon = config.icon;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all",
          isActive ? config.bgColor + ' ' + config.color + ' border-current scale-110' : 'bg-muted border-muted-foreground/30'
        )}>
          <Icon className={cn("h-5 w-5", isActive ? config.color : "text-muted-foreground")} />
        </div>
        {!isLast && (
          <div className={cn(
            "w-0.5 flex-1 my-2",
            isActive ? 'bg-current' : 'bg-muted'
          )} style={{ minHeight: '40px' }} />
        )}
      </div>
      <div className={cn(
        "flex-1 pb-8 transition-all",
        isActive ? 'opacity-100' : 'opacity-60'
      )}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold">{config.label}</p>
              {isActive && (
                <Badge variant="outline" className={cn("text-xs", config.bgColor, config.color)}>
                  Atual
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
          {duration !== undefined && duration > 0 && (
            <div className="text-right">
              <p className="text-lg font-bold">{duration}</p>
              <p className="text-xs text-muted-foreground">dias</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface LifecycleStatsProps {
  summary: PatientLifecycleSummary;
}

function LifecycleStats({ summary }: LifecycleStatsProps) {
  const stats = [
    {
      label: 'Estágio Atual',
      value: STAGE_CONFIGS[summary.current_stage]?.label || summary.current_stage,
      icon: STAGE_CONFIGS[summary.current_stage]?.icon || Activity,
      color: STAGE_CONFIGS[summary.current_stage]?.color || 'text-primary',
      bgColor: STAGE_CONFIGS[summary.current_stage]?.bgColor || 'bg-primary/10',
    },
    {
      label: 'Neste Estágio',
      value: `${summary.days_in_current_stage} dias`,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Tempo Total',
      value: `${summary.total_days_in_treatment} dias`,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className={cn(
              "p-3 rounded-lg border text-center",
              stat.bgColor
            )}
          >
            <Icon className={cn("h-4 w-4 mx-auto mb-1", stat.color)} />
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={cn("text-sm font-bold", stat.color)}>{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}

interface JourneyProgressProps {
  summary: PatientLifecycleSummary;
}

function JourneyProgress({ summary }: JourneyProgressProps) {
  // Define the stages in order
  const journeyStages: LifecycleEventType[] = [
    'lead_created',
    'first_contact',
    'first_appointment_scheduled',
    'first_appointment_completed',
    'treatment_started',
    'treatment_completed',
    'discharged',
  ];

  const currentStageIndex = journeyStages.indexOf(summary.current_stage);
  const progressPercentage = ((currentStageIndex + 1) / journeyStages.length) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progresso na Jornada</span>
        <span className="font-medium">{Math.round(progressPercentage)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Lead</span>
        <span>Alta</span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface PatientLifecycleChartProps {
  summary: PatientLifecycleSummary | null;
  isLoading?: boolean;
}

export function PatientLifecycleChart({ summary, isLoading }: PatientLifecycleChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.stage_history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ciclo de Vida do Paciente</CardTitle>
          <CardDescription>Histórico completo da jornada na clínica</CardDescription>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum evento de ciclo de vida registrado</p>
        </CardContent>
      </Card>
    );
  }

  const currentStageIndex = summary.stage_history.length - 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Ciclo de Vida do Paciente
        </CardTitle>
        <CardDescription>Histórico completo da jornada na clínica</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <LifecycleStats summary={summary} />

        <div className="h-px bg-border" />

        {/* Journey Progress */}
        <JourneyProgress summary={summary} />

        <div className="h-px bg-border" />

        {/* Timeline */}
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-0">
            {summary.stage_history.map((stage, index) => (
              <TimelineNode
                key={index}
                stage={stage.stage}
                date={stage.date}
                duration={stage.duration_days}
                isLast={index === summary.stage_history.length - 1}
                isActive={index === currentStageIndex}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default PatientLifecycleChart;
