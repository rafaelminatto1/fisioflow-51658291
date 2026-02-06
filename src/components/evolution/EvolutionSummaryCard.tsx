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
    <Card className="border-primary/20 bg-primary/5 flex flex-col shadow-sm overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-4 flex-shrink-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-primary" />
          Resumo da Evolução
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 flex-1 min-h-0 overflow-auto">
        <EvolutionStats stats={stats} vertical />
      </CardContent>
    </Card>
  );
}
