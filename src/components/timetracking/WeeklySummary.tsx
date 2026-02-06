/**
 * WeeklySummary - Resumo semanal de tempo
 * Mostra total de horas por dia e progresso em relação à meta
 */

import React from 'react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { TimeEntry } from '@/types/timetracking';
import { groupByDay, formatDuration, formatHoursDecimal } from '@/lib/timetracking/timeCalculator';

interface WeeklySummaryProps {
  entries: TimeEntry[];
  onUpdate: (id: string, updates: Partial<TimeEntry>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  targetHoursPerDay?: number; // Meta de horas por dia
}

export function WeeklySummary({
  entries,
  _onUpdate,
  _onDelete,
  targetHoursPerDay = 8,
}: WeeklySummaryProps) {
  // Agrupar por dia
  const dailyBreakdown = groupByDay(entries);

  // Calcular totais
  const totalSeconds = entries.reduce((sum, e) => sum + e.duration_seconds, 0);
  const billableSeconds = entries.filter((e) => e.is_billable).reduce((sum, e) => sum + e.duration_seconds, 0);
  const totalDays = dailyBreakdown.length;

  return (
    <div className="space-y-4">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Total da Semana"
          value={formatHoursDecimal(totalSeconds)}
          subtitle={`${formatDuration(totalSeconds)} trabalhadas`}
          icon={TrendingUp}
          color="blue"
        />
        <SummaryCard
          title="Faturável"
          value={formatHoursDecimal(billableSeconds)}
          subtitle={`${((billableSeconds / totalSeconds) * 100).toFixed(0)}% do total`}
          icon={Target}
          color="green"
        />
        <SummaryCard
          title="Média Diária"
          value={formatHoursDecimal(totalSeconds / totalDays || 0)}
          subtitle={`${totalDays} dias trabalhados`}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Breakdown Diário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Breakdown Diário</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dailyBreakdown.map((day) => {
              const hours = day.total_seconds / 3600;
              const percentage = (hours / targetHoursPerDay) * 100;
              const isToday = isSameDay(new Date(day.date), new Date());

              return (
                <div
                  key={day.date}
                  className={`space-y-2 ${isToday ? 'bg-primary/5 -mx-4 px-4 py-2 rounded-lg' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {format(new Date(day.date), 'EEE, dd/MMM', { locale: ptBR })}
                      </span>
                      {isToday && <Badge variant="default" className="text-xs">Hoje</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDuration(day.total_seconds)} ({formatHoursDecimal(day.total_seconds)}h)
                      <span className="ml-2 text-green-600">
                        +{formatDuration(day.billable_seconds)}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progresso vs meta */}
                  <Progress value={Math.min(percentage, 100)} className="h-2" />

                  {/* Info adicional */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{day.entries.length} {day.entries.length === 1 ? 'entrada' : 'entradas'}</span>
                    <span>
                      Meta: {targetHoursPerDay}h ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              );
            })}

            {dailyBreakdown.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma entrada esta semana</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}

function SummaryCard({ title, value, subtitle, icon: Icon, color }: SummaryCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}h</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * TimeReport - Placeholder para relatórios
 */
export function TimeReport() {
  return (
    <Card>
      <CardContent className="p-12">
        <div className="text-center text-muted-foreground">
          <p>Relatórios detalhados em breve...</p>
        </div>
      </CardContent>
    </Card>
  );
}
