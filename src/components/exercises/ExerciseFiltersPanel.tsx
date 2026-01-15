import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
    Filter, X, ChevronDown, Home, Dumbbell, Target,
    Activity, Check, RotateCcw
} from 'lucide-react';
import {
    EQUIPMENT,
    getHomeEquipment,
    FILTER_PRESETS,
    HOME_EQUIPMENT_GROUP,
    NO_EQUIPMENT_GROUP_ID,
    BODY_PARTS,
    CATEGORIES,
    DIFFICULTY_LEVELS,
} from '@/lib/constants/exerciseConstants';

export interface ExerciseFiltersState {
    bodyParts: string[];
    difficulty: string[];
    categories: string[];
    equipment: string[];
    homeOnly: boolean;
}

interface ExerciseFiltersPanelProps {
    filters: ExerciseFiltersState;
    onFiltersChange: (filters: ExerciseFiltersState) => void;
    totalCount: number;
    filteredCount: number;
}

// Multi-select popover component
function MultiSelectPopover({
    label,
    icon: Icon,
    options,
    selected,
    onChange,
    placeholder = 'Selecionar...',
}: {
    label: string;
    icon: React.ElementType;
    options: { value: string; label: string }[];
    selected: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
}) {
    const [open, setOpen] = React.useState(false);

    const toggleValue = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter((v) => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'h-9 px-3 gap-2 justify-between min-w-[140px]',
                        selected.length > 0 && 'border-primary/50 bg-primary/5'
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{label}</span>
                    </div>
                    {selected.length > 0 ? (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                            {selected.length}
                        </Badge>
                    ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={placeholder} />
                    <CommandList>
                        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
                        <CommandGroup className="max-h-[280px] overflow-y-auto">
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    onSelect={() => toggleValue(option.value)}
                                    className="cursor-pointer"
                                >
                                    <div className="flex items-center gap-2 flex-1">
                                        <Checkbox
                                            checked={selected.includes(option.value)}
                                            className="pointer-events-none"
                                        />
                                        <span>{option.label}</span>
                                    </div>
                                    {selected.includes(option.value) && (
                                        <Check className="h-4 w-4 text-primary" />
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
                {selected.length > 0 && (
                    <div className="border-t p-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onChange([])}
                            className="w-full h-8 text-xs text-muted-foreground"
                        >
                            <X className="h-3 w-3 mr-1" />
                            Limpar seleção
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

export function ExerciseFiltersPanel({
    filters,
    onFiltersChange,
    totalCount,
    filteredCount,
}: ExerciseFiltersPanelProps) {
    const bodyPartsOptions = BODY_PARTS.map((b) => ({ value: b.label, label: b.label }));
    const categoryOptions = CATEGORIES.map((c) => ({ value: c.value, label: c.label }));
    // Filter out individual home equipment items from the main list
    // and add the special group option
    const equipmentOptions = React.useMemo(() => {
        const baseOptions = filters.homeOnly
            ? getHomeEquipment().map((e) => ({ value: e.label, label: e.label }))
            : EQUIPMENT
                .filter(e => !HOME_EQUIPMENT_GROUP.includes(e.value)) // Exclude individual items
                .map((e) => ({ value: e.label, label: e.label }));

        // Add the group option at the top
        return [
            { label: 'Sem Equipamento / Adaptado', value: NO_EQUIPMENT_GROUP_ID },
            ...baseOptions
        ];
    }, [filters.homeOnly]);

    const hasActiveFilters =
        filters.bodyParts.length > 0 ||
        filters.difficulty.length > 0 ||
        filters.categories.length > 0 ||
        filters.equipment.length > 0 ||
        filters.homeOnly;

    const clearAllFilters = () => {
        onFiltersChange({
            bodyParts: [],
            difficulty: [],
            categories: [],
            equipment: [],
            homeOnly: false,
        });
    };

    const applyPreset = (preset: typeof FILTER_PRESETS[number]) => {
        onFiltersChange({
            bodyParts: preset.filters.bodyParts || [],
            difficulty: preset.filters.difficulty || [],
            categories: [],
            equipment: preset.filters.equipment || [],
            homeOnly: preset.id === 'home_exercises',
        });
    };

    const activeFiltersCount =
        filters.bodyParts.length +
        filters.difficulty.length +
        filters.categories.length +
        filters.equipment.length +
        (filters.homeOnly ? 1 : 0);

    return (
        <div className="space-y-3">
            {/* Filters Row */}
            <div className="flex items-center gap-2 flex-wrap">
                {/* Body Parts */}
                <MultiSelectPopover
                    label="Partes do Corpo"
                    icon={Target}
                    options={bodyPartsOptions}
                    selected={filters.bodyParts}
                    onChange={(values) => onFiltersChange({ ...filters, bodyParts: values })}
                    placeholder="Buscar parte do corpo..."
                />

                {/* Difficulty */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                'h-9 px-3 gap-2 justify-between min-w-[140px]',
                                filters.difficulty.length > 0 && 'border-primary/50 bg-primary/5'
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Dificuldade</span>
                            </div>
                            {filters.difficulty.length > 0 ? (
                                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                    {filters.difficulty.length}
                                </Badge>
                            ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-2" align="start">
                        <div className="space-y-1">
                            {DIFFICULTY_LEVELS.map((level) => (
                                <label
                                    key={level.value}
                                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                                >
                                    <Checkbox
                                        checked={filters.difficulty.includes(level.value)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                onFiltersChange({
                                                    ...filters,
                                                    difficulty: [...filters.difficulty, level.value],
                                                });
                                            } else {
                                                onFiltersChange({
                                                    ...filters,
                                                    difficulty: filters.difficulty.filter((d) => d !== level.value),
                                                });
                                            }
                                        }}
                                    />
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            'text-xs',
                                            level.color === 'emerald' && 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10',
                                            level.color === 'amber' && 'border-amber-500/30 text-amber-600 bg-amber-500/10',
                                            level.color === 'rose' && 'border-rose-500/30 text-rose-600 bg-rose-500/10'
                                        )}
                                    >
                                        {level.label}
                                    </Badge>
                                </label>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Category */}
                <MultiSelectPopover
                    label="Categoria"
                    icon={Dumbbell}
                    options={categoryOptions}
                    selected={filters.categories}
                    onChange={(values) => onFiltersChange({ ...filters, categories: values })}
                    placeholder="Buscar categoria..."
                />

                {/* Equipment */}
                <MultiSelectPopover
                    label="Equipamentos"
                    icon={Dumbbell}
                    options={equipmentOptions}
                    selected={filters.equipment}
                    onChange={(values) => onFiltersChange({ ...filters, equipment: values })}
                    placeholder="Buscar equipamento..."
                />

                {/* Home Only Toggle */}
                <Button
                    variant={filters.homeOnly ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => onFiltersChange({ ...filters, homeOnly: !filters.homeOnly })}
                    className={cn(
                        'h-9 gap-2',
                        filters.homeOnly && 'border-primary bg-primary/10 text-primary'
                    )}
                >
                    <Home className="h-4 w-4" />
                    <span className="hidden sm:inline">Para Casa</span>
                </Button>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="h-9 gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <RotateCcw className="h-4 w-4" />
                        <span className="hidden sm:inline">Limpar</span>
                    </Button>
                )}
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground mr-1">Filtros rápidos:</span>
                {FILTER_PRESETS.map((preset) => (
                    <Button
                        key={preset.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                        {preset.label}
                    </Button>
                ))}
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
                <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <span>
                            <strong className="text-foreground">{filteredCount}</strong> de {totalCount} exercícios
                        </span>
                        {activeFiltersCount > 0 && (
                            <Badge variant="secondary" className="ml-2">
                                {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''}
                            </Badge>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
