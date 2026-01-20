/**
 * Metrics Summary Cards - Key performance indicators at a glance
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Calendar, Users, AlertCircle, Target } from 'lucide-react';
import type { StrategicDashboardMetrics } from '@/lib/analytics/strategic/types';

interface MetricsSummaryCardsProps {
  summary: StrategicDashboardMetrics['summary'];
}

export function MetricsSummaryCards({ summary }: MetricsSummaryCardsProps) {
  const cards = [
    {
      title: 'Oportunidades',
      value: summary.totalOpportunities,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: null,
      description: 'Horários com baixa ocupação',
    },
    {
      title: 'Insights Críticos',
      value: summary.criticalInsights,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      trend: summary.criticalInsights > 5 ? 'high' : summary.criticalInsights > 0 ? 'medium' : null,
      description: 'Requerem atenção imediata',
    },
    {
      title: 'Alertas Ativos',
      value: summary.activeAlerts,
      icon: Users,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      trend: summary.activeAlerts > 3 ? 'high' : summary.activeAlerts > 0 ? 'medium' : null,
      description: 'Notificações do sistema',
    },
    {
      title: 'Score de Saúde',
      value: `${summary.overallHealthScore}%`,
      icon: Target,
      color: summary.overallHealthScore >= 80 ? 'text-green-600' : summary.overallHealthScore >= 50 ? 'text-yellow-600' : 'text-red-600',
      bgColor: summary.overallHealthScore >= 80 ? 'bg-green-50' : summary.overallHealthScore >= 50 ? 'bg-yellow-50' : 'bg-red-50',
      trend: summary.overallHealthScore >= 80 ? 'good' : summary.overallHealthScore >= 50 ? 'medium' : 'poor',
      description: 'Saúde geral do sistema',
    },
  ];

  const getTrendIcon = (trend: string | null) => {
    if (trend === 'good' || trend === 'high') return <TrendingUp className="h-3 w-3 text-red-600" />;
    if (trend === 'poor' || trend === 'low') return <TrendingDown className="h-3 w-3 text-green-600" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className={`absolute -right-2 -top-2 p-3 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-300 ${card.bgColor}`}>
            <card.icon className="h-16 w-16" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
              {card.trend && getTrendIcon(card.trend)}
            </div>
            <div className="flex items-center justify-between">
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
