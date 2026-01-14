import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PainPoint } from './BodyMap';

interface PainPointsListProps {
    points: PainPoint[];
    onPointEdit?: (point: PainPoint) => void;
    onPointRemove?: (pointId: string) => void;
    className?: string;
}

// Function to get color based on intensity
const getIntensityColor = (intensity: number): string => {
    if (intensity <= 2) return '#22c55e';
    if (intensity <= 4) return '#eab308';
    if (intensity <= 6) return '#f97316';
    if (intensity <= 8) return '#ef4444';
    return '#7f1d1d';
};

// Icons by pain type
const PAIN_TYPE_ICONS: Record<PainPoint['painType'], string> = {
    sharp: '⚡',
    throbbing: '💓',
    burning: '🔥',
    tingling: '✨',
    numbness: '❄️',
    stiffness: '🔒',
    aguda: '⚡',
    cronica: '⏳',
    latejante: '💓',
    queimacao: '🔥',
    formigamento: '✨',
    dormencia: '❄️',
    peso: '🔒',
    pontada: '📌',
};

const PAIN_TYPE_LABELS: Record<PainPoint['painType'], string> = {
    sharp: 'Aguda',
    throbbing: 'Latejante',
    burning: 'Queimação',
    tingling: 'Formigamento',
    numbness: 'Dormência',
    stiffness: 'Rigidez',
    aguda: 'Aguda',
    cronica: 'Crônica',
    latejante: 'Latejante',
    queimacao: 'Queimação',
    formigamento: 'Formigamento',
    dormencia: 'Dormência',
    peso: 'Peso',
    pontada: 'Pontada',
};

export function PainPointsList({
    points,
    onPointEdit,
    onPointRemove,
    className,
}: PainPointsListProps) {
    return (
        <ScrollArea className={cn("w-full pr-4", className)}>
            <div className="space-y-3">
                {points.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-lg border-2 border-dashed">
                        <MapPin className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
                        <p className="text-sm font-medium text-foreground mb-1">
                            Nenhum ponto
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Clique no mapa para adicionar
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
                                    'hover:border-primary/50 transition-colors group relative'
                                )}
                            >
                                {/* Intensity Badge */}
                                <div
                                    className={cn(
                                        'w-10 h-10 rounded-lg flex items-center justify-center',
                                        'font-bold text-lg border-2 shrink-0'
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
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1 shrink-0">
                                    {onPointEdit && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                            onClick={() => onPointEdit(point)}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {onPointRemove && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
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
    );
}
