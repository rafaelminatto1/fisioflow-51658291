import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PainIntensity, PainType, BodyRegion } from '@/types/painMap';
import { PainMapService } from '@/lib/services/painMapService';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

interface PainDetailsFormProps {
    selectedRegion: BodyRegion | null;
    intensity: PainIntensity;
    painType: PainType;
    description: string;
    onUpdate: (intensity: PainIntensity, painType: PainType, description?: string) => void;
    onRemove?: (region: BodyRegion) => void;
    readOnly?: boolean;
    className?: string;
}

export function PainDetailsForm({
    selectedRegion,
    intensity,
    painType,
    description,
    onUpdate,
    onRemove,
    readOnly = false,
    className
}: PainDetailsFormProps) {
    const getIntensityColor = (val: number) => {
        if (val === 0) return 'transparent';
        if (val <= 2) return '#22c55e';
        if (val <= 4) return '#84cc16';
        if (val <= 6) return '#eab308';
        if (val <= 8) return '#f97316';
        return '#ef4444';
    };

    if (!selectedRegion) {
        return (
            <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <span className="text-2xl">👆</span>
                </div>
                <p className="text-muted-foreground text-sm">
                    Clique em uma região do corpo<br />para registrar a dor
                </p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-5 animate-fade-in", className)}>
            <div className="flex items-center justify-between">
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <Badge variant="secondary" className="text-sm font-medium">
                        {PainMapService.getRegionLabel(selectedRegion)}
                    </Badge>
                </div>
                {onRemove && !readOnly && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(selectedRegion)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                        title="Remover ponto"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="intensity" className="text-xs font-semibold text-muted-foreground uppercase">Intensidade da Dor</Label>
                <Select
                    value={intensity.toString()}
                    onValueChange={(v) => onUpdate(
                        parseInt(v) as PainIntensity,
                        painType,
                        description
                    )}
                    disabled={readOnly}
                >
                    <SelectTrigger id="intensity" className="h-11 border-white/10 bg-black/20 backdrop-blur-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                            <SelectItem key={n} value={n.toString()}>
                                <div className="flex items-center gap-2">
                                    {n > 0 && (
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: getIntensityColor(n) }}
                                        />
                                    )}
                                    <span>{n} - {n === 0 ? 'Sem dor' : n <= 2 ? 'Mínima' : n <= 4 ? 'Leve' : n <= 6 ? 'Moderada' : n <= 8 ? 'Intensa' : 'Severa'}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="painType" className="text-xs font-semibold text-muted-foreground uppercase">Tipo de Dor</Label>
                <Select
                    value={painType}
                    onValueChange={(v) => onUpdate(
                        intensity,
                        v as PainType,
                        description
                    )}
                    disabled={readOnly}
                >
                    <SelectTrigger id="painType" className="h-11 border-white/10 bg-black/20 backdrop-blur-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="aguda">🔥 Aguda</SelectItem>
                        <SelectItem value="cronica">⏳ Crônica</SelectItem>
                        <SelectItem value="latejante">💓 Latejante</SelectItem>
                        <SelectItem value="queimacao">🌡️ Queimação</SelectItem>
                        <SelectItem value="formigamento">⚡ Formigamento</SelectItem>
                        <SelectItem value="dormencia">😶 Dormência</SelectItem>
                        <SelectItem value="peso">🏋️ Peso</SelectItem>
                        <SelectItem value="pontada">📌 Pontada</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase">Observações</Label>
                <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => onUpdate(
                        intensity,
                        painType,
                        e.target.value
                    )}
                    placeholder="Descreva a dor..."
                    rows={3}
                    disabled={readOnly}
                    className="resize-none border-white/10 bg-black/20 backdrop-blur-sm focus:border-primary/50"
                />
            </div>
        </div>
    );
}
