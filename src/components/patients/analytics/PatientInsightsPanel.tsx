/**
 * Patient Insights Panel
 *
 * Displays AI-generated insights, alerts, and recommendations
 * for individual patients based on their data patterns.
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { ScrollArea } from '@/components/web/ui/scroll-area';
import { Skeleton } from '@/components/shared/ui/skeleton';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Award,
  Activity,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { usePatientInsights, useAcknowledgeInsight } from '@/hooks/usePatientAnalytics';
import { InsightType } from '@/types/patientAnalytics';

// ============================================================================
// TYPES AND CONFIG
// ============================================================================

interface InsightConfig {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
}

const INSIGHT_CONFIGS: Record<InsightType, InsightConfig> = {
  trend_alert: {
    icon: TrendingUp,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    label: 'Alerta de Tendência',
  },
  milestone_achieved: {
    icon: Award,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    label: 'Conquista',
  },
  risk_detected: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    label: 'Risco Detectado',
  },
  recommendation: {
    icon: Lightbulb,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    label: 'Recomendação',
  },
  comparison: {
    icon: Activity,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    label: 'Comparação',
  },
  progress_summary: {
    icon: Info,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    label: 'Resumo',
  },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface InsightItemProps {
  insight: {
    id: string;
    insight_type: InsightType;
    insight_text: string;
    created_at: string;
    metric_value?: number;
    comparison_value?: number;
  };
  onAcknowledge?: (id: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const InsightItem = memo(function InsightItem({ insight, onAcknowledge, isExpanded, onToggleExpand }: InsightItemProps) {
  const config = INSIGHT_CONFIGS[insight.insight_type] || INSIGHT_CONFIGS.progress_summary;
  const Icon = config.icon;

  // Parse insight text for structured display
  const parseInsightText = (text: string) => {
    // Check if it has a comparison format
    const comparisonMatch = text.match(/(.+?)\s*[:¦]\s*(.+)/);
    if (comparisonMatch) {
      return {
        title: comparisonMatch[1].trim(),
        detail: comparisonMatch[2].trim(),
      };
    }
    return {
      title: text.split('.')[0] + '.',
      detail: text.substring(text.indexOf('.') + 1).trim() || '',
    };
  };

  const { title, detail } = parseInsightText(insight.insight_text);

  return (
    <div className={cn(
      "group border-l-4 rounded-lg transition-all hover:shadow-md",
      config.borderColor,
      config.bgColor
    )}>
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn("p-2 rounded-lg", config.bgColor)}>
            <Icon className={cn("h-4 w-4", config.color)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={cn("text-xs", config.bgColor, config.color, config.borderColor)}>
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(insight.created_at), "dd/MM 'às' HH:mm")}
              </span>
            </div>
            <p className="text-sm font-medium">{title}</p>
            {detail && (
              <p className={cn(
                "text-sm mt-1",
                isExpanded ? 'block' : 'line-clamp-2'
              )}>
                {detail}
              </p>
            )}

            {/* Comparison values if available */}
            {insight.metric_value !== undefined && (
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className="text-muted-foreground">Atual: <strong>{insight.metric_value}</strong></span>
                {insight.comparison_value !== undefined && (
                  <>
                    <span className="text-muted-foreground">vs.</span>
                    <span className="text-muted-foreground">Comparativo: <strong>{insight.comparison_value}</strong></span>
                    <span className={cn(
                      "font-medium",
                      insight.metric_value > insight.comparison_value ? 'text-emerald-600' :
                      insight.metric_value < insight.comparison_value ? 'text-red-600' :
                      'text-muted-foreground'
                    )}>
                      {insight.metric_value > insight.comparison_value ? '↑' :
                       insight.metric_value < insight.comparison_value ? '↓' : '='}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {detail && detail.length > 100 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onToggleExpand}
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            )}
            {onAcknowledge && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onAcknowledge(insight.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

interface InsightSummaryProps {
  insights: Array<{ insight_type: InsightType }>;
}

const InsightSummary = memo(function InsightSummary({ insights }: InsightSummaryProps) {
  const counts = insights.reduce((acc, insight) => {
    acc[insight.insight_type] = (acc[insight.insight_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const summaryItems = Object.entries(counts)
    .filter(([type]) => type !== 'progress_summary')
    .map(([type, count]) => ({
      type: type as InsightType,
      count,
      config: INSIGHT_CONFIGS[type as InsightType],
    }))
    .sort((a, b) => b.count - a.count);

  if (summaryItems.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {summaryItems.slice(0, 4).map(({ type, count, config }) => {
        const Icon = config.icon;
        return (
          <div
            key={type}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-xs",
              config.bgColor
            )}
          >
            <Icon className={cn("h-3 w-3", config.color)} />
            <span className="font-medium">{count}</span>
          </div>
        );
      })}
      {summaryItems.length > 4 && (
        <Badge variant="outline" className="text-xs">
          +{summaryItems.length - 4} mais
        </Badge>
      )}
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface PatientInsightsPanelProps {
  patientId: string;
  showHeader?: boolean;
  limit?: number;
}

export const PatientInsightsPanel = memo(function PatientInsightsPanel({
  patientId,
  showHeader = true,
  limit = 10,
}: PatientInsightsPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'actionable' | 'alerts'>('all');

  const { data: insights, isLoading, refetch } = usePatientInsights(patientId, false);
  const acknowledgeInsight = useAcknowledgeInsight();

  const handleAcknowledge = useCallback(async (insightId: string) => {
    await acknowledgeInsight.mutateAsync({ insightId, patientId });
    refetch();
  }, [acknowledgeInsight, patientId, refetch]);

  const toggleExpand = useCallback((insightId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(insightId)) {
        next.delete(insightId);
      } else {
        next.add(insightId);
      }
      return next;
    });
  }, []);

  const acknowledgeAll = useCallback(async () => {
    if (!insights) return;
    for (const insight of insights) {
      await acknowledgeInsight.mutateAsync({ insightId: insight.id, patientId });
    }
    refetch();
  }, [insights, acknowledgeInsight, patientId, refetch]);

  // Memoized filter insights for performance
  const filteredInsights = useMemo(() =>
    insights?.filter(insight => {
      if (filter === 'actionable') {
        return insight.insight_type === 'recommendation' || insight.insight_type === 'risk_detected';
      }
      if (filter === 'alerts') {
        return insight.insight_type === 'risk_detected' || insight.insight_type === 'trend_alert';
      }
      return true;
    }).slice(0, limit) || [],
    [insights, filter, limit]
  );

  if (isLoading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
        )}
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Insights Inteligentes
              </CardTitle>
              <CardDescription>
                Análises automáticas baseadas em dados do paciente
              </CardDescription>
            </div>
            {filteredInsights.length > 0 && (
              <Button variant="ghost" size="sm" onClick={acknowledgeAll}>
                Descartar todos
              </Button>
            )}
          </div>

          {/* Summary badges */}
          {insights && insights.length > 0 && <InsightSummary insights={insights} />}
        </CardHeader>
      )}

      <CardContent className="space-y-4">
        {/* Filters */}
        {insights && insights.length > 0 && (
          <div className="flex gap-2" role="group" aria-label="Filtros de insights">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              aria-pressed={filter === 'all'}
              aria-label={`Mostrar todos os ${insights.length} insights`}
            >
              Todos ({insights.length})
            </Button>
            <Button
              variant={filter === 'actionable' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('actionable')}
              aria-pressed={filter === 'actionable'}
              aria-label={`Mostrar insights que requerem ação`}
            >
              Ações ({insights.filter(i => i.insight_type === 'recommendation' || i.insight_type === 'risk_detected').length})
            </Button>
            <Button
              variant={filter === 'alerts' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('alerts')}
              aria-pressed={filter === 'alerts'}
              aria-label={`Mostrar alertas e riscos`}
            >
              Alertas ({insights.filter(i => i.insight_type === 'risk_detected' || i.insight_type === 'trend_alert').length})
            </Button>
          </div>
        )}

        {/* Insights List */}
        {filteredInsights.length > 0 ? (
          <ScrollArea className={showHeader ? 'h-[400px]' : 'h-[300px]'}>
            <div className="space-y-3 pr-4">
              {filteredInsights.map(insight => (
                <InsightItem
                  key={insight.id}
                  insight={insight}
                  onAcknowledge={handleAcknowledge}
                  isExpanded={expandedIds.has(insight.id)}
                  onToggleExpand={() => toggleExpand(insight.id)}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="py-8 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              {filter === 'all' ? 'Nenhum insight disponível no momento' : 'Nenhum insight nesta categoria'}
            </p>
            {filter !== 'all' && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setFilter('all')}
                className="mt-2"
              >
                Ver todos os insights
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default PatientInsightsPanel;
