/**
 * Weekly Occupancy Heatmap - Visual calendar of occupancy rates
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';

interface WeeklyOccupancyHeatmapProps {
  organizationId?: string;
  title?: string;
  description?: string;
}

export function WeeklyOccupancyHeatmap({
  organizationId,
  title = "Mapa de Ocupação Semanal",
  description = "Visualização da taxa de ocupação por dia e horário",
}: WeeklyOccupancyHeatmapProps) {
  const { data: heatmapData, isLoading } = useQuery({
    queryKey: ['strategic-analytics', 'occupancy-heatmap', organizationId],
    queryFn: async () => {
      const startDate = subDays(new Date(), 30);

      const { data, error } = await supabase
        .from('daily_strategic_metrics_snapshot')
        .select('*')
        .gte('date', startDate.toISOString())
        .order('date', { ascending: true });

      if (error) throw error;

      // Group by day of week and hour
      const cellData = new Map<string, { occupied: number; total: number }>();

      for (const row of data || []) {
        const key = `${row.day_of_week}-${row.hour}`;
        if (!cellData.has(key)) {
          cellData.set(key, { occupied: 0, total: 0 });
        }
        const cell = cellData.get(key)!;
        cell.total += 1;
        if (row.status === 'concluido' || row.status === 'completed') {
          cell.occupied += 1;
        }
      }

      return cellData;
    },
    enabled: true,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8h to 19h
  const days = [
    { key: 1, label: 'Seg' },
    { key: 2, label: 'Ter' },
    { key: 3, label: 'Qua' },
    { key: 4, label: 'Qui' },
    { key: 5, label: 'Sex' },
    { key: 6, label: 'Sáb' },
  ];

  const getCellColor = (occupancyRate: number) => {
    if (occupancyRate < 30) return 'bg-green-500';
    if (occupancyRate < 50) return 'bg-yellow-500';
    if (occupancyRate < 70) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getCellOpacity = (occupancyRate: number) => {
    return Math.max(0.1, Math.min(1, occupancyRate / 100));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Carregando mapa de ocupação...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header row with hours */}
            <div className="flex items-center">
              <div className="w-12 shrink-0"></div>
              {hours.map((hour) => (
                <div key={hour} className="flex-1 text-center text-xs font-medium text-muted-foreground">
                  {hour}h
                </div>
              ))}
            </div>

            {/* Data rows */}
            {days.map((day) => (
              <div key={day.key} className="flex items-center">
                <div className="w-12 shrink-0 text-sm font-medium text-muted-foreground">
                  {day.label}
                </div>
                {hours.map((hour) => {
                  const key = `${day.key}-${hour}`;
                  const cell = heatmapData?.get(key);
                  const occupancyRate = cell ? (cell.occupied / cell.total) * 100 : 0;

                  return (
                    <div
                      key={hour}
                      className="flex-1 aspect-square m-0.5 rounded-sm relative group"
                      style={{
                        backgroundColor: `hsl(var(--primary) / ${getCellOpacity(occupancyRate)})`,
                      }}
                      title={`${day.label} ${hour}h: ${occupancyRate.toFixed(0)}% ocupado`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs font-medium bg-background px-1 rounded">
                          {occupancyRate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-xs text-muted-foreground">Baixa ocupação</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-sm bg-primary/10" />
                <div className="w-4 h-4 rounded-sm bg-primary/30" />
                <div className="w-4 h-4 rounded-sm bg-primary/50" />
                <div className="w-4 h-4 rounded-sm bg-primary/70" />
                <div className="w-4 h-4 rounded-sm bg-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Alta ocupação</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
