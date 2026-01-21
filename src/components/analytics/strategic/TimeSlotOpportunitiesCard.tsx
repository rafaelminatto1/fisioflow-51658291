/**
 * Time Slot Opportunities Card Component
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Progress } from '@/components/shared/ui/progress';
import { Clock, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { TimeSlotInsight } from '@/lib/analytics/strategic/types';

interface TimeSlotOpportunitiesCardProps {
  opportunities: TimeSlotInsight[];
  title?: string;
  description?: string;
  showTable?: boolean;
}

export function TimeSlotOpportunitiesCard({
  opportunities,
  title = "Horários com Baixa Demanda",
  description = "Identificamos horários com oportunidades de preenchimento",
  showTable = false,
}: TimeSlotOpportunitiesCardProps) {
  if (opportunities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma oportunidade detectada no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getOpportunityColor = (level: TimeSlotInsight['opportunityLevel']) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTrendIcon = (trend: TimeSlotInsight['trend']) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'declining': return <TrendingDown className="h-3 w-3 text-red-600" />;
      default: return <Minus className="h-3 w-3 text-gray-400" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* List View */}
        {!showTable && (
          <div className="space-y-3">
            {opportunities.slice(0, 5).map((opportunity, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {opportunity.dayName} às {opportunity.hourLabel}
                    </span>
                    <Badge className={getOpportunityColor(opportunity.opportunityLevel)} variant="secondary">
                      {opportunity.opportunityLevel === 'high' ? 'Alta' :
                       opportunity.opportunityLevel === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>
                    {getTrendIcon(opportunity.trend)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Ocupação: {opportunity.occupancyRate.toFixed(0)}%</span>
                    <span>Oportunidade: {opportunity.opportunityScore.toFixed(0)}%</span>
                  </div>
                  <Progress value={opportunity.opportunityScore} className="h-1" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table View */}
        {showTable && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-medium">Dia</th>
                  <th className="text-left p-2 text-sm font-medium">Horário</th>
                  <th className="text-left p-2 text-sm font-medium">Ocupação</th>
                  <th className="text-left p-2 text-sm font-medium">Score</th>
                  <th className="text-left p-2 text-sm font-medium">Nível</th>
                  <th className="text-left p-2 text-sm font-medium">Tendência</th>
                  <th className="text-left p-2 text-sm font-medium">Ações Sugeridas</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opportunity, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2 text-sm">{opportunity.dayName}</td>
                    <td className="p-2 text-sm">{opportunity.hourLabel}</td>
                    <td className="p-2 text-sm">{opportunity.occupancyRate.toFixed(0)}%</td>
                    <td className="p-2 text-sm">
                      <Progress value={opportunity.opportunityScore} className="h-2 w-20" />
                      <span className="ml-2">{opportunity.opportunityScore.toFixed(0)}%</span>
                    </td>
                    <td className="p-2 text-sm">
                      <Badge className={getOpportunityColor(opportunity.opportunityLevel)} variant="secondary">
                        {opportunity.opportunityLevel === 'high' ? 'Alta' :
                         opportunity.opportunityLevel === 'medium' ? 'Média' : 'Baixa'}
                      </Badge>
                    </td>
                    <td className="p-2 text-sm">
                      <div className="flex items-center gap-1">
                        {getTrendIcon(opportunity.trend)}
                        <span className="capitalize">{opportunity.trend}</span>
                      </div>
                    </td>
                    <td className="p-2 text-sm">
                      <ul className="list-disc list-inside text-xs text-muted-foreground">
                        {opportunity.suggestedActions.slice(0, 2).map((action, i) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
