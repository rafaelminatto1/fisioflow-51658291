import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

  AlertTriangle,
  Bell,
  Clock,
  Calendar,
  TrendingDown,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  generateDashboardInsights,
  ProactiveSuggestion,
} from '@/lib/ai/proactiveAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const priorityConfig = {
  urgent: {
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/20',
    icon: AlertTriangle,
    label: 'Urgente',
  },
  high: {
    color: 'text-orange-600',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    border: 'border-orange-200 dark:border-orange-500/20',
    icon: Bell,
    label: 'Alta',
  },
  medium: {
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 dark:bg-yellow-500/10',
    border: 'border-yellow-200 dark:border-yellow-500/20',
    icon: Clock,
    label: 'Média',
  },
  low: {
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/20',
    icon: TrendingDown,
    label: 'Baixa',
  },
};

interface ProactiveSuggestionsProps {
  limit?: number;
  className?: string;
}

/**
 * ProactiveSuggestions component - displays AI-powered suggestions
 * for improving practice operations
 */
export function ProactiveSuggestions({ limit = 5, className }: ProactiveSuggestionsProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Load dismissed IDs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('fisioflow-dismissed-suggestions');
    if (stored) {
      try {
        setDismissedIds(new Set(JSON.parse(stored)));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const { data: insights, isLoading } = useQuery({
    queryKey: ['proactive-suggestions', profile?.organization_id],
    queryFn: () => generateDashboardInsights(profile?.organization_id || ''),
    enabled: !!profile?.organization_id,
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    staleTime: 1000 * 60 * 2,
  });

  const visibleSuggestions = useMemo(() => {
    if (!insights) return [];
    return insights.suggestions
      .filter((s) => !dismissedIds.has(s.id))
      .slice(0, limit);
  }, [insights, dismissedIds, limit]);

  const handleDismiss = (suggestionId: string) => {
    setDismissedIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(suggestionId);
      localStorage.setItem(
        'fisioflow-dismissed-suggestions',
        JSON.stringify(Array.from(newSet))
      );
      return newSet;
    });

    toast({
      title: 'Sugestão descartada',
      description: 'Você não verá esta sugestão novamente.',
    });
  };

  const handleAction = (suggestion: ProactiveSuggestion) => {
    if (suggestion.actionUrl) {
      window.location.href = suggestion.actionUrl;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Sugestões Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights || visibleSuggestions.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Sugestões Inteligentes
        </CardTitle>
        <CardDescription>
          {visibleSuggestions.length} sugestão{visibleSuggestions.length !== 1 ? 'ões' : ''} para melhorar sua clínica
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleSuggestions.map((suggestion) => {
          const config = priorityConfig[suggestion.priority];
          const Icon = config.icon;

          return (
            <div
              key={suggestion.id}
              className={cn(
                'p-4 rounded-xl border transition-all hover:shadow-md',
                config.bg,
                config.border
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn('p-2 rounded-lg', config.bg)}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm truncate">{suggestion.title}</h4>
                      <Badge variant="outline" className={cn('text-xs shrink-0', config.border, config.color)}>
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {suggestion.description}
                    </p>
                    {suggestion.actionLabel && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 mt-2 text-xs"
                        onClick={() => handleAction(suggestion)}
                      >
                        {suggestion.actionLabel}
                      </Button>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDismiss(suggestion.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {insights.suggestions.length > visibleSuggestions.length && (
          <div className="text-center pt-2">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              + {insights.suggestions.length - visibleSuggestions.length} mais sugestões
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for dashboard widget
 */
export function ProactiveSuggestionsWidget() {
  return (
    <ProactiveSuggestions
      limit={3}
      className="border-none shadow-sm bg-gradient-to-br from-card to-primary/5"
    />
  );
}

/**
 * Stats widget for proactive metrics
 */
export function ProactiveStatsWidget() {
  const { profile } = useAuth();

  const { data: insights, isLoading } = useQuery({
    queryKey: ['proactive-stats', profile?.organization_id],
    queryFn: () => generateDashboardInsights(profile?.organization_id || ''),
    enabled: !!profile?.organization_id,
    refetchInterval: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 2,
  });

  if (isLoading || !insights) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: 'Próximos 7 dias',
      value: insights.stats.upcomingAppointments,
      color: 'text-primary',
      icon: Calendar,
    },
    {
      label: 'Pacientes em Risco',
      value: insights.stats.atRiskPatients,
      color: 'text-orange-600',
      icon: AlertTriangle,
    },
    {
      label: 'Gaps na Agenda',
      value: insights.stats.scheduleGaps,
      color: 'text-yellow-600',
      icon: Clock,
    },
    {
      label: 'Taxa de Retenção',
      value: `${insights.stats.retentionRate}%`,
      color: 'text-green-600',
      icon: TrendingDown,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border/50"
          >
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className={cn('h-4 w-4', stat.color)} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ProactiveSuggestions;
