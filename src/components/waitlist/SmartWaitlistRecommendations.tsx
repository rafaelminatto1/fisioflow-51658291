/**
 * Painel de recomendações inteligentes para lista de espera
 * @module components/waitlist/SmartWaitlistRecommendations
 */

import { useState, useMemo } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WaitlistRecommendation,
  SlotCandidate,
  WaitlistAnalytics,
} from '@/lib/waitlist/smart-waitlist';
import { useSmartWaitlistManager } from '@/hooks/useSmartWaitlist';

// =====================================================================
// TYPES
// =====================================================================

interface SmartWaitlistRecommendationsProps {
  className?: string;
  onSelectCandidate?: (candidate: SlotCandidate, slotDate: Date, slotTime: string) => void;
}

// =====================================================================
// CONSTANTS
// =====================================================================

const URGENCY_CONFIG = {
  high: {
    label: 'Alta Urgência',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    icon: AlertCircle,
  },
  medium: {
    label: 'Média Urgência',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    icon: Clock,
  },
  low: {
    label: 'Baixa Urgência',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    icon: CheckCircle2,
  },
} as const;

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgente', color: 'bg-red-500' },
  high: { label: 'Alta', color: 'bg-orange-500' },
  normal: { label: 'Normal', color: 'bg-blue-500' },
} as const;

// =====================================================================
// SUB-COMPONENTS
// =====================================================================

interface CandidateCardProps {
  candidate: SlotCandidate;
  slotDate: Date;
  slotTime: string;
  onSelect?: () => void;
}

function CandidateCard({ candidate, slotDate, slotTime, onSelect }: CandidateCardProps) {
  const { entry, score, matchReasons, waitingDays, priority } = candidate;
  const priorityConfig = PRIORITY_CONFIG[entry.priority];

  const initials = entry.patient?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
    || '??';

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
      <Avatar className="h-10 w-10">
        <AvatarFallback className={cn('text-white text-xs', priorityConfig.color)}>
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{entry.patient?.name}</p>
          <Badge variant="outline" className="text-xs">
            {PRIORITY_CONFIG[entry.priority].label}
          </Badge>
        </div>

        <div className="flex items-center gap-2 mt-1">
          {matchReasons.map((reason, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {reason}
            </Badge>
          ))}
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Aguardando há {waitingDays} {waitingDays === 1 ? 'dia' : 'dias'}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1">
        <span className="text-xs font-mono text-slate-500">
          Pontos: {Math.round(score)}
        </span>
        {onSelect && (
          <Button size="sm" variant="ghost" onClick={onSelect} className="h-7 text-xs">
            Oferecer
          </Button>
        )}
      </div>
    </div>
  );
}

interface RecommendationCardProps {
  recommendation: WaitlistRecommendation;
  onSelectCandidate?: (candidate: SlotCandidate, slotDate: Date, slotTime: string) => void;
}

function RecommendationCard({ recommendation, onSelectCandidate }: RecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const urgency = URGENCY_CONFIG[recommendation.urgencyLevel];
  const UrgencyIcon = urgency.icon;

  const { slot, candidates, totalCandidates } = recommendation;
  const slotDate = new Date(slot.date);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="pb-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', urgency.color)}>
              <UrgencyIcon className="h-4 w-4" />
            </div>

            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {format(slotDate, "dd 'de' MMMM", { locale: ptBR })}
                <span className="text-sm font-normal text-slate-500">
                  às {slot.time}
                </span>
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Users className="h-3 w-3" />
                {totalCandidates} candidato{totalCandidates !== 1 ? 's' : ''} disponível{totalCandidates !== 1 ? 'is' : ''}
                <span className={cn('text-xs px-2 py-0.5 rounded-full', urgency.color)}>
                  {urgency.label}
                </span>
              </CardDescription>
            </div>
          </div>

          <Button variant="ghost" size="sm">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-2">
          {candidates.map((candidate, i) => (
            <CandidateCard
              key={candidate.entry.id}
              candidate={candidate}
              slotDate={slotDate}
              slotTime={slot.time}
              onSelect={() => onSelectCandidate?.(candidate, slotDate, slot.time)}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

interface AnalyticsCardProps {
  analytics: WaitlistAnalytics;
  anomalies: string[];
}

function AnalyticsCard({ analytics, anomalies }: AnalyticsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Analytics da Lista
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Priority Distribution */}
        <div>
          <p className="text-sm font-medium mb-2">Distribuição por Prioridade</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm">Urgentes</span>
              </div>
              <span className="text-sm font-medium">{analytics.distributionByPriority.urgent}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm">Alta</span>
              </div>
              <span className="text-sm font-medium">{analytics.distributionByPriority.high}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm">Normal</span>
              </div>
              <span className="text-sm font-medium">{analytics.distributionByPriority.normal}</span>
            </div>
          </div>
        </div>

        {/* Estimated Wait Time */}
        <div>
          <p className="text-sm font-medium mb-2">Tempo Estimado de Espera</p>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Urgentes:</span>
              <span className="font-medium">{analytics.estimatedWaitTime.urgent} dias</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Alta prioridade:</span>
              <span className="font-medium">{analytics.estimatedWaitTime.high} dias</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Normal:</span>
              <span className="font-medium">{analytics.estimatedWaitTime.normal} dias</span>
            </div>
          </div>
        </div>

        {/* Average Wait Time */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Tempo médio de espera</span>
            <span className="text-lg font-bold">
              {analytics.averageWaitTime} dias
            </span>
          </div>
        </div>

        {/* Anomalies */}
        {anomalies.length > 0 && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              Atenção Necessária
            </p>
            <ul className="space-y-1">
              {anomalies.map((anomaly, i) => (
                <li key={i} className="text-sm text-yellow-600 dark:text-yellow-400 flex items-start gap-2">
                  <span>•</span>
                  <span>{anomaly}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================================
// MAIN COMPONENT
// =====================================================================

export function SmartWaitlistRecommendations({
  className,
  onSelectCandidate,
}: SmartWaitlistRecommendationsProps) {
  const {
    recommendations,
    analytics,
    anomalies,
    isLoading,
  } = useSmartWaitlistManager({
    daysAhead: 14,
    candidatesPerSlot: 3,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-slate-500">Carregando recomendações...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasRecommendations = recommendations.length > 0;

  return (
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Recomendações Inteligentes</h3>
          </div>

          {hasRecommendations && (
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              {recommendations.length} vagas disponíveis
            </Badge>
          )}
        </div>

        {/* No Recommendations */}
        {!hasRecommendations && (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center text-center gap-2">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="font-medium">Tudo em dia!</p>
                <p className="text-sm text-slate-500">
                  Não há recomendações no momento.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {hasRecommendations && (
          <div className="space-y-3">
            {recommendations.slice(0, 5).map((rec, i) => (
              <RecommendationCard
                key={`${rec.slot.dateString}-${rec.slot.time}-${i}`}
                recommendation={rec}
                onSelectCandidate={onSelectCandidate}
              />
            ))}

            {recommendations.length > 5 && (
              <p className="text-sm text-center text-slate-500">
                + {recommendations.length - 5} outras recomendações disponíveis
              </p>
            )}
          </div>
        )}

        {/* Analytics */}
        {analytics && (
          <AnalyticsCard analytics={analytics} anomalies={anomalies} />
        )}
      </div>
    </TooltipProvider>
  );
}

export default SmartWaitlistRecommendations;
