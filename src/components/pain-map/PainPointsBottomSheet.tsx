import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Edit2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PainPoint } from './BodyMap';

interface PainPointsBottomSheetProps {
  points: PainPoint[];
  onPointEdit?: (point: PainPoint) => void;
  onPointRemove?: (pointId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

// Função para obter cor baseada na intensidade
const getIntensityColor = (intensity: number): string => {
  if (intensity <= 2) return '#22c55e';
  if (intensity <= 4) return '#eab308';
  if (intensity <= 6) return '#f97316';
  if (intensity <= 8) return '#ef4444';
  return '#7f1d1d';
};

// Ícones por tipo de dor
const PAIN_TYPE_ICONS: Record<PainPoint['painType'], string> = {
  sharp: '⚡',
  throbbing: '💓',
  burning: '🔥',
  tingling: '✨',
  numbness: '❄️',
  stiffness: '🔒',
};

const PAIN_TYPE_LABELS: Record<PainPoint['painType'], string> = {
  sharp: 'Aguda',
  throbbing: 'Latejante',
  burning: 'Queimação',
  tingling: 'Formigamento',
  numbness: 'Dormência',
  stiffness: 'Rigidez',
};

export function PainPointsBottomSheet({
  points,
  onPointEdit,
  onPointRemove,
  open,
  onOpenChange,
  trigger,
}: PainPointsBottomSheetProps) {
  const [isOpen, setIsOpen] = useState(open ?? false);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const controlledOpen = open !== undefined ? open : isOpen;
  const controlledSetOpen = open !== undefined ? onOpenChange : handleOpenChange;

  return (
    <>
      {trigger && (
        <div onClick={() => controlledSetOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      )}

      <Drawer open={controlledOpen} onOpenChange={controlledSetOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader className="text-left">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle>Pontos Registrados</DrawerTitle>
                <DrawerDescription>
                  {points.length} {points.length === 1 ? 'ponto registrado' : 'pontos registrados'}
                </DrawerDescription>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary font-bold">
                {points.length}
              </Badge>
            </div>
          </DrawerHeader>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-3 pb-6">
              {points.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MapPin className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    Nenhum ponto registrado
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Clique no mapa para adicionar pontos de dor
                  </p>
                </div>
              ) : (
                points.map((point) => {
                  const color = getIntensityColor(point.intensity);
                  
                  return (
                    <div
                      key={point.id}
                      className={cn(
                        'flex items-center gap-3 p-3 bg-card border border-border rounded-xl',
                        'hover:border-primary/50 transition-colors group'
                      )}
                    >
                      {/* Intensity Badge */}
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          'font-bold text-lg border-2'
                        )}
                        style={{
                          backgroundColor: `${color}15`,
                          borderColor: `${color}40`,
                          color: color,
                        }}
                      >
                        {point.intensity}
                      </div>

                      {/* Point Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-medium text-sm text-foreground truncate">
                            {point.region}
                          </h4>
                          <Badge
                            variant="outline"
                            className="text-[10px] ml-2 shrink-0"
                            style={{
                              borderColor: `${color}40`,
                              color: color,
                            }}
                          >
                            {PAIN_TYPE_ICONS[point.painType]} {PAIN_TYPE_LABELS[point.painType]}
                          </Badge>
                        </div>
                        
                        {point.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {point.notes}
                          </p>
                        )}
                        
                        {!point.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Intensidade: {point.intensity}/10
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 shrink-0">
                        {onPointEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => onPointEdit(point)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {onPointRemove && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={() => onPointRemove(point.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {points.length > 0 && (
            <div className="border-t p-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => controlledSetOpen(false)}
              >
                Fechar
              </Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}

