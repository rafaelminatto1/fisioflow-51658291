/**
 * Recommendations Panel - AI-powered strategic recommendations
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Lightbulb, TrendingUp, Users, DollarSign, AlertCircle, ChevronRight, Sparkles } from 'lucide-react';
import type { ForecastResponse, StrategicInsight } from '@/lib/analytics/strategic/types';

interface RecommendationsPanelProps {
  forecast?: ForecastResponse;
  insights: StrategicInsight[];
  title?: string;
  description?: string;
}

export function RecommendationsPanel({
  forecast,
  insights,
  title = "Recomendações Estratégicas",
  description = "Sugestões personalizadas baseadas em análise de IA",
}: RecommendationsPanelProps) {
  // Generate recommendations from forecast
  const forecastRecommendations = forecast?.insights.recommendations || [];
  const forecastOpportunities = forecast?.insights.opportunities || [];
  const forecastRisks = forecast?.insights.risks || [];

  // Generate recommendations from insights
  const insightRecommendations = insights
    .filter(i => i.priority === 'critical' || i.priority === 'high')
    .slice(0, 3)
    .map(insight => ({
      title: getTitleForInsightType(insight.insight_type),
      description: insight.recommendations[0] || 'Tomar ação necessária',
      priority: insight.priority,
      category: getCategoryForInsightType(insight.insight_type),
    }));

  // Combine all recommendations
  const allRecommendations = [
    ...insightRecommendations,
    ...(forecastOpportunities.map(op => ({
      title: 'Oportunidade Detectada',
      description: op,
      priority: 'medium' as const,
      category: 'opportunity' as const,
    }))),
    ...(forecastRisks.map(risk => ({
      title: 'Risco Identificado',
      description: risk,
      priority: 'high' as const,
      category: 'risk' as const,
    }))),
  ].slice(0, 6);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'revenue': return DollarSign;
      case 'acquisition': return Users;
      case 'operational': return TrendingUp;
      case 'risk': return AlertCircle;
      default: return Lightbulb;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'revenue': return 'text-green-600 bg-green-50';
      case 'acquisition': return 'text-blue-600 bg-blue-50';
      case 'operational': return 'text-purple-600 bg-purple-50';
      case 'risk': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  function getTitleForInsightType(type: string): string {
    const titles: Record<string, string> = {
      'low_demand_slot': 'Otimizar Horário Vago',
      'low_acquisition_period': 'Campanha de Captação',
      'revenue_opportunity': 'Maximizar Receita',
      'retention_risk': 'Recuperar Paciente em Risco',
      'seasonal_pattern': 'Aproveitar Padrão Sazonal',
      'operational_inefficiency': 'Melhorar Eficiência Operacional',
    };
    return titles[type] || 'Ação Recomendada';
  }

  function getCategoryForInsightType(type: string): string {
    const categories: Record<string, string> = {
      'low_demand_slot': 'operational',
      'low_acquisition_period': 'acquisition',
      'revenue_opportunity': 'revenue',
      'retention_risk': 'risk',
      'seasonal_pattern': 'operational',
      'operational_inefficiency': 'operational',
    };
    return categories[type] || 'general';
  }

  if (allRecommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Todas as métricas estão dentro do esperado. Sem recomendações no momento.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {allRecommendations.map((rec, index) => {
          const Icon = getCategoryIcon(rec.category);

          return (
            <div
              key={index}
              className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${getCategoryColor(rec.category)} shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{rec.title}</span>
                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(rec.priority)}`} />
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.description}</p>
                </div>
              </div>
            </div>
          );
        })}

        {allRecommendations.length > 0 && (
          <Button variant="link" className="w-full mt-2" size="sm">
            Ver plano de ação completo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
