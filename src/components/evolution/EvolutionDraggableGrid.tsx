import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DraggableGrid, GridItem } from '@/components/ui/DraggableGrid';
import { GridWidget } from '@/components/ui/GridWidget';
import { SmartTextarea } from '@/components/ui/SmartTextarea';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { User, Eye, Brain, ClipboardList, Sparkles, Copy, LayoutDashboard, Save, RotateCcw, Undo, Activity, TrendingDown, TrendingUp, Minus, ChevronUp, ChevronDown, ImageIcon, Dumbbell, House, History } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PainScaleWidget, PainScaleData, PainHistory, calculatePainTrend } from '@/components/evolution/PainScaleWidget';
import { MeasurementForm } from '@/components/evolution/MeasurementForm';
import { ExerciseBlockWidget } from '@/components/evolution/ExerciseBlockWidget';
import { HomeCareWidget } from '@/components/evolution/HomeCareWidget';
import { SessionExercise } from '@/components/evolution/SessionExercisesPanel';
import { SessionImageUpload } from '@/components/evolution/SessionImageUpload';

// ============================================================================================
// TYPES & INTERFACES
// ============================================================================================

export interface SOAPData {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
}

export interface PreviousEvolution {
    id: string;
    created_at?: string;
    record_date?: string;
    pain_level?: number;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
}

interface SOAPSection {
    key: keyof SOAPData;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    placeholder: string;
    color: string;
    bgColor: string;
    borderColor: string;
}

// ============================================================================================
// CONSTANTS
// ============================================================================================
const SOAP_SECTIONS: Readonly<SOAPSection[]> = [
    {
        key: 'subjective',
        label: 'Subjetivo',
        shortLabel: 'S',
        icon: User,
        placeholder: 'Queixa principal, relato do paciente, sintomas, dor, desconforto, sono, estresse...',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
    },
    {
        key: 'objective',
        label: 'Objetivo',
        shortLabel: 'O',
        icon: Eye,
        placeholder: 'Achados do exame físico, amplitude de movimento, força, testes especiais...',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
    },
    {
        key: 'assessment',
        label: 'Avaliação',
        shortLabel: 'A',
        icon: Brain,
        placeholder: 'Análise do progresso, resposta ao tratamento, correlações clínicas...',
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/30',
    },
    {
        key: 'plan',
        label: 'Plano',
        shortLabel: 'P',
        icon: ClipboardList,
        placeholder: 'Conduta, exercícios prescritos, orientações para casa, plano para próxima visita...',
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
    },
];

interface EvolutionDraggableGridProps {
    soapData: SOAPData;
    onSoapChange: (data: SOAPData) => void;
    painScaleData: PainScaleData;
    onPainScaleChange: (data: PainScaleData) => void;
    painHistory?: PainHistory[];
    showPainTrend?: boolean;
    onAISuggest?: (section: keyof SOAPData) => void;
    onCopyLast?: (section: keyof SOAPData) => void;
    disabled?: boolean;
    className?: string;
    // Props for MeasurementWidget
    patientId?: string;
    soapRecordId?: string;
    requiredMeasurements?: any[]; // Using any[] to avoid circular dependency or complex type import for now, can refine later
    // Exercises
    exercises?: SessionExercise[];
    onExercisesChange?: (exercises: SessionExercise[]) => void;
    onSuggestExercises?: () => void;
    // Home Care
    patientPhone?: string;
    // Previous Sessions
    previousEvolutions?: PreviousEvolution[];
    onCopyLastEvolution?: (evolution: PreviousEvolution) => void;
}

export const EvolutionDraggableGrid: React.FC<EvolutionDraggableGridProps> = ({
    soapData,
    onSoapChange,
    painScaleData,
    onPainScaleChange,
    painHistory,
    showPainTrend = true,
    onAISuggest,
    onCopyLast,
    disabled = false,
    className,
    patientId,
    soapRecordId,
    requiredMeasurements = [],
    exercises = [],
    onExercisesChange,
    onSuggestExercises,
    patientPhone,
    previousEvolutions = [],
    onCopyLastEvolution
}) => {
    const [isEditable, setIsEditable] = useState(false);
    const [savedLayout, setSavedLayout] = useState<any[]>([]);
    const [showPainDetails, setShowPainDetails] = useState(false);

    // Calculate Trend
    const trend = React.useMemo(() => {
        if (!painHistory) return null;
        return calculatePainTrend(painHistory, painScaleData.level);
    }, [painHistory, painScaleData.level]);

    // Load layout
    useEffect(() => {
        const saved = localStorage.getItem('evolution_layout_v1');
        if (saved) {
            try {
                setSavedLayout(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load evolution layout', e);
            }
        }
    }, []);

    const handleSaveLayout = (layout: any[]) => {
        localStorage.setItem('evolution_layout_v1', JSON.stringify(layout));
        setSavedLayout(layout);
        setIsEditable(false);
        toast.success('Layout da evolução salvo!');
    };

    const handleResetLayout = () => {
        localStorage.removeItem('evolution_layout_v1');
        setSavedLayout([]);
        window.location.reload();
    };

    const handleSoapFieldChange = React.useCallback((key: keyof SOAPData, value: string) => {
        onSoapChange({ ...soapData, [key]: value });
    }, [onSoapChange, soapData]);

    const handlePainScaleChange = React.useCallback((data: PainScaleData) => {
        onPainScaleChange(data);
    }, [onPainScaleChange]);

    const handleExercisesChange = React.useCallback((newExercises: SessionExercise[]) => {
        if (onExercisesChange) onExercisesChange(newExercises);
    }, [onExercisesChange]);

    const gridItems: GridItem[] = React.useMemo(() => [
        // ===== LINHA 1: Nível de Dor (30%) | Exercícios (70%) =====
        {
            id: 'pain-scale',
            content: (
                <GridWidget
                    title="Nível de Dor"
                    icon={<Activity className="h-4 w-4 text-rose-600" />}
                    isDraggable={isEditable}
                    className="h-full border-t-4 border-rose-500/30"
                    headerClassName="bg-rose-500/10"
                    extraHeaderContent={
                        <div className="flex items-center gap-2">
                            {showPainTrend && trend && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'text-xs cursor-help transition-colors',
                                                trend.direction === 'down' && 'border-green-500/50 bg-green-50 text-green-700 dark:bg-green-950/20',
                                                trend.direction === 'up' && 'border-red-500/50 bg-red-50 text-red-700 dark:bg-red-950/20'
                                            )}
                                            aria-label={`Tendência de dor: ${trend.label}`}
                                        >
                                            {trend.direction === 'down' ? <TrendingDown className="h-3.5 w-3.5 text-green-600" aria-hidden="true" /> :
                                                trend.direction === 'up' ? <TrendingUp className="h-3.5 w-3.5 text-red-600" aria-hidden="true" /> :
                                                    <Minus className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
                                            <span className="ml-1">{trend.label}</span>
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        <p className="text-xs">Comparado à última sessão</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPainDetails(!showPainDetails)}
                                className="h-7 px-2 hover:bg-muted/50"
                                aria-label={showPainDetails ? 'Recolher detalhes da dor' : 'Expandir detalhes da dor'}
                                aria-expanded={showPainDetails}
                            >
                                {showPainDetails ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                            </Button>
                        </div>
                    }
                >
                    <div className="p-3 h-full overflow-visible">
                        <PainScaleWidget
                            value={painScaleData}
                            onChange={handlePainScaleChange}
                            hideHeader={true}
                            showDetails={showPainDetails}
                            onToggleDetails={setShowPainDetails}
                            disabled={disabled}
                            className="border-0 shadow-none h-full bg-transparent"
                        />
                    </div>
                </GridWidget>
            ),
            defaultLayout: { w: 4, h: showPainDetails ? 16 : 5, x: 0, y: 0, minW: 3, minH: 4 } // 30% da largura (4 de 12)
        },
        // Exercícios da Sessão (70% da largura)
        {
            id: 'exercises-block',
            content: (
                <GridWidget
                    title="Exercícios da Sessão"
                    icon={<Dumbbell className="h-4 w-4 text-purple-600" />}
                    isDraggable={isEditable}
                    className="h-full border-t-4 border-purple-500/30"
                    headerClassName="bg-purple-500/10"
                >
                    <div className="h-full overflow-hidden">
                        <ExerciseBlockWidget
                            exercises={exercises}
                            onChange={handleExercisesChange}
                            onSuggest={onSuggestExercises}
                            disabled={disabled}
                        />
                    </div>
                </GridWidget>
            ),
            defaultLayout: { w: 8, h: 5, x: 4, y: 0, minW: 6, minH: 4 } // 70% da largura (8 de 12)
        },

        // ===== LINHA 2: Formulário SOAP (4 campos em 2x2) =====
        ...SOAP_SECTIONS.map((section, index) => ({
            id: section.key,
            content: (
                <GridWidget
                    title={section.label}
                    icon={<section.icon className={cn("h-4 w-4", section.color)} />}
                    isDraggable={isEditable}
                    className={cn("h-full border-t-4", section.borderColor)}
                    headerClassName={section.bgColor}
                    extraHeaderContent={
                        <div className="flex gap-1" role="group" aria-label={`Ações para ${section.key}`}>
                            {onAISuggest && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 hover:bg-muted/50"
                                            onClick={() => onAISuggest(section.key)}
                                            disabled={disabled}
                                            aria-label={`Sugerir com IA para ${section.key}`}
                                        >
                                            <Sparkles className="h-3 w-3 text-purple-500" aria-hidden="true" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        <p className="text-xs">Sugestão de IA</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            {onCopyLast && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 hover:bg-muted/50"
                                            onClick={() => onCopyLast(section.key)}
                                            disabled={disabled}
                                            aria-label={`Copiar última sessão para ${section.key}`}
                                        >
                                            <Copy className="h-3 w-3" aria-hidden="true" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        <p className="text-xs">Copiar da última sessão</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    }
                >
                    <div className="h-full flex flex-col p-0">
                        <SmartTextarea
                            value={soapData[section.key]}
                            onChange={(e) => handleSoapFieldChange(section.key, e.target.value)}
                            placeholder={section.placeholder}
                            disabled={disabled}
                            className="flex-1 resize-none border-0 focus-visible:ring-0 p-5 min-h-[140px] text-sm leading-relaxed"
                            containerClassName="flex-1 flex flex-col h-full"
                        />
                        <div className="px-5 py-2.5 bg-muted/30 border-t flex justify-between items-center text-xs text-muted-foreground shrink-0">
                            <span className="font-semibold">{soapData[section.key].split(/\s+/).filter(w => w.length > 0).length} palavras</span>
                            <span className="text-[10px] uppercase tracking-wide opacity-60 font-medium">{section.shortLabel}</span>
                        </div>
                    </div>
                </GridWidget>
            ),
            defaultLayout: { w: 6, h: 7, x: (index % 2) * 6, y: (showPainDetails ? 16 : 5) + Math.floor(index / 2) * 7, minW: 4, minH: 5 }
        })),

        // ===== LINHA 3: Registro de Medições | Home Care =====
        // Registro de Medições (esquerda)
        {
            id: 'measurements',
            content: (
                <GridWidget
                    title="Registro de Medições"
                    icon={<Activity className="h-4 w-4 text-teal-600" />}
                    isDraggable={isEditable}
                    className="h-full border-t-4 border-teal-500/30"
                    headerClassName="bg-teal-500/10"
                >
                    <div className="h-full overflow-auto p-0">
                        {patientId ? (
                            <div className="p-4">
                                <MeasurementForm
                                    patientId={patientId}
                                    soapRecordId={soapRecordId}
                                    requiredMeasurements={requiredMeasurements}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-5">
                                Carregando formulário...
                            </div>
                        )}
                    </div>
                </GridWidget>
            ),
            defaultLayout: { w: 6, h: 9, x: 0, y: (showPainDetails ? 30 : 19), minW: 6, minH: 6 }
        },
        // Home Care (direita)
        {
            id: 'home-care-block',
            content: (
                <GridWidget
                    title="Home Care"
                    icon={<House className="h-4 w-4 text-green-600" />}
                    isDraggable={isEditable}
                    className="h-full border-t-4 border-green-500/30"
                    headerClassName="bg-green-500/10"
                >
                    <div className="h-full overflow-hidden">
                        <HomeCareWidget
                            patientId={patientId || ''}
                            patientPhone={patientPhone}
                            disabled={disabled}
                        />
                    </div>
                </GridWidget>
            ),
            defaultLayout: { w: 6, h: 9, x: 6, y: (showPainDetails ? 30 : 19), minW: 6, minH: 6 }
        },

        // ===== LINHA 4: Sessões Anteriores | Anexos =====
        // Sessões Anteriores (esquerda)
        {
            id: 'previous-sessions',
            content: (
                <GridWidget
                    title="Sessões Anteriores"
                    icon={<History className="h-4 w-4 text-amber-600" />}
                    isDraggable={isEditable}
                    className="h-full border-t-4 border-amber-500/30"
                    headerClassName="bg-amber-500/10"
                    extraHeaderContent={
                        previousEvolutions.length > 0 && onCopyLastEvolution ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="default"
                                        size="sm"
                                        className="h-8 px-3 text-xs font-medium"
                                        onClick={() => {
                                            const lastEvolution = previousEvolutions[0];
                                            if (lastEvolution) {
                                                onCopyLastEvolution(lastEvolution);
                                            }
                                        }}
                                        disabled={disabled}
                                    >
                                        <Copy className="h-3 w-3 mr-1.5" aria-hidden="true" />
                                        Replicar Última
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <p className="text-xs">Copiar toda a última sessão para os campos atuais</p>
                                </TooltipContent>
                            </Tooltip>
                        ) : null
                    }
                >
                    <div className="h-full overflow-auto p-4">
                        {previousEvolutions.length > 0 ? (
                            <div className="space-y-3">
                                {previousEvolutions.slice(0, 5).map((evolution, index: number) => {
                                    const sessionNumber = previousEvolutions.length - index;
                                    const date = new Date(evolution.created_at || evolution.record_date);
                                    return (
                                        <div
                                            key={evolution.id}
                                            role="button"
                                            tabIndex={0}
                                            className="group border rounded-lg p-3.5 hover:bg-muted/50 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            onClick={() => onCopyLastEvolution && onCopyLastEvolution(evolution)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    onCopyLastEvolution && onCopyLastEvolution(evolution);
                                                }
                                            }}
                                            aria-label={`Sessão ${sessionNumber} de ${date.toLocaleDateString('pt-BR')}. Clique para copiar.`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold"
                                                        aria-hidden="true"
                                                    >
                                                        {sessionNumber}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold">
                                                            {date.toLocaleDateString('pt-BR')}
                                                        </p>
                                                        {evolution.pain_level !== undefined && (
                                                            <p className="text-[10px] text-muted-foreground">
                                                                Dor: {evolution.pain_level}/10
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                                            </div>
                                            {(evolution.subjective || evolution.objective) && (
                                                <div className="text-xs text-muted-foreground line-clamp-2" aria-hidden="true">
                                                    {evolution.subjective?.substring(0, 80) || evolution.objective?.substring(0, 80)}
                                                    {(evolution.subjective?.length > 80 || evolution.objective?.length > 80) && '...'}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {previousEvolutions.length > 5 && (
                                    <div className="text-center text-xs text-muted-foreground pt-2 font-medium">
                                        + {previousEvolutions.length - 5} sessões anteriores
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                                <History className="h-10 w-10 opacity-40" aria-hidden="true" />
                                <p className="text-sm font-medium">Nenhuma sessão anterior</p>
                                <p className="text-xs">As sessões registradas aparecerão aqui</p>
                            </div>
                        )}
                    </div>
                </GridWidget>
            ),
            defaultLayout: { w: 6, h: 10, x: 0, y: (showPainDetails ? 39 : 28), minW: 6, minH: 6 }
        },
        // Anexos (direita)
        {
            id: 'photos',
            content: (
                <GridWidget
                    title="Anexos"
                    icon={<ImageIcon className="h-4 w-4 text-indigo-600" />}
                    isDraggable={isEditable}
                    className="h-full border-t-4 border-indigo-500/30"
                    headerClassName="bg-indigo-500/10"
                >
                    <div className="h-full overflow-auto p-0">
                        {patientId ? (
                            <div className="p-4">
                                <SessionImageUpload
                                    patientId={patientId}
                                    soapRecordId={soapRecordId}
                                    maxFiles={5}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-5">
                                Carregando galeria...
                            </div>
                        )}
                    </div>
                </GridWidget>
            ),
            defaultLayout: { w: 6, h: 10, x: 6, y: (showPainDetails ? 39 : 28), minW: 6, minH: 6 }
        },
    ], [
        isEditable,
        showPainTrend,
        trend,
        showPainDetails,
        painScaleData,
        onPainScaleChange,
        disabled,
        patientId,
        soapRecordId,
        requiredMeasurements,
        exercises,
        onExercisesChange,
        onSuggestExercises,
        onAISuggest,
        onCopyLast,
        soapData,
        handleSoapFieldChange,
        patientPhone,
        previousEvolutions,
        onCopyLastEvolution
    ]);

    return (
        <TooltipProvider>
            <div className={cn("space-y-5", className)}>
                {/* Header de Controle do Layout */}
                <div className="flex justify-between items-center bg-muted/40 px-5 py-3.5 rounded-xl border">
                <div className="flex items-center gap-2.5">
                    <LayoutDashboard className="h-4.5 w-4.5 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Layout da Evolução</span>
                </div>
                <div className="flex gap-2">
                    {isEditable ? (
                        <>
                            <Button variant="ghost" size="sm" onClick={() => setIsEditable(false)} className="h-8.5 px-3">Cancelar</Button>
                            <Button size="sm" onClick={() => handleSaveLayout(savedLayout)} className="h-8.5 px-3.5 gap-2">
                                <Save className="h-3.5 w-3.5" /> Salvar
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleResetLayout} title="Resetar" className="h-8.5 w-8.5">
                                <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" size="sm" onClick={handleResetLayout} className="h-8.5 px-3 gap-2">
                                <Undo className="h-3.5 w-3.5" /> Redefinir
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setIsEditable(true)} className="h-8.5 px-3 gap-2">
                                <LayoutDashboard className="h-3.5 w-3.5" /> Personalizar
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <DraggableGrid
                items={gridItems}
                onLayoutChange={(layout) => {
                    if (isEditable) setSavedLayout(layout);
                }}
                savedLayout={savedLayout}
                isEditable={isEditable}
                rowHeight={50}
            />
        </div>
        </TooltipProvider>
    );
};
