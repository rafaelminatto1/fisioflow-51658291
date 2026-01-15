import React, { useState, useMemo } from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---

export interface PainScaleData {
    level: number;
    location?: string;
    character?: string;
}

export interface PainHistory {
    date: string;
    level: number;
}

export interface PainScaleWidgetProps {
    value: PainScaleData;
    onChange: (data: PainScaleData) => void;
    history?: PainHistory[];
    showTrend?: boolean;
    disabled?: boolean;
    className?: string;
    hideHeader?: boolean;
    showDetails?: boolean;
    onToggleDetails?: (show: boolean) => void;
}

// --- Constants ---

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

// --- Utilities ---

export const calculatePainTrend = (history: PainHistory[], currentLevel: number) => {
    if (history.length < 2) return null;
    const lastValue = history[0]?.level ?? currentLevel;
    const prevValue = history[1]?.level ?? lastValue;
    const diff = lastValue - prevValue;

    if (diff < 0) return { direction: 'down', value: Math.abs(diff), label: 'Melhorou' };
    if (diff > 0) return { direction: 'up', value: diff, label: 'Piorou' };
    return { direction: 'same', value: 0, label: 'Estável' };
};

// --- Sub-components ---

const PainTrendBadge = ({ trend }: { trend: ReturnType<typeof calculatePainTrend> }) => {
    if (!trend) return null;

    const getIcon = () => {
        switch (trend.direction) {
            case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />;
            case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
            default: return <Minus className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getColorClass = () => {
        switch (trend.direction) {
            case 'down': return 'border-green-500/50 text-green-600';
            case 'up': return 'border-red-500/50 text-red-600';
            default: return 'text-muted-foreground';
        }
    };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Badge variant="outline" className={cn('text-xs cursor-help gap-1', getColorClass())}>
                    {getIcon()}
                    <span>{trend.label}</span>
                </Badge>
            </TooltipTrigger>
            <TooltipContent>Comparado à última sessão</TooltipContent>
        </Tooltip>
    );
};

const PainLevelIndicator = ({ level }: { level: number }) => {
    const currentLevel = PAIN_LEVELS[level] || PAIN_LEVELS[0];

    return (
        <motion.div
            key={level}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={cn(
                'w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex flex-col items-center justify-center',
                currentLevel.color,
                'shadow-lg text-white'
            )}
        >
            <span className="text-2xl sm:text-3xl font-bold">{level}</span>
            <span className="text-[10px] sm:text-xs opacity-80">/10</span>
        </motion.div>
    );
};

const PainChart = ({ history }: { history: PainHistory[] }) => {
    if (history.length === 0) return null;

    return (
        <div className="space-y-2">
            <Label className="text-sm">Histórico recente</Label>
            <div className="flex items-end gap-1 h-16 w-full pt-2">
                {history.slice(0, 10).reverse().map((h, idx) => (
                    <Tooltip key={idx}>
                        <TooltipTrigger asChild>
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${Math.max((h.level / 10) * 100, 10)}%` }}
                                transition={{ duration: 0.5, delay: idx * 0.05 }}
                                className={cn(
                                    'flex-1 rounded-t-md transition-colors hover:opacity-80 cursor-pointer',
                                    PAIN_LEVELS[h.level]?.color || 'bg-muted'
                                )}
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
    );
};

// --- Main Component ---

export const PainScaleWidget: React.FC<PainScaleWidgetProps> = ({
    value,
    onChange,
    history = [],
    showTrend = true,
    disabled = false,
    className,
    hideHeader = false,
    showDetails: controlledShowDetails,
    onToggleDetails,
}) => {
    const [internalShowDetails, setInternalShowDetails] = useState(false);
    const showDetails = controlledShowDetails ?? internalShowDetails;
    const currentLevelInfo = PAIN_LEVELS[value.level] || PAIN_LEVELS[0];

    const trend = useMemo(() => calculatePainTrend(history, value.level), [history, value.level]);

    const handleToggleDetails = (show: boolean) => {
        if (onToggleDetails) {
            onToggleDetails(show);
        } else {
            setInternalShowDetails(show);
        }
    };

    const handleLevelChange = (level: number) => {
        if (disabled) return;
        onChange({ ...value, level: Math.max(0, Math.min(10, level)) });
    };

    const handleLocationChange = (location: string) => {
        if (disabled) return;
        onChange({ ...value, location });
    };

    const handleCharacterChange = (character: string) => {
        if (disabled) return;
        onChange({ ...value, character });
    };

    return (
        <TooltipProvider>
            <Card className={cn('border-border/50 shadow-sm overflow-hidden bg-card', className, hideHeader && "border-0 shadow-none bg-transparent")}>
                {!hideHeader && (
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Activity className="h-5 w-5 text-primary" />
                                Nível de Dor (EVA)
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                {showTrend && <PainTrendBadge trend={trend} />}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleDetails(!showDetails)}
                                    className="h-7 w-7 p-0"
                                    aria-label={showDetails ? "Ocultar detalhes" : "Mostrar detalhes"}
                                >
                                    {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                )}

                <CardContent className="space-y-3">
                    {/* Main Pain Display */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        <PainLevelIndicator level={value.level} />

                        {/* Level Info & Controls */}
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                                <motion.span
                                    key={currentLevelInfo.emoji}
                                    initial={{ scale: 0.5, rotate: -20 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    className="text-2xl"
                                >
                                    {currentLevelInfo.emoji}
                                </motion.span>
                                <span className="font-medium text-base leading-none">{currentLevelInfo.label}</span>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleLevelChange(value.level - 1)}
                                    disabled={disabled || value.level === 0}
                                    className="h-8 w-8 shrink-0"
                                    aria-label="Diminuir dor"
                                >
                                    <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <Input
                                    type="number"
                                    min={0}
                                    max={10}
                                    value={value.level}
                                    onChange={(e) => handleLevelChange(parseInt(e.target.value) || 0)}
                                    disabled={disabled}
                                    className="w-12 text-center font-bold text-base h-8"
                                    aria-label="Nível de dor numérico"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleLevelChange(value.level + 1)}
                                    disabled={disabled || value.level === 10}
                                    className="h-8 w-8 shrink-0"
                                    aria-label="Aumentar dor"
                                >
                                    <span className="text-base font-medium">+</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Color Scale Bar */}
                    <div className="space-y-1.5" aria-hidden="true">
                        <div className="flex rounded-full overflow-hidden h-3 bg-muted">
                            {PAIN_LEVELS.map((level) => (
                                <motion.button
                                    key={level.level}
                                    whileHover={{ scaleY: 1.5 }}
                                    onClick={() => handleLevelChange(level.level)}
                                    disabled={disabled}
                                    className={cn(
                                        'flex-1 transition-all',
                                        level.color,
                                        value.level === level.level && 'ring-2 ring-white ring-offset-2 ring-offset-background z-10 scale-y-125'
                                    )}
                                    title={`${level.level} - ${level.label}`}
                                />
                            ))}
                        </div>
                        <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1">
                            <span>Sem dor</span>
                            <span>Moderada</span>
                            <span>Insuportável</span>
                        </div>
                    </div>

                    {/* Expanded Details with Animation */}
                    <AnimatePresence>
                        {showDetails && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-6 pt-2 border-t border-border/50">
                                    {/* Location */}
                                    <div className="space-y-3">
                                        <Label className="flex items-center gap-2 text-sm text-foreground/80">
                                            <MapPin className="h-4 w-4 text-primary" />
                                            Localização
                                        </Label>
                                        <div className="flex flex-wrap gap-2">
                                            {PAIN_LOCATIONS.map((loc) => (
                                                <Button
                                                    key={loc}
                                                    variant={value.location === loc ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => handleLocationChange(loc)}
                                                    disabled={disabled}
                                                    className={cn("h-7 text-xs rounded-full", value.location === loc && "font-semibold")}
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
                                            className="h-9 text-sm"
                                        />
                                    </div>

                                    {/* Character */}
                                    <div className="space-y-3">
                                        <Label className="flex items-center gap-2 text-sm text-foreground/80">
                                            <Info className="h-4 w-4 text-primary" />
                                            Característica
                                        </Label>
                                        <div className="flex flex-wrap gap-2">
                                            {PAIN_CHARACTERS.map((char) => (
                                                <Button
                                                    key={char}
                                                    variant={value.character === char ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => handleCharacterChange(char)}
                                                    disabled={disabled}
                                                    className={cn("h-7 text-xs rounded-full", value.character === char && "font-semibold")}
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
                                            className="h-9 text-sm"
                                        />
                                    </div>

                                    {/* History Chart */}
                                    <PainChart history={history} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </TooltipProvider>
    );
};

export default PainScaleWidget;
