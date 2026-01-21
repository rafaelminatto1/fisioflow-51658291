import React, { useState, useMemo, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/shared/ui/tooltip';
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

// ==========================================================================================
// TYPES & INTERFACES
// ==========================================================================================

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

export interface PainTrend {
    direction: 'up' | 'down' | 'same';
    value: number;
    label: string;
}

// ==========================================================================================
// CONSTANTS
// ==========================================================================================

export const PAIN_LEVELS = [
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
] as const;

export const PAIN_LOCATIONS = [
    'Cervical', 'Torácica', 'Lombar', 'Sacral',
    'Ombro D', 'Ombro E', 'Cotovelo D', 'Cotovelo E',
    'Punho D', 'Punho E', 'Mão D', 'Mão E',
    'Quadril D', 'Quadril E', 'Joelho D', 'Joelho E',
    'Tornozelo D', 'Tornozelo E', 'Pé D', 'Pé E',
    'Cabeça', 'Pescoço', 'Tórax', 'Abdome',
] as const;

export const PAIN_CHARACTERS = [
    'Pontada', 'Queimação', 'Latejante', 'Pressão',
    'Formigamento', 'Fisgada', 'Cólica', 'Facada',
    'Irradiada', 'Localizada', 'Difusa', 'Profunda',
] as const;

// ==========================================================================================
// UTILITY FUNCTIONS
// ==========================================================================================

export const calculatePainTrend = (history: PainHistory[], currentLevel: number): PainTrend | null => {
    if (history.length < 2) return null;
    const lastValue = history[0]?.level ?? currentLevel;
    const prevValue = history[1]?.level ?? lastValue;
    const diff = lastValue - prevValue;

    if (diff < 0) return { direction: 'down', value: Math.abs(diff), label: 'Melhorou' };
    if (diff > 0) return { direction: 'up', value: diff, label: 'Piorou' };
    return { direction: 'same', value: 0, label: 'Estável' };
};

export const getPainLevelInfo = (level: number) => {
    const clampedLevel = Math.max(0, Math.min(10, level));
    return PAIN_LEVELS[clampedLevel] || PAIN_LEVELS[0];
};

// ==========================================================================================
// MEMOIZED SUB-COMPONENTS
// ==========================================================================================

interface PainTrendBadgeProps {
    trend: PainTrend | null;
}

const PainTrendBadge = memo<PainTrendBadgeProps>(({ trend }) => {
    if (!trend) return null;

    const getIcon = () => {
        switch (trend.direction) {
            case 'down': return <TrendingDown className="h-4 w-4 text-green-500" aria-hidden="true" />;
            case 'up': return <TrendingUp className="h-4 w-4 text-red-500" aria-hidden="true" />;
            default: return <Minus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
        }
    };

    const getColorClass = () => {
        switch (trend.direction) {
            case 'down': return 'border-green-500/50 text-green-600 dark:text-green-400';
            case 'up': return 'border-red-500/50 text-red-600 dark:text-red-400';
            default: return 'text-muted-foreground';
        }
    };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Badge
                    variant="outline"
                    className={cn('text-xs cursor-help gap-1', getColorClass())}
                    aria-label={`Tendência de dor: ${trend.label}`}
                >
                    {getIcon()}
                    <span>{trend.label}</span>
                </Badge>
            </TooltipTrigger>
            <TooltipContent>Comparado à última sessão</TooltipContent>
        </Tooltip>
    );
});

PainTrendBadge.displayName = 'PainTrendBadge';

interface PainLevelIndicatorProps {
    level: number;
}

const PainLevelIndicator = memo<PainLevelIndicatorProps>(({ level }) => {
    const currentLevel = getPainLevelInfo(level);

    return (
        <motion.div
            key={level}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={cn(
                'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl flex flex-col items-center justify-center shadow-lg',
                currentLevel.color,
                'text-white'
            )}
            aria-label={`Nível de dor: ${level} de 10 - ${currentLevel.label}`}
            role="img"
        >
            <span className="text-xl sm:text-2xl md:text-3xl font-bold" aria-hidden="true">{level}</span>
            <span className="text-[10px] sm:text-xs md:text-sm opacity-90 font-medium" aria-hidden="true">/10</span>
        </motion.div>
    );
});

PainLevelIndicator.displayName = 'PainLevelIndicator';

interface PainChartProps {
    history: PainHistory[];
}

const PainChart = memo<PainChartProps>(({ history }) => {
    if (history.length === 0) return null;

    const recentHistory = history.slice(0, 10).reverse();

    return (
        <div className="space-y-2.5 sm:space-y-3" role="region" aria-label="Gráfico de histórico de dor">
            <Label className="text-sm font-medium text-foreground">Histórico recente</Label>
            <div
                className="flex items-end gap-1 sm:gap-1.5 h-16 sm:h-20 w-full pt-2"
                role="list"
                aria-label="Barras representando níveis de dor históricos"
            >
                {recentHistory.map((h, idx) => {
                    const levelInfo = getPainLevelInfo(h.level);
                    const date = new Date(h.date);
                    const formattedDate = date.toLocaleDateString('pt-BR');

                    return (
                        <Tooltip key={`${h.date}-${idx}`}>
                            <TooltipTrigger asChild>
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${Math.max((h.level / 10) * 100, 10)}%` }}
                                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                                    className={cn(
                                        'flex-1 rounded-t-md transition-colors hover:opacity-80 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring',
                                        levelInfo.color
                                    )}
                                    role="listitem"
                                    aria-label={`Dor em ${formattedDate}: nível ${h.level}`}
                                    tabIndex={0}
                                />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{formattedDate}</p>
                                <p className="font-bold">Nível: {h.level}</p>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
});

PainChart.displayName = 'PainChart';

// ==========================================================================================
// COLOR SCALE SEGMENT (Optimized - no nested TooltipProvider)
// ==========================================================================================

interface PainScaleSegmentProps {
    levelInfo: typeof PAIN_LEVELS[number];
    currentLevel: number;
    disabled: boolean;
    onClick: () => void;
}

const PainScaleSegment = memo<PainScaleSegmentProps>(({ levelInfo, currentLevel, disabled, onClick }) => {
    const isSelected = currentLevel === levelInfo.level;
    const isPast = currentLevel > levelInfo.level;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <motion.button
                    whileHover={{ scale: disabled ? 1 : 1.15 }}
                    whileTap={{ scale: disabled ? 1 : 0.95 }}
                    onClick={onClick}
                    disabled={disabled}
                    className={cn(
                        'flex-1 transition-all duration-200 relative first:rounded-l-full last:rounded-r-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                        levelInfo.color,
                        isSelected && 'ring-2 ring-white ring-offset-1 ring-offset-background z-10 shadow-md brightness-110',
                        isPast && 'opacity-70',
                        disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    aria-label={`${levelInfo.level} - ${levelInfo.label}`}
                    aria-pressed={isSelected}
                    type="button"
                />
            </TooltipTrigger>
            <TooltipContent side="bottom">
                <div className="text-center">
                    <p className="font-bold text-lg">{levelInfo.level}</p>
                    <p className="text-xs">{levelInfo.label}</p>
                    <p className="text-lg mt-1" aria-hidden="true">{levelInfo.emoji}</p>
                </div>
            </TooltipContent>
        </Tooltip>
    );
});

PainScaleSegment.displayName = 'PainScaleSegment';

// ==========================================================================================
// LOCATION & CHARACTER BUTTONS (Memoized)
// ==========================================================================================

interface PainOptionButtonProps {
    value: string;
    selectedValue: string | undefined;
    onClick: (value: string) => void;
    disabled: boolean;
    ariaLabel?: string;
}

const PainOptionButton = memo<PainOptionButtonProps>(({
    value,
    selectedValue,
    onClick,
    disabled,
    ariaLabel
}) => {
    const isSelected = selectedValue === value;
    const handleClick = useCallback(() => onClick(value), [onClick, value]);

    return (
        <Button
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={handleClick}
            disabled={disabled}
            className={cn(
                "h-7 sm:h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs rounded-md transition-all",
                isSelected && "font-semibold"
            )}
            aria-pressed={isSelected}
            aria-label={ariaLabel || value}
            type="button"
        >
            {value}
        </Button>
    );
});

PainOptionButton.displayName = 'PainOptionButton';

// ==========================================================================================
// MAIN COMPONENT
// ==========================================================================================

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
    const currentLevelInfo = getPainLevelInfo(value.level);

    const trend = useMemo(() => calculatePainTrend(history, value.level), [history, value.level]);

    const handleToggleDetails = useCallback((show: boolean) => {
        if (onToggleDetails) {
            onToggleDetails(show);
        } else {
            setInternalShowDetails(show);
        }
    }, [onToggleDetails]);

    const handleLevelChange = useCallback((level: number) => {
        if (disabled) return;
        const clampedLevel = Math.max(0, Math.min(10, level));
        onChange({ ...value, level: clampedLevel });
    }, [disabled, onChange, value]);

    const handleLocationChange = useCallback((location: string) => {
        if (disabled) return;
        onChange({ ...value, location });
    }, [disabled, onChange, value]);

    const handleCharacterChange = useCallback((character: string) => {
        if (disabled) return;
        onChange({ ...value, character });
    }, [disabled, onChange, value]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        const val = parseInt(e.target.value);

        if (e.target.value === '') {
            handleLevelChange(0);
        } else if (!isNaN(val)) {
            // Allow typing but clamp on blur/change
            if (val >= 0 && val <= 10) {
                handleLevelChange(val);
            }
        }
    }, [disabled, handleLevelChange]);

    const handleInputBlur = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val)) {
            handleLevelChange(Math.max(0, Math.min(10, val)));
        }
    }, [handleLevelChange]);

    return (
        <TooltipProvider>
            <Card
                className={cn(
                    'border-border/50 shadow-sm overflow-hidden bg-card transition-shadow duration-200',
                    'hover:shadow-md',
                    className,
                    hideHeader && "border-0 shadow-none bg-transparent"
                )}
            >
                {!hideHeader && (
                    <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 pt-3">
                        <div className="flex items-center justify-between gap-2 sm:gap-4">
                            <CardTitle className="flex items-center gap-2 sm:gap-2.5 text-base font-semibold">
                                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" aria-hidden="true" />
                                <span className="truncate">Nível de Dor (EVA)</span>
                            </CardTitle>
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                {showTrend && <PainTrendBadge trend={trend} />}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleDetails(!showDetails)}
                                    className="h-8 w-8 p-0 hover:bg-muted/50"
                                    aria-label={showDetails ? "Ocultar detalhes" : "Mostrar detalhes"}
                                    aria-expanded={showDetails}
                                    type="button"
                                >
                                    {showDetails ? (
                                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                )}

                <CardContent className="px-3 sm:px-4 pb-3 space-y-3 sm:space-y-4">
                    {/* Main Pain Display */}
                    <div className="flex items-center gap-3 sm:gap-4 md:gap-5">
                        <PainLevelIndicator level={value.level} />

                        {/* Level Info & Controls */}
                        <div className="flex-1 space-y-2.5 sm:space-y-3 min-w-0">
                            <div className="flex items-center gap-2 sm:gap-2.5">
                                <motion.span
                                    key={currentLevelInfo.emoji}
                                    initial={{ scale: 0.5, rotate: -20 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    className="text-xl sm:text-2xl"
                                    aria-hidden="true"
                                >
                                    {currentLevelInfo.emoji}
                                </motion.span>
                                <div className="min-w-0">
                                    <span className="font-semibold text-sm sm:text-base leading-none block truncate">
                                        {currentLevelInfo.label}
                                    </span>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-2 sm:gap-2.5">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleLevelChange(value.level - 1)}
                                    disabled={disabled || value.level === 0}
                                    className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 hover:bg-rose-50 hover:border-rose-200 dark:hover:bg-rose-950/20 transition-all focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label="Diminuir nível de dor"
                                    type="button"
                                >
                                    <Minus className="h-4 w-4" aria-hidden="true" />
                                </Button>
                                <div className="relative flex-1 min-w-0">
                                    <Input
                                        type="number"
                                        min={0}
                                        max={10}
                                        step={1}
                                        value={value.level}
                                        onChange={handleInputChange}
                                        onBlur={handleInputBlur}
                                        onFocus={(e) => e.target.select()}
                                        disabled={disabled}
                                        className="w-full text-center font-bold text-base sm:text-lg h-9 sm:h-10 [appearance:_textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-2 focus-visible:ring-ring"
                                        aria-label="Nível de dor (0-10)"
                                        aria-valuemin={0}
                                        aria-valuemax={10}
                                        aria-valuenow={value.level}
                                        aria-describedby="pain-level-description"
                                    />
                                    <span
                                        id="pain-level-description"
                                        className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs text-muted-foreground pointer-events-none"
                                        aria-hidden="true"
                                    >
                                        /10
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleLevelChange(value.level + 1)}
                                    disabled={disabled || value.level === 10}
                                    className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 hover:bg-rose-50 hover:border-rose-200 dark:hover:bg-rose-950/20 transition-all focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label="Aumentar nível de dor"
                                    type="button"
                                >
                                    <span className="text-base sm:text-lg font-medium" aria-hidden="true">+</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Pain Scale Grid 2x5 + Botão 10 */}
                    <div className="space-y-2">
                        {/* Grid 2x5 (0-9) */}
                        <div className="grid grid-cols-5 gap-1.5">
                            {PAIN_LEVELS.slice(0, 10).map((levelInfo) => {
                                const isSelected = value.level === levelInfo.level;
                                return (
                                    <motion.button
                                        key={levelInfo.level}
                                        type="button"
                                        onClick={() => handleLevelChange(levelInfo.level)}
                                        disabled={disabled}
                                        whileHover={!disabled ? { scale: 1.03 } : {}}
                                        whileTap={!disabled ? { scale: 0.97 } : {}}
                                        animate={isSelected ? { scale: 1.03 } : { scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                                        className={cn(
                                            'relative rounded-lg overflow-hidden',
                                            'h-12 sm:h-14 shadow-sm',
                                            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                                            disabled && 'opacity-40 cursor-not-allowed',
                                            !disabled && 'cursor-pointer'
                                        )}
                                        aria-label={`Nível ${levelInfo.level} - ${levelInfo.label}`}
                                        aria-pressed={isSelected}
                                    >
                                        {/* Background */}
                                        <div className={cn(
                                            'absolute inset-0 transition-transform',
                                            isSelected && 'scale-105'
                                        )} style={{ backgroundColor: levelInfo.color.replace('bg-', '').replace('-500', '').replace('-400', '').replace('-600', '') === 'green' ? '#22c55e' :
                                            levelInfo.color.includes('green-400') ? '#4ade80' :
                                            levelInfo.color.includes('lime-400') ? '#bef264' :
                                            levelInfo.color.includes('lime-500') ? '#84cc16' :
                                            levelInfo.color.includes('yellow-400') ? '#fde047' :
                                            levelInfo.color.includes('yellow-500') ? '#facc15' :
                                            levelInfo.color.includes('orange-400') ? '#fb923c' :
                                            levelInfo.color.includes('orange-500') ? '#f97316' :
                                            levelInfo.color.includes('red-400') ? '#ef4444' :
                                            levelInfo.color.includes('red-500') ? '#dc2626' : '#991b1b'
                                        }} />

                                        {/* Borda de seleção */}
                                        {isSelected && (
                                            <motion.div
                                                className="absolute inset-0 border-2 border-white rounded-lg"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                            />
                                        )}

                                        {/* Conteúdo */}
                                        <div className="relative z-10 flex flex-col items-center justify-center h-full">
                                            <span className={cn(
                                                'text-lg sm:text-xl font-bold leading-tight',
                                                levelInfo.level <= 4 ? 'text-green-950' :
                                                levelInfo.level <= 5 ? 'text-yellow-900' : 'text-white'
                                            )}>
                                                {levelInfo.level}
                                            </span>
                                            <span className="text-xs">{levelInfo.emoji}</span>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Botão 10 full-width */}
                        <motion.button
                            type="button"
                            onClick={() => handleLevelChange(10)}
                            disabled={disabled}
                            whileHover={!disabled ? { scale: 1.01 } : {}}
                            whileTap={!disabled ? { scale: 0.99 } : {}}
                            animate={value.level === 10 ? { scale: 1.01 } : { scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            className={cn(
                                'relative w-full rounded-lg overflow-hidden',
                                'h-12 sm:h-14 shadow-sm',
                                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                                disabled && 'opacity-40 cursor-not-allowed',
                                !disabled && 'cursor-pointer'
                            )}
                            aria-label="Nível 10 - Insuportável"
                            aria-pressed={value.level === 10}
                        >
                            <div className={cn(
                                'absolute inset-0 bg-red-700 transition-transform',
                                value.level === 10 && 'scale-[1.02]'
                            )} />

                            {value.level === 10 && (
                                <motion.div
                                    className="absolute inset-0 border-2 border-white rounded-lg"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                />
                            )}

                            <div className="relative z-10 flex items-center justify-center gap-2 h-full">
                                <span className="text-lg sm:text-xl font-bold leading-tight text-white">
                                    10
                                </span>
                                <span className="text-xs">🤯</span>
                            </div>
                        </motion.button>

                        {/* Labels inferiores */}
                        <div className="flex items-center justify-between px-1 pt-1">
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                <span className="text-[9px] text-muted-foreground">Leve</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                                <span className="text-[9px] text-muted-foreground">Moderada</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                <span className="text-[9px] text-muted-foreground">Intensa</span>
                            </div>
                        </div>
                    </div>

                    {/* Expanded Details with Animation */}
                    <AnimatePresence mode="wait">
                        {showDetails && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-4 sm:space-y-6 pt-3 sm:pt-4 mt-2 border-t border-border/50">
                                    {/* Location */}
                                    <div className="space-y-2.5 sm:space-y-3">
                                        <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                                            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                                            <span>Localização</span>
                                        </Label>
                                        <div
                                            className="flex flex-wrap gap-1.5 sm:gap-2"
                                            role="group"
                                            aria-label="Selecione a localização da dor"
                                        >
                                            {PAIN_LOCATIONS.map((loc) => (
                                                <PainOptionButton
                                                    key={loc}
                                                    value={loc}
                                                    selectedValue={value.location}
                                                    onClick={handleLocationChange}
                                                    disabled={disabled}
                                                    ariaLabel={`Localização: ${loc}`}
                                                />
                                            ))}
                                        </div>
                                        <Input
                                            placeholder="Ou digite outra localização..."
                                            value={value.location || ''}
                                            onChange={(e) => handleLocationChange(e.target.value)}
                                            disabled={disabled}
                                            className="h-9 sm:h-10 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                                            aria-label="Digite uma localização personalizada para a dor"
                                        />
                                    </div>

                                    {/* Character */}
                                    <div className="space-y-2.5 sm:space-y-3">
                                        <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                                            <Info className="h-4 w-4 text-primary" aria-hidden="true" />
                                            <span>Característica</span>
                                        </Label>
                                        <div
                                            className="flex flex-wrap gap-1.5 sm:gap-2"
                                            role="group"
                                            aria-label="Selecione a característica da dor"
                                        >
                                            {PAIN_CHARACTERS.map((char) => (
                                                <PainOptionButton
                                                    key={char}
                                                    value={char}
                                                    selectedValue={value.character}
                                                    onClick={handleCharacterChange}
                                                    disabled={disabled}
                                                    ariaLabel={`Característica: ${char}`}
                                                />
                                            ))}
                                        </div>
                                        <Input
                                            placeholder="Ou digite outra característica..."
                                            value={value.character || ''}
                                            onChange={(e) => handleCharacterChange(e.target.value)}
                                            disabled={disabled}
                                            className="h-9 sm:h-10 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                                            aria-label="Digite uma característica personalizada para a dor"
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
