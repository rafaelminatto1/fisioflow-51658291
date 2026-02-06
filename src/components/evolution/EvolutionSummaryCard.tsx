/**
 * Card de Resumo na página de Evolução
 * Exibe EvolutionStats em layout vertical com barras de progresso
 */

import { BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EvolutionStats } from '@/components/evolution/EvolutionStats';

interface EvolutionSummaryCardProps {
  stats: {
    totalEvolutions: number;
    completedGoals: number;
    totalGoals: number;
    avgGoalProgress: number;
    activePathologiesCount: number;
    totalMeasurements: number;
    completionRate: number;
  };
}

export function EvolutionSummaryCard({ stats }: EvolutionSummaryCardProps) {
  return (
    <Card className="border-primary/20 bg-primary/5 flex min-h-[250px] flex-col shadow-sm overflow-hidden">
      <CardHeader className="pb-1 pt-2 px-3 flex-shrink-0">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <BarChart2 className="h-3 w-3 text-primary" />
          Resumo da Evolução
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-2 flex-1">
        <EvolutionStats stats={stats} vertical />
      </CardContent>
    </Card>
  );
}
