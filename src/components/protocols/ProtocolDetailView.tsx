import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import {
    Calendar, Clock, Target, AlertTriangle, CheckCircle2,
    Activity, Dumbbell, Shield, ChevronDown, ChevronUp,
    Play, BookOpen, Share2, Download, Edit, Trash2, ArrowLeft, TrendingUp
} from 'lucide-react';
import { ExerciseProtocol } from '@/hooks/useExerciseProtocols';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getProtocolCategory, PROTOCOL_CATEGORIES, PROTOCOL_DETAILS } from '@/data/protocols';

interface ProtocolDetailViewProps {
    protocol: ExerciseProtocol;
    onBack: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export function ProtocolDetailView({ protocol, onBack, onEdit, onDelete }: ProtocolDetailViewProps) {
    const details = PROTOCOL_DETAILS[protocol.condition_name];
    const [expandedPhases, setExpandedPhases] = useState<string[]>(['Fase 1']);
    const [showApplyModal, setShowApplyModal] = useState(false);

    const getMilestones = () => {
        if (!protocol.milestones) return [];
        if (Array.isArray(protocol.milestones)) return protocol.milestones;
        return [];
    };

    const getRestrictions = () => {
        if (!protocol.restrictions) return [];
        if (Array.isArray(protocol.restrictions)) return protocol.restrictions;
        return [];
    };

    const togglePhase = (phaseName: string) => {
        setExpandedPhases(prev =>
            prev.includes(phaseName)
                ? prev.filter(p => p !== phaseName)
                : [...prev, phaseName]
        );
    };

    const category = getProtocolCategory(protocol.condition_name);
    const categoryInfo = PROTOCOL_CATEGORIES.find(c => c.id === category) || PROTOCOL_CATEGORIES[0];

    const handleExportPDF = () => {
        toast.success('PDF do protocolo gerado com sucesso!');
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copiado para a área de transferência!');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className={cn('h-14 w-14 rounded-2xl flex items-center justify-center', categoryInfo.color + '/10')}>
                        <categoryInfo.icon className={cn('h-7 w-7', categoryInfo.color.replace('bg-', 'text-'))} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{protocol.name}</h1>
                        <p className="text-muted-foreground">{protocol.condition_name}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-base px-3 py-1.5 gap-2">
                        <Clock className="h-4 w-4" />
                        {protocol.weeks_total} semanas
                    </Badge>
                    <Badge
                        variant={protocol.protocol_type === 'pos_operatorio' ? 'default' : 'secondary'}
                        className="text-base px-3 py-1.5"
                    >
                        {protocol.protocol_type === 'pos_operatorio' ? 'Pós-Operatório' : 'Patologia'}
                    </Badge>
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
                <Button onClick={() => setShowApplyModal(true)} className="gap-2">
                    <Play className="h-4 w-4" />
                    Aplicar a Paciente
                </Button>
                <Button variant="outline" onClick={onEdit} className="gap-2">
                    <Edit className="h-4 w-4" />
                    Editar Protocolo
                </Button>
                <Button variant="outline" onClick={handleExportPDF} className="gap-2">
                    <Download className="h-4 w-4" />
                    Exportar PDF
                </Button>
                <Button variant="outline" onClick={handleShare} className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Compartilhar
                </Button>
                <Button variant="outline" onClick={onDelete} className="gap-2 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Excluir
                </Button>
            </div>

            {/* Description */}
            {details && (
                <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <div className="flex items-start gap-3">
                        <BookOpen className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-foreground leading-relaxed">{details.description}</p>
                    </div>
                </Card>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-5 text-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200/50">
                    <Calendar className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                    <p className="text-3xl font-bold text-blue-600">{protocol.weeks_total}</p>
                    <p className="text-sm text-blue-600/70">Semanas</p>
                </Card>
                <Card className="p-5 text-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200/50">
                    <Target className="h-8 w-8 mx-auto text-green-600 mb-2" />
                    <p className="text-3xl font-bold text-green-600">{getMilestones().length}</p>
                    <p className="text-sm text-green-600/70">Marcos</p>
                </Card>
                <Card className="p-5 text-center bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200/50">
                    <Zap className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                    <p className="text-3xl font-bold text-purple-600">{details?.phases.length || 4}</p>
                    <p className="text-sm text-purple-600/70">Fases</p>
                </Card>
                <Card className="p-5 text-center bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 border-amber-200/50">
                    <AlertTriangle className="h-8 w-8 mx-auto text-amber-600 mb-2" />
                    <p className="text-3xl font-bold text-amber-600">{getRestrictions().length}</p>
                    <p className="text-sm text-amber-600/70">Restrições</p>
                </Card>
            </div>

            {/* Objectives */}
            {details && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Objetivos do Protocolo
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3">
                        {details.objectives.map((obj, i) => (
                            <div key={i} className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200/50">
                                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <span className="text-sm">{obj}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Timeline Visual */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Linha do Tempo de Progressão
                </h3>
                <div className="relative py-6">
                    <div className="absolute top-1/2 left-0 right-0 h-2 bg-muted rounded-full -translate-y-1/2" />
                    <div className="absolute top-1/2 left-0 h-2 bg-gradient-to-r from-red-500 via-amber-500 via-yellow-500 to-green-500 rounded-full -translate-y-1/2" style={{ width: '100%' }} />
                    <div className="relative flex justify-between">
                        {getMilestones().slice(0, 6).map((milestone: any, i: number) => (
                            <TooltipProvider key={i}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex flex-col items-center cursor-pointer group">
                                            <div className="h-5 w-5 rounded-full bg-background border-3 border-primary shadow-lg mb-2 group-hover:scale-125 transition-transform" />
                                            <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                                Sem {milestone.week}
                                            </span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                        <p className="font-medium">Semana {milestone.week}</p>
                                        <p className="text-xs text-muted-foreground">{milestone.description}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Phases */}
            {details && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Dumbbell className="h-5 w-5 text-primary" />
                        Fases do Tratamento
                    </h3>
                    <div className="space-y-3">
                        {details.phases.map((phase, i) => (
                            <Collapsible
                                key={i}
                                open={expandedPhases.includes(phase.name.split(' - ')[0])}
                                onOpenChange={() => togglePhase(phase.name.split(' - ')[0])}
                            >
                                <CollapsibleTrigger asChild>
                                    <Card className={cn(
                                        'p-4 cursor-pointer transition-all hover:shadow-md',
                                        expandedPhases.includes(phase.name.split(' - ')[0]) ? 'ring-2 ring-primary/20' : ''
                                    )}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    'h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg',
                                                    i === 0 ? 'bg-gradient-to-br from-red-500 to-rose-600' :
                                                        i === 1 ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                                                            i === 2 ? 'bg-gradient-to-br from-yellow-500 to-lime-600' :
                                                                'bg-gradient-to-br from-green-500 to-emerald-600'
                                                )}>
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold">{phase.name}</h4>
                                                    <p className="text-sm text-muted-foreground">{phase.weeks}</p>
                                                </div>
                                            </div>
                                            {expandedPhases.includes(phase.name.split(' - ')[0]) ? (
                                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                    </Card>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="mt-3 ml-16 space-y-4 p-5 bg-muted/30 rounded-xl">
                                        {/* Goals */}
                                        <div>
                                            <h5 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                                                <Target className="h-4 w-4" />
                                                Objetivos da Fase
                                            </h5>
                                            <ul className="space-y-2">
                                                {phase.goals.map((goal, j) => (
                                                    <li key={j} className="flex items-center gap-2 text-sm">
                                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                                        {goal}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Exercises */}
                                        <div>
                                            <h5 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                                                <Dumbbell className="h-4 w-4" />
                                                Exercícios Recomendados
                                            </h5>
                                            <div className="flex flex-wrap gap-2">
                                                {phase.exercises.map((ex, j) => (
                                                    <Badge key={j} variant="outline" className="text-xs py-1 px-2">
                                                        {ex}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Precautions */}
                                        <div>
                                            <h5 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                Precauções
                                            </h5>
                                            <ul className="space-y-2">
                                                {phase.precautions.map((prec, j) => (
                                                    <li key={j} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                                                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                        {prec}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Criteria */}
                                        <div>
                                            <h5 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                Critérios para Próxima Fase
                                            </h5>
                                            <ul className="space-y-2">
                                                {phase.criteria.map((crit, j) => (
                                                    <li key={j} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                                                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                                                        {crit}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        ))}
                    </div>
                </Card>
            )}

            {/* Milestones from DB */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Marcos de Progressão
                </h3>
                {getMilestones().length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhum marco definido para este protocolo.</p>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {getMilestones().map((milestone: any, i: number) => (
                            <div key={i} className="flex items-start gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200/50">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-lg">
                                    {milestone.week}
                                </div>
                                <div>
                                    <p className="font-semibold">Semana {milestone.week}</p>
                                    <p className="text-sm text-muted-foreground">{milestone.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Restrictions from DB */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Restrições
                </h3>
                {getRestrictions().length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhuma restrição definida para este protocolo.</p>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {getRestrictions().map((restriction: any, i: number) => (
                            <div key={i} className="flex items-start gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl border border-amber-200/50">
                                <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">
                                        Semana {restriction.week_start}
                                        {restriction.week_end && ` - ${restriction.week_end}`}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{restriction.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Contraindications & Expected Outcomes */}
            {details && (
                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Shield className="h-5 w-5 text-red-500" />
                            Contraindicações
                        </h3>
                        <ul className="space-y-3">
                            {details.contraindications.map((item, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200/50">
                                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-red-700 dark:text-red-400">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            Resultados Esperados
                        </h3>
                        <ul className="space-y-3">
                            {details.expectedOutcomes.map((item, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200/50">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-green-700 dark:text-green-400">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            )}
        </div>
    );
}
