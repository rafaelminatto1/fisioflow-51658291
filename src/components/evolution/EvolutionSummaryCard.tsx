/**
 * Card de Resumo na página de Evolução
 * Exibe EvolutionStats sempre visível (Evoluções, Metas, Progresso, Patologias, Medições, Sucesso)
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
    <Card className="border-primary/20 bg-primary/5 flex flex-col">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-primary" />
          Resumo
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 flex-1">
        <EvolutionStats stats={stats} compact />
      </CardContent>
    </Card>
  );
}
