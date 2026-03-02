import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch,
  Plus,
  CheckCircle2,
  Clock,
  Target,
  Activity,
  Pause,
  Calendar,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TreatmentCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  sessionsCount: number;
  completedSessions: number;
  goals: string[];
  status: 'active' | 'completed' | 'upcoming' | 'paused';
  notes?: string;
  therapistId?: string;
}

export interface TreatmentCyclesProps {
  patientId: string;
  cycles?: TreatmentCycle[];
  onCreateCycle?: () => void;
  onEditCycle?: (cycle: TreatmentCycle) => void;
  currentSessionCount?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  active: {
    label: 'Ativo',
    borderColor: 'border-l-blue-500',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    glowClass: 'shadow-blue-100',
    icon: Activity,
    dotColor: 'bg-blue-500',
  },
  completed: {
    label: 'Concluído',
    borderColor: 'border-l-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    glowClass: 'shadow-emerald-100',
    icon: CheckCircle2,
    dotColor: 'bg-emerald-500',
  },
  upcoming: {
    label: 'Próximo',
    borderColor: 'border-l-slate-400',
    badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
    glowClass: 'shadow-slate-100',
    icon: Clock,
    dotColor: 'bg-slate-400',
  },
  paused: {
    label: 'Pausado',
    borderColor: 'border-l-amber-400',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    glowClass: 'shadow-amber-100',
    icon: Pause,
    dotColor: 'bg-amber-400',
  },
} as const;

const FEATURE_PILLS = [
  { icon: Zap, label: 'Linear-style tracking' },
  { icon: Target, label: 'Metas por ciclo' },
  { icon: GitBranch, label: 'Rollover automático' },
];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: 'easeOut' },
  }),
};

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function formatDateRange(startDate: string, endDate: string): string {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  return `${format(start, "d 'de' MMM", { locale: ptBR })} → ${format(end, "d 'de' MMM, yyyy", { locale: ptBR })}`;
}

function timeInStatus(cycle: TreatmentCycle): string {
  const now = new Date();

  if (cycle.status === 'active') {
    const start = parseISO(cycle.startDate);
    const days = differenceInDays(now, start);
    if (days === 0) return 'Iniciado hoje';
    if (days === 1) return '1 dia ativo';
    return `${days} dias ativos`;
  }

  if (cycle.status === 'completed') {
    const end = parseISO(cycle.endDate);
    const days = differenceInDays(now, end);
    if (days === 0) return 'Concluído hoje';
    if (days === 1) return 'Concluído há 1 dia';
    return `Concluído há ${days} dias`;
  }

  if (cycle.status === 'upcoming') {
    const start = parseISO(cycle.startDate);
    const days = differenceInDays(start, now);
    if (days === 0) return 'Começa hoje';
    if (days === 1) return 'Começa em 1 dia';
    return `Começa em ${days} dias`;
  }

  if (cycle.status === 'paused') {
    return 'Pausado';
  }

  return '';
}

function cycleDurationDays(cycle: TreatmentCycle): number {
  return differenceInDays(parseISO(cycle.endDate), parseISO(cycle.startDate));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SummaryHeaderProps {
  cycles: TreatmentCycle[];
}

const SummaryHeader: React.FC<SummaryHeaderProps> = ({ cycles }) => {
  const activeCycle = cycles.find((c) => c.status === 'active');
  const completedCount = cycles.filter((c) => c.status === 'completed').length;

  const totalSessions = cycles.reduce((sum, c) => sum + c.sessionsCount, 0);
  const totalCompleted = cycles.reduce((sum, c) => sum + c.completedSessions, 0);
  const overallPct = totalSessions > 0 ? Math.round((totalCompleted / totalSessions) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      {/* Total cycles */}
      <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 flex flex-col gap-1 shadow-sm">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Total de Ciclos
        </span>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-slate-800">{cycles.length}</span>
          <span className="text-xs text-slate-400 mb-0.5 leading-tight">
            {completedCount} concluído{completedCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Active cycle */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 flex flex-col gap-1 shadow-sm">
        <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">
          Ciclo Ativo
        </span>
        {activeCycle ? (
          <span
            className="text-sm font-semibold text-blue-800 leading-tight truncate"
            title={activeCycle.name}
          >
            {activeCycle.name}
          </span>
        ) : (
          <span className="text-sm text-blue-300 italic">Nenhum</span>
        )}
      </div>

      {/* Overall progress */}
      <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 flex flex-col gap-2 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Progresso Geral
          </span>
          <span className="text-sm font-bold text-slate-700">{overallPct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
            initial={{ width: 0 }}
            animate={{ width: `${overallPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs text-slate-400">
          {totalCompleted} / {totalSessions} sessões
        </span>
      </div>
    </div>
  );
};

interface CycleCardProps {
  cycle: TreatmentCycle;
  index: number;
  onEdit?: (cycle: TreatmentCycle) => void;
}

const CycleCard: React.FC<CycleCardProps> = ({ cycle, index, onEdit }) => {
  const config = STATUS_CONFIG[cycle.status];
  const StatusIcon = config.icon;
  const progressPct =
    cycle.sessionsCount > 0
      ? Math.round((cycle.completedSessions / cycle.sessionsCount) * 100)
      : 0;
  const durationDays = cycleDurationDays(cycle);

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -2, transition: { duration: 0.18 } }}
      className="group"
    >
      <Card
        className={cn(
          'relative border-l-4 border border-slate-100 bg-white shadow-sm transition-shadow duration-200',
          'group-hover:shadow-md',
          config.borderColor,
          config.glowClass
        )}
      >
        <CardContent className="p-5">
          {/* Top row: name + status badge + edit */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-800 text-sm leading-snug truncate">
                {cycle.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>{formatDateRange(cycle.startDate, cycle.endDate)}</span>
                <span className="text-slate-200">·</span>
                <span>{durationDays} dias</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-medium border flex items-center gap-1 px-2 py-0.5',
                  config.badgeClass
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dotColor)} />
                {config.label}
              </Badge>
              {onEdit && (
                <button
                  onClick={() => onEdit(cycle)}
                  className={cn(
                    'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
                    'rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  )}
                  aria-label="Editar ciclo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="text-slate-500 font-medium">
                {cycle.completedSessions} / {cycle.sessionsCount} sessões
              </span>
              <span className="text-slate-700 font-semibold">{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  cycle.status === 'active'
                    ? 'bg-gradient-to-r from-blue-400 to-violet-500'
                    : cycle.status === 'completed'
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                    : cycle.status === 'paused'
                    ? 'bg-gradient-to-r from-amber-300 to-amber-500'
                    : 'bg-slate-300'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: index * 0.05 }}
              />
            </div>
          </div>

          {/* Goals row */}
          {cycle.goals.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {cycle.goals.slice(0, 3).map((goal, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs bg-slate-50 text-slate-600 border border-slate-100 rounded-full px-2.5 py-0.5"
                >
                  <Target className="w-2.5 h-2.5 flex-shrink-0 text-slate-400" />
                  {goal}
                </span>
              ))}
              {cycle.goals.length > 3 && (
                <span className="inline-flex items-center text-xs text-slate-400 px-1">
                  +{cycle.goals.length - 3} mais
                </span>
              )}
            </div>
          )}

          {/* Footer: time-in-status + notes indicator */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-50">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <StatusIcon className="w-3 h-3 flex-shrink-0" />
              <span>{timeInStatus(cycle)}</span>
            </div>
            {cycle.notes && (
              <span className="text-xs text-slate-300 italic truncate max-w-[140px]">
                {cycle.notes}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface EmptyStateProps {
  onCreateCycle?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onCreateCycle }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
    className="flex flex-col items-center text-center py-14 px-6"
  >
    {/* Icon halo */}
    <div className="relative mb-5">
      <div className="absolute inset-0 rounded-full bg-blue-100 blur-xl opacity-60 scale-110" />
      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-200">
        <GitBranch className="w-8 h-8 text-white" />
      </div>
    </div>

    <h3 className="text-lg font-bold text-slate-800 mb-2">
      Organize o Tratamento em Ciclos
    </h3>
    <p className="text-sm text-slate-500 max-w-sm leading-relaxed mb-6">
      Agrupe sessões em ciclos terapêuticos de 2-4 semanas, acompanhe o progresso e
      faça transições estruturadas entre fases do tratamento. Inspirado nas melhores
      práticas de gestão ágil.
    </p>

    {/* Feature pills */}
    <div className="flex flex-wrap justify-center gap-2 mb-7">
      {FEATURE_PILLS.map(({ icon: Icon, label }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5"
        >
          <Icon className="w-3.5 h-3.5 text-slate-400" />
          {label}
        </span>
      ))}
    </div>

    <Button
      onClick={onCreateCycle}
      className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300 transition-all duration-200 gap-2"
    >
      <Plus className="w-4 h-4" />
      Criar Primeiro Ciclo
    </Button>
  </motion.div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const TreatmentCycles: React.FC<TreatmentCyclesProps> = ({
  patientId: _patientId,
  cycles = [],
  onCreateCycle,
  onEditCycle,
  currentSessionCount: _currentSessionCount,
  className,
}) => {
  const hasCycles = cycles.length > 0;

  // Sort: active first, then upcoming, paused, completed
  const ORDER: Record<TreatmentCycle['status'], number> = {
    active: 0,
    upcoming: 1,
    paused: 2,
    completed: 3,
  };
  const sortedCycles = [...cycles].sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  return (
    <Card className={cn('border border-slate-100 bg-slate-50/40 shadow-sm', className)}>
      <CardHeader className="pb-2 px-5 pt-5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm">
              <GitBranch className="w-3.5 h-3.5 text-white" />
            </div>
            Ciclos de Tratamento
          </CardTitle>
          {hasCycles && (
            <Button
              size="sm"
              variant="outline"
              onClick={onCreateCycle}
              className="gap-1.5 text-xs border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-150"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar Novo Ciclo
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5">
        <AnimatePresence mode="wait">
          {hasCycles ? (
            <motion.div
              key="cycles-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Summary header */}
              <SummaryHeader cycles={cycles} />

              {/* Cycle cards */}
              <div className="flex flex-col gap-3">
                {sortedCycles.map((cycle, i) => (
                  <CycleCard
                    key={cycle.id}
                    cycle={cycle}
                    index={i}
                    onEdit={onEditCycle}
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <EmptyState onCreateCycle={onCreateCycle} />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
