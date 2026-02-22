/**
 * PatientPageInsights - Bloco compacto de insights de negócio
 * Exibe ações sugeridas com base nos dados da página de pacientes
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, Phone, AlertTriangle, DollarSign, Users, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const [isExpanded, setIsExpanded] = useState(false);
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
    type: string;
  }> = [];

  if (inactive30Plus > 0) {
    insights.push({
      icon: Phone,
      type: 'danger',
      bgClass: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50',
      text: `${inactive30Plus} paciente(s) inativo(s) há 30+ dias`,
    });
  }

  if (noShowRisk > 0) {
    insights.push({
      icon: AlertTriangle,
      type: 'warning',
      bgClass: 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/50',
      text: `${noShowRisk} paciente(s) com risco de no-show`,
    });
  }

  if (hasUnpaid > 0) {
    insights.push({
      icon: DollarSign,
      type: 'warning',
      bgClass: 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-900/50',
      text: `${hasUnpaid} paciente(s) com pendências financeiras`,
    });
  }

  if (newPatients > 0) {
    insights.push({
      icon: Users,
      type: 'info',
      bgClass: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50',
      text: `${newPatients} novo(s) paciente(s) aguardando avaliação`,
    });
  }

  if (activePercentage > 70 && totalPatients > 0) {
    insights.push({
      icon: TrendingUp,
      type: 'success',
      bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50',
      text: `Excelente engajamento: ${activePercentage.toFixed(0)}% ativos`,
    });
  }

  if (insights.length === 0) return null;

  return (
    <div className="relative group">
      <Card className={cn(
        "overflow-hidden transition-all duration-300 border-primary/10 shadow-sm",
        isExpanded ? "max-h-[400px]" : "max-h-[44px]"
      )}>
        <CardContent className="p-0">
          <div
            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex -space-x-1">
                {insights.slice(0, 3).map((insight, i) => (
                  <div key={i} className={cn("flex items-center justify-center h-6 w-6 rounded-full border-2 border-background ring-1 ring-primary/5", insight.bgClass.split(' ')[0])}>
                    <insight.icon className="h-3 w-3" />
                  </div>
                ))}
              </div>
              <span className="text-xs font-medium truncate">
                {isExpanded ? "Insights de negócio" : insights[0].text}
                {!isExpanded && insights.length > 1 && (
                  <span className="ml-2 text-muted-foreground font-normal">
                    e mais {insights.length - 1} indicadores
                  </span>
                )}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-2">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {isExpanded && (
            <div className="px-3 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2">
              {insights.map((insight, i) => {
                const Icon = insight.icon;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg border text-[11px] font-medium leading-tight transition-all hover:scale-[1.01]",
                      insight.bgClass
                    )}
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background/50">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span>{insight.text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
