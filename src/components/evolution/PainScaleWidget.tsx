import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Activity,
    TrendingDown,
    TrendingUp,
    Minus,
    MapPin,
    ChevronUp,
    ChevronDown,
    Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PainScaleData {
    level: number;
    location?: string;
    character?: string;
}

interface PainHistory {
    date: string;
    level: number;
}

interface PainScaleWidgetProps {
    value: PainScaleData;
    onChange: (data: PainScaleData) => void;
    history?: PainHistory[];
    showTrend?: boolean;
    disabled?: boolean;
    className?: string;
}

const PAIN_LEVELS = [
    { level: 0, label: 'Sem dor', color: 'bg-green-500', emoji: '😊' },
    { level: 1, label: 'Mínima', color: 'bg-green-400', emoji: '🙂' },
    { level: 2, label: 'Leve', color: 'bg-lime-400', emoji: '🙂' },
    { level: 3, label: 'Desconfortável', color: 'bg-lime-500', emoji: '😐' },
    { level: 4, label: 'Moderada', color: 'bg-yellow-400', emoji: '😐' },
    { level: 5, label: 'Incômoda', color: 'bg-yellow-500', emoji: '😕' },
    { level: 6, label: 'Angustiante', color: 'bg-orange-400', emoji: '😟' },
    { level: 7, label: 'Muito forte', color: 'bg-orange-500', emoji: '😣' },
    { level: 8, label: 'Intensa', color: 'bg-red-400', emoji: '😖' },
    { level: 9, label: 'Severa', color: 'bg-red-500', emoji: '😫' },
    { level: 10, label: 'Insuportável', color: 'bg-red-600', emoji: '🤯' },
];

const PAIN_LOCATIONS = [
    'Cervical', 'Torácica', 'Lombar', 'Sacral',
    'Ombro D', 'Ombro E', 'Cotovelo D', 'Cotovelo E',
    'Punho D', 'Punho E', 'Mão D', 'Mão E',
    'Quadril D', 'Quadril E', 'Joelho D', 'Joelho E',
    'Tornozelo D', 'Tornozelo E', 'Pé D', 'Pé E',
    'Cabeça', 'Pescoço', 'Tórax', 'Abdome',
];

const PAIN_CHARACTERS = [
    'Pontada', 'Queimação', 'Latejante', 'Pressão',
    'Formigamento', 'Fisgada', 'Cólica', 'Facada',
    'Irradiada', 'Localizada', 'Difusa', 'Profunda',
];

export const PainScaleWidget: React.FC<PainScaleWidgetProps> = ({
    value,
    onChange,
    history = [],
    showTrend = true,
    disabled = false,
    className,
}) => {
    const [showDetails, setShowDetails] = useState(false);

    const currentLevel = PAIN_LEVELS[value.level] || PAIN_LEVELS[0];

    // Calculate trend from history
    const trend = useMemo(() => {
        if (history.length < 2) return null;
        const lastValue = history[0]?.level ?? value.level;
        const prevValue = history[1]?.level ?? lastValue;
        const diff = lastValue - prevValue;

        if (diff < 0) return { direction: 'down', value: Math.abs(diff), label: 'Melhorou' };
        if (diff > 0) return { direction: 'up', value: diff, label: 'Piorou' };
        return { direction: 'same', value: 0, label: 'Estável' };
    }, [history, value.level]);

    const handleLevelChange = (level: number) => {
        if (disabled) return;
        onChange({ ...value, level: Math.max(0, Math.min(10, level)) });
    };

    const handleLocationChange = (location: string) => {
        onChange({ ...value, location });
    };

    const handleCharacterChange = (character: string) => {
        onChange({ ...value, character });
    };

    const getTrendIcon = () => {
        if (!trend) return null;
        switch (trend.direction) {
            case 'down':
                return <TrendingDown className="h-4 w-4 text-green-500" />;
            case 'up':
                return <TrendingUp className="h-4 w-4 text-red-500" />;
            default:
                return <Minus className="h-4 w-4 text-muted-foreground" />;
        }
    };

    return (
        <TooltipProvider>
            <Card className={cn('border-border/50 shadow-sm overflow-hidden', className)}>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Activity className="h-5 w-5 text-primary" />
                            Nível de Dor (EVA)
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {showTrend && trend && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'text-xs cursor-help',
                                                trend.direction === 'down' && 'border-green-500/50 text-green-600',
                                                trend.direction === 'up' && 'border-red-500/50 text-red-600'
                                            )}
                                        >
                                            {getTrendIcon()}
                                            <span className="ml-1">{trend.label}</span>
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Comparado à última sessão
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDetails(!showDetails)}
                                className="h-7 px-2"
                            >
                                {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Main Pain Display */}
                    <div className="flex items-center gap-4">
                        {/* Large Level Display */}
                        <div className={cn(
                            'w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex flex-col items-center justify-center',
                            currentLevel.color,
                            'shadow-lg transition-all duration-300'
                        )}>
                            <span className="text-3xl sm:text-4xl font-bold text-white">
                                {value.level}
                            </span>
                            <span className="text-xs text-white/80">/10</span>
                        </div>

                        {/* Level Info & Controls */}
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{currentLevel.emoji}</span>
                                <span className="font-medium text-lg">{currentLevel.label}</span>
                            </div>

                            {/* Slider-like buttons */}
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleLevelChange(value.level - 1)}
                                    disabled={disabled || value.level === 0}
                                    className="h-8 w-8 p-0"
                                >
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <Input
                                    type="number"
                                    min={0}
                                    max={10}
                                    value={value.level}
                                    onChange={(e) => handleLevelChange(parseInt(e.target.value) || 0)}
                                    disabled={disabled}
                                    className="w-16 h-8 text-center"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleLevelChange(value.level + 1)}
                                    disabled={disabled || value.level === 10}
                                    className="h-8 w-8 p-0"
                                >
                                    <span className="text-lg">+</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Color Scale Bar */}
                    <div className="space-y-1">
                        <div className="flex rounded-lg overflow-hidden h-3">
                            {PAIN_LEVELS.map((level) => (
                                <button
                                    key={level.level}
                                    onClick={() => handleLevelChange(level.level)}
                                    disabled={disabled}
                                    className={cn(
                                        'flex-1 transition-all',
                                        level.color,
                                        value.level === level.level && 'ring-2 ring-white ring-offset-2 ring-offset-background scale-y-150 z-10',
                                        !disabled && 'hover:opacity-80 cursor-pointer'
                                    )}
                                    title={`${level.level} - ${level.label}`}
                                />
                            ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                            <span>Sem dor</span>
                            <span>Moderada</span>
                            <span>Insuportável</span>
                        </div>
                    </div>

                    {/* Expanded Details */}
                    {showDetails && (
                        <div className="space-y-4 pt-2 border-t border-border/50">
                            {/* Location */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1 text-sm">
                                    <MapPin className="h-3.5 w-3.5" />
                                    Localização da dor
                                </Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {PAIN_LOCATIONS.map((loc) => (
                                        <Button
                                            key={loc}
                                            variant={value.location === loc ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => handleLocationChange(loc)}
                                            disabled={disabled}
                                            className="h-7 text-xs"
                                        >
                                            {loc}
                                        </Button>
                                    ))}
                                </div>
                                <Input
                                    placeholder="Ou digite outra localização..."
                                    value={value.location || ''}
                                    onChange={(e) => handleLocationChange(e.target.value)}
                                    disabled={disabled}
                                    className="h-8 text-sm"
                                />
                            </div>

                            {/* Character */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1 text-sm">
                                    <Info className="h-3.5 w-3.5" />
                                    Característica da dor
                                </Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {PAIN_CHARACTERS.map((char) => (
                                        <Button
                                            key={char}
                                            variant={value.character === char ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => handleCharacterChange(char)}
                                            disabled={disabled}
                                            className="h-7 text-xs"
                                        >
                                            {char}
                                        </Button>
                                    ))}
                                </div>
                                <Input
                                    placeholder="Ou digite outra característica..."
                                    value={value.character || ''}
                                    onChange={(e) => handleCharacterChange(e.target.value)}
                                    disabled={disabled}
                                    className="h-8 text-sm"
                                />
                            </div>

                            {/* History Mini Chart */}
                            {history.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-sm">Histórico recente</Label>
                                    <div className="flex items-end gap-1 h-12">
                                        {history.slice(0, 10).reverse().map((h, idx) => (
                                            <Tooltip key={idx}>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        className={cn(
                                                            'flex-1 rounded-t transition-all',
                                                            PAIN_LEVELS[h.level]?.color || 'bg-muted'
                                                        )}
                                                        style={{ height: `${(h.level / 10) * 100}%`, minHeight: '4px' }}
                                                    />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{new Date(h.date).toLocaleDateString('pt-BR')}</p>
                                                    <p className="font-bold">Nível: {h.level}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    );
};

export default PainScaleWidget;
