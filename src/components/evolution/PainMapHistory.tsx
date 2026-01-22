import { Card } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { ScrollArea } from '@/components/web/ui/scroll-area';
import { Skeleton } from '@/components/shared/ui/skeleton';
import type { PainMapRecord } from '@/types/painMap';
import { PainMapService } from '@/lib/services/painMapService';
import { Calendar, MapPin } from 'lucide-react';

interface PainMapHistoryProps {
  painMaps: PainMapRecord[];
  isLoading: boolean;
}

export function PainMapHistory({ painMaps, isLoading }: PainMapHistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-20" />
          </Card>
        ))}
      </div>
    );
  }

  if (painMaps.length === 0) {
    return (
      <Card className="p-8 text-center">
        <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Nenhum mapa de dor registrado ainda</p>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-3">
        {painMaps.map((painMap) => {
          const mostAffectedRegion = painMap.pain_points.length > 0
            ? painMap.pain_points.sort((a, b) => b.intensity - a.intensity)[0]
            : null;

          return (
            <Card key={painMap.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {new Date(painMap.recorded_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(painMap.recorded_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <Badge 
                  variant={painMap.global_pain_level <= 3 ? 'secondary' : painMap.global_pain_level <= 6 ? 'default' : 'destructive'}
                >
                  Dor: {painMap.global_pain_level}/10
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Regiões afetadas:</span>
                  <span className="font-medium">{painMap.pain_points.length}</span>
                </div>

                {mostAffectedRegion && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Região mais afetada:</span>
                    <span className="font-medium">
                      {PainMapService.getRegionLabel(mostAffectedRegion.region)} ({mostAffectedRegion.intensity}/10)
                    </span>
                  </div>
                )}

                {painMap.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground text-xs mb-1">Observações:</p>
                    <p className="text-sm">{painMap.notes}</p>
                  </div>
                )}
              </div>

              {/* Mini visualization */}
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">Pontos de dor:</p>
                <div className="flex flex-wrap gap-2">
                  {painMap.pain_points.map((point, idx) => (
                    <Badge 
                      key={idx}
                      variant="outline"
                      style={{ 
                        backgroundColor: PainMapService.getPainIntensityColor(point.intensity) + '20',
                        borderColor: PainMapService.getPainIntensityColor(point.intensity)
                      }}
                    >
                      {PainMapService.getRegionLabel(point.region)}: {point.intensity}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
