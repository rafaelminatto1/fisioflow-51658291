/**
 * PatientPageInsights - Bloco compacto de insights de negócio
 * Exibe ações sugeridas com base nos dados da página de pacientes
 */

import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, Phone, AlertTriangle, DollarSign, Users, TrendingUp } from 'lucide-react';

interface ClassificationStats {
  active: number;
  inactive7: number;
  inactive30: number;
  inactive60: number;
  noShowRisk: number;
  hasUnpaid: number;
  newPatients: number;
  completed: number;
}

interface PatientPageInsightsProps {
  totalPatients: number;
  classificationStats: ClassificationStats;
}

export function PatientPageInsights({ totalPatients, classificationStats }: PatientPageInsightsProps) {
  const {
    inactive30,
    inactive60,
    noShowRisk,
    hasUnpaid,
    newPatients,
    active,
  } = classificationStats;

  const activePercentage = totalPatients > 0 ? (active / totalPatients) * 100 : 0;
  const inactive30Plus = inactive30 + inactive60;

  const insights: Array<{
    icon: React.ElementType;
    bgClass: string;
    text: string;
  }> = [];

  if (inactive30Plus > 0) {
    insights.push({
      icon: Phone,
      bgClass: 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      text: `${inactive30Plus} paciente(s) inativo(s) há 30+ dias — entre em contato`,
    });
  }

  if (noShowRisk > 0) {
    insights.push({
      icon: AlertTriangle,
      bgClass: 'bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
      text: `${noShowRisk} paciente(s) com risco de no-show — confirme próximas sessões`,
    });
  }

  if (hasUnpaid > 0) {
    insights.push({
      icon: DollarSign,
      bgClass: 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      text: `${hasUnpaid} paciente(s) com sessões pagas não realizadas — pendências financeiras`,
    });
  }

  if (newPatients > 0) {
    insights.push({
      icon: Users,
      bgClass: 'bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      text: `${newPatients} novo(s) paciente(s) sem sessão — priorize avaliação inicial`,
    });
  }

  if (activePercentage > 70 && totalPatients > 0) {
    insights.push({
      icon: TrendingUp,
      bgClass: 'bg-emerald-100 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
      text: `Ótimo engajamento: ${activePercentage.toFixed(0)}% dos pacientes ativos`,
    });
  } else if (activePercentage < 50 && totalPatients > 5) {
    insights.push({
      icon: Lightbulb,
      bgClass: 'bg-amber-100 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
      text: `Taxa de atividade ${activePercentage.toFixed(0)}% — considere campanha de reativação`,
    });
  }

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-200/50 dark:border-blue-800/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold">Insights e Ações Sugeridas</h3>
        </div>
        <ul className="space-y-2">
          {insights.slice(0, 4).map((insight, i) => {
            const Icon = insight.icon;
            return (
              <li
                key={i}
                className={`flex items-start gap-2 p-2 rounded-md border text-sm ${insight.bgClass}`}
              >
                <Icon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                <span>{insight.text}</span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
