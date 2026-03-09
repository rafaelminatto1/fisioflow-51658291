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
    Play, BookOpen, Share2, Download, Edit, Trash2, ArrowLeft, TrendingUp, Zap
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
import { fisioLogger as logger } from '@/lib/errors/logger';

import { generateProtocolPdf } from '@/utils/generateProtocolPdf';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { clinicalTestsApi } from '@/lib/api/workers-client';
import { ApplyProtocolModal } from './ApplyProtocolModal';

interface ProtocolDetailViewProps {
    protocol: ExerciseProtocol;
    onBack: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

interface Milestone {
    week: number;
    description: string;
}

interface Restriction {
    week_start: number;
    week_end?: number;
    description: string;
}

interface LinkedClinicalTest {
    id: string;
    name: string;
    target_joint: string;
    category: string;
}

export function ProtocolDetailView({ protocol, onBack, onEdit, onDelete }: ProtocolDetailViewProps) {
    const details = PROTOCOL_DETAILS[protocol.condition_name];
    const [expandedPhases, setExpandedPhases] = useState<string[]>(['Fase 1']);
    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const { currentOrganization } = useOrganizations();

    const { data: linkedTests = [], isLoading: _isLoadingTests } = useQuery({
        queryKey: ['protocol-linked-tests', protocol.id, protocol.clinical_tests],
        queryFn: async () => {
            const testIds = protocol.clinical_tests || [];
            if (testIds.length === 0) return [];
            const res = await clinicalTestsApi.list({ ids: testIds });
            return ((res?.data ?? []) as LinkedClinicalTest[]).map((test) => ({
              id: test.id,
              name: test.name,
              target_joint: test.target_joint,
              category: test.category,
            }));
        },
        enabled: !!protocol.clinical_tests && protocol.clinical_tests.length > 0
    });

    const getMilestones = (): Milestone[] => {
        if (!protocol.milestones) return [];
        if (Array.isArray(protocol.milestones)) return protocol.milestones as Milestone[];
        return [];
    };

    const getRestrictions = (): Restriction[] => {
        if (!protocol.restrictions) return [];
        if (Array.isArray(protocol.restrictions)) return protocol.restrictions as Restriction[];
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
        try {
            generateProtocolPdf(protocol, currentOrganization);
            toast.success('PDF do protocolo gerado com sucesso!');
        } catch (error) {
            logger.error('Error generating PDF', error, 'ProtocolDetailView');
            toast.error('Erro ao gerar PDF do protocolo');
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copiado para a área de transferência!');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-20 pb-4 -mx-4 px-4 backdrop-blur-md bg-background/60 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-background/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className={cn('h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm', categoryInfo.color + '/20', 'border border-' + categoryInfo.color.split('-')[1] + '-500/20')}>
                        <categoryInfo.icon className={cn('h-7 w-7', categoryInfo.color.replace('bg-', 'text-'))} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold tracking-tight">{protocol.name}</h1>
                            <Badge
                                variant={protocol.protocol_type === 'pos_operatorio' ? 'default' : 'secondary'}
                                className="text-xs px-2 py-0.5"
                            >
                                {protocol.protocol_type === 'pos_operatorio' ? 'Pós-Operatório' : 'Patologia'}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground font-medium flex items-center gap-2">
                            {protocol.condition_name}
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                            <span className="flex items-center gap-1 text-xs">
                                <Clock className="h-3 w-3" />
                                {protocol.weeks_total} semanas
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                    <Button onClick={() => setApplyModalOpen(true)} className="gap-2 shadow-sm">
                        <Play className="h-4 w-4" />
                        <span className="hidden sm:inline">Aplicar a Paciente</span>
                        <span className="sm:hidden">Aplicar</span>
                    </Button>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={onEdit} className="rounded-full">
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar Protocolo</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={handleExportPDF} className="rounded-full">
                                    <Download className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Exportar PDF</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={onDelete} className="rounded-full text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* Description */}
            {details && (
                <div className="p-6 rounded-3xl backdrop-blur-xl bg-primary/5 border border-primary/10 shadow-sm overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <BookOpen className="h-24 w-24 text-primary" />
                    </div>
                    <div className="relative flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-semibold text-primary">Visão Geral do Protocolo</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">{details.description}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Semanas', value: protocol.weeks_total, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                    { label: 'Marcos', value: getMilestones().length, icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { label: 'Fases', value: details?.phases.length || 4, icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                    { label: 'Restrições', value: getRestrictions().length, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }
                ].map((stat, i) => (
                    <Card key={i} className={cn("p-5 flex flex-col items-center justify-center backdrop-blur-xl bg-background/40 border-border/40 shadow-sm transition-all hover:scale-[1.02]", stat.border)}>
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-3", stat.bg)}>
                            <stat.icon className={cn("h-5 w-5", stat.color)} />
                        </div>
                        <p className={cn("text-3xl font-bold tracking-tight", stat.color)}>{stat.value}</p>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    </Card>
                ))}
            </div>

            {/* Objectives */}
            {details && (
                <Card className="p-6 backdrop-blur-xl bg-background/40 border-border/40 overflow-hidden relative">
                    <div className="absolute -top-12 -right-12 h-40 w-40 bg-emerald-500/5 rounded-full blur-3xl" />
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Target className="h-4 w-4 text-emerald-500" />
                        </div>
                        Objetivos do Protocolo
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        {details.objectives.map((obj, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/10 transition-colors hover:bg-emerald-500/5">
                                <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                </div>
                                <span className="text-sm font-medium leading-tight">{obj}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Timeline Visual */}
            <Card className="p-8 backdrop-blur-xl bg-background/40 border-border/40 overflow-hidden relative">
                <div className="absolute -bottom-12 -left-12 h-40 w-40 bg-primary/5 rounded-full blur-3xl" />
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-primary" />
                        </div>
                        Progresso Estimado
                    </h3>
                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-red-500/40" />
                            <span>Início</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span>Alta</span>
                        </div>
                    </div>
                </div>

                <div className="relative py-10 px-4">
                    <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-muted/40 rounded-full -translate-y-1/2" />
                    <div className="absolute top-1/2 left-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-400 via-emerald-400 to-emerald-600 rounded-full -translate-y-1/2 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]" style={{ width: '100%' }} />

                    <div className="relative flex justify-between gap-4">
                        {getMilestones().slice(0, 7).map((milestone: Milestone, i: number) => (
                            <TooltipProvider key={i}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex flex-col items-center group cursor-help">
                                            <div className="relative h-4 w-4 rounded-full bg-background border-2 border-emerald-500 shadow-md transform group-hover:scale-150 transition-all duration-300 z-10" />
                                            <div className="mt-4 flex flex-col items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[10px] uppercase tracking-tighter font-bold text-muted-foreground">Wk</span>
                                                <span className="text-sm font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md min-w-[1.75rem] text-center">
                                                    {milestone.week}
                                                </span>
                                            </div>

                                            {/* Hover indicator line */}
                                            <div className="absolute top-1/2 h-16 w-px bg-primary/20 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs p-3 glass-card" sideOffset={15}>
                                        <div className="flex items-start gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                                                <Target className="h-4 w-4 text-emerald-600" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-bold text-sm">Meta Semana {milestone.week}</p>
                                                <p className="text-xs text-muted-foreground leading-relaxed">{milestone.description}</p>
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Phases */}
            {details && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                <Dumbbell className="h-4 w-4 text-indigo-500" />
                            </div>
                            Fases do Tratamento
                        </h3>
                        <Badge variant="outline" className="font-normal text-muted-foreground bg-background/40">
                            {details.phases.length} Fases
                        </Badge>
                    </div>

                    <div className="grid gap-3">
                        {details.phases.map((phase, i) => {
                            const phaseId = phase.name.split(' - ')[0];
                            const isExpanded = expandedPhases.includes(phaseId);

                            return (
                                <Collapsible
                                    key={i}
                                    open={isExpanded}
                                    onOpenChange={() => togglePhase(phaseId)}
                                    className="group"
                                >
                                    <CollapsibleTrigger asChild>
                                        <Card className={cn(
                                            'p-4 cursor-pointer transition-all duration-300 backdrop-blur-xl bg-background/40 hover:bg-background/60 border-border/40 overflow-hidden relative',
                                            isExpanded ? 'ring-1 ring-primary/30 shadow-lg translate-x-1' : 'hover:translate-x-1'
                                        )}>
                                            {/* Phase progress indicator */}
                                            <div className={cn(
                                                "absolute left-0 top-0 bottom-0 w-1.5 transition-all",
                                                i === 0 ? "bg-red-500" :
                                                    i === 1 ? "bg-amber-500" :
                                                        i === 2 ? "bg-blue-500" :
                                                            "bg-emerald-500"
                                            )} />

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-5">
                                                    <div className={cn(
                                                        'h-12 w-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm',
                                                        i === 0 ? 'bg-gradient-to-br from-red-500 to-rose-600' :
                                                            i === 1 ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                                                                i === 2 ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                                                                    'bg-gradient-to-br from-emerald-500 to-green-600'
                                                    )}>
                                                        {i + 1}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-lg leading-none mb-1.5">{phase.name}</h4>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                                            <Calendar className="h-3 w-3" />
                                                            {phase.weeks}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={cn(
                                                    "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                                                    isExpanded ? "bg-primary/10 text-primary rotate-180" : "bg-muted/40 text-muted-foreground"
                                                )}>
                                                    <ChevronDown className="h-5 w-5" />
                                                </div>
                                            </div>
                                        </Card>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="CollapsibleContent">
                                        <div className="mt-3 ml-2 md:ml-10 space-y-6 p-6 md:p-8 backdrop-blur-xl bg-primary/[0.02] rounded-3xl border border-primary/5 shadow-inner">
                                            {/* Phase Content Grid */}
                                            <div className="grid md:grid-cols-2 gap-8">
                                                {/* Left Column: Goals & Criteria */}
                                                <div className="space-y-6">
                                                    <div>
                                                        <h5 className="font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                                                            <Target className="h-3 w-3 text-primary" />
                                                            Objetivos da Fase
                                                        </h5>
                                                        <ul className="grid gap-2.5">
                                                            {phase.goals.map((goal, j) => (
                                                                <li key={j} className="flex items-center gap-3 p-3 rounded-xl bg-background/40 border border-border/40 text-sm font-medium">
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                                                    {goal}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div>
                                                        <h5 className="font-bold text-xs uppercase tracking-[0.2em] text-emerald-500 mb-4 flex items-center gap-2">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            Critérios para Próxima Fase
                                                        </h5>
                                                        <ul className="grid gap-2.5">
                                                            {phase.criteria.map((crit, j) => (
                                                                <li key={j} className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                                                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                                                                    {crit}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>

                                                {/* Right Column: Exercises & Precautions */}
                                                <div className="space-y-6">
                                                    <div>
                                                        <h5 className="font-bold text-xs uppercase tracking-[0.2em] text-indigo-500 mb-4 flex items-center gap-2">
                                                            <Dumbbell className="h-3 w-3" />
                                                            Intervenções Recomendadas
                                                        </h5>
                                                        <div className="flex flex-wrap gap-2">
                                                            {phase.exercises.map((ex, j) => (
                                                                <Badge key={j} variant="secondary" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/10 py-1.5 px-3 rounded-lg text-xs font-semibold">
                                                                    {ex}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <h5 className="font-bold text-xs uppercase tracking-[0.2em] text-amber-500 mb-4 flex items-center gap-2">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            Precauções & Alertas
                                                        </h5>
                                                        <ul className="grid gap-2.5">
                                                            {phase.precautions.map((prec, j) => (
                                                                <li key={j} className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-sm font-medium text-amber-800 dark:text-amber-300">
                                                                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                                                                    {prec}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Additional Info Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Milestones Section */}
                <Card className="p-6 backdrop-blur-xl bg-background/40 border-border/40">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        Marcos do Protocolo
                    </h3>
                    <div className="space-y-3">
                        {getMilestones().length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                <Target className="h-12 w-12 mb-2" />
                                <p className="text-sm">Nenhum marco definido</p>
                            </div>
                        ) : (
                            getMilestones().map((milestone: Milestone, i: number) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-colors group">
                                    <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md group-hover:scale-110 transition-transform">
                                        {milestone.week}
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-sm tracking-tight text-emerald-700 dark:text-emerald-400">Semana {milestone.week}</p>
                                        <p className="text-sm text-muted-foreground leading-snug">{milestone.description}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Associated Clinical Tests */}
                <Card className="p-6 backdrop-blur-xl bg-background/40 border-border/40">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                            <ClipboardCheck className="h-4 w-4 text-teal-500" />
                        </div>
                        Testes Clínicos
                    </h3>
                    <div className="space-y-3">
                        {linkedTests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 opacity-40 text-center">
                                <ClipboardCheck className="h-12 w-12 mb-2" />
                                <p className="text-sm">Nenhum teste vinculado</p>
                                <p className="text-[10px] uppercase tracking-wider mt-1">Vincule na Biblioteca de Testes</p>
                            </div>
                        ) : (
                            linkedTests.map((test: LinkedClinicalTest) => (
                                <div key={test.id} className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/10 flex items-center justify-between group hover:bg-teal-500/10 transition-colors">
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{test.name}</span>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[9px] h-4 bg-teal-500/5 text-teal-600 border-teal-500/20 px-1.5 uppercase tracking-tighter">
                                                {test.target_joint}
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground font-medium">• {test.category}</span>
                                        </div>
                                    </div>
                                    <div className="h-8 w-8 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-600 shadow-sm transition-transform group-hover:rotate-12">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* Restrictions */}
            <Card className="p-6 backdrop-blur-xl bg-background/40 border-border/40 border-amber-500/20 shadow-[0_0_40px_-15px_rgba(245,158,11,0.1)]">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </div>
                    Restrições e Alertas de Segurança
                </h3>
                {getRestrictions().length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-40">
                        <Shield className="h-12 w-12 mb-2" />
                        <p className="text-sm">Nenhuma restrição especial</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {getRestrictions().map((restriction: Restriction, i: number) => (
                            <div key={i} className="group relative p-5 rounded-3xl bg-amber-500/[0.03] hover:bg-amber-500/[0.06] border border-amber-500/10 transition-all duration-300">
                                <div className="absolute top-4 left-4 h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center shadow-inner">
                                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                                </div>
                                <div className="pl-8">
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600/60 font-mono">PÉRIODO</span>
                                        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-bold px-3">
                                            W{restriction.week_start}{restriction.week_end ? ` - W${restriction.week_end}` : '+'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm font-medium leading-relaxed">{restriction.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* References */}
            {protocol.references && protocol.references.length > 0 && (
                <Card className="p-6 backdrop-blur-xl bg-background/40 border-border/40 overflow-hidden relative">
                    <div className="absolute -top-12 -left-12 h-40 w-40 bg-blue-500/5 rounded-full blur-3xl" />
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-blue-500" />
                        </div>
                        Referências Científicas
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        {protocol.references.map((ref, i) => (
                            <div key={i} className="group flex flex-col justify-between p-5 rounded-3xl bg-blue-500/[0.02] hover:bg-blue-500/[0.05] border border-blue-500/10 transition-all duration-300">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Badge className="bg-blue-500 text-[10px] font-bold h-5 px-2">
                                            {ref.year}
                                        </Badge>
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground truncate max-w-[200px]">
                                            {ref.journal || 'STUDY'}
                                        </span>
                                    </div>
                                    {ref.url ? (
                                        <a
                                            href={ref.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-bold text-base leading-tight hover:text-blue-600 transition-colors flex items-start gap-2 group/link"
                                        >
                                            {ref.title}
                                            <Share2 className="h-4 w-4 shrink-0 mt-1 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                        </a>
                                    ) : (
                                        <p className="font-bold text-base leading-tight">{ref.title}</p>
                                    )}
                                </div>
                                <div className="mt-4 pt-4 border-t border-blue-500/5">
                                    <p className="text-xs font-semibold text-muted-foreground line-clamp-1 italic">
                                        {ref.authors}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Contraindications & Expected Outcomes */}
            {details && (
                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="p-6 backdrop-blur-xl bg-background/40 border-border/40 border-red-500/20 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                            <Shield className="h-20 w-20 text-red-500" />
                        </div>
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                                <Shield className="h-4 w-4 text-red-500" />
                            </div>
                            Contraindicações
                        </h3>
                        <div className="space-y-3">
                            {details.contraindications.map((item, i) => (
                                <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/[0.03] border border-red-500/10">
                                    <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <AlertTriangle className="h-3 v-3 text-red-500" />
                                    </div>
                                    <span className="text-sm font-medium text-red-700/80 dark:text-red-400/80">{item}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-6 backdrop-blur-xl bg-background/40 border-border/40 border-emerald-500/20 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                            <TrendingUp className="h-20 w-20 text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                            </div>
                            Resultados Esperados
                        </h3>
                        <div className="space-y-3">
                            {details.expectedOutcomes.map((item, i) => (
                                <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/10">
                                    <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                    </div>
                                    <span className="text-sm font-medium text-emerald-700/80 dark:text-emerald-300/80">{item}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            <ApplyProtocolModal
                protocol={protocol}
                open={applyModalOpen}
                onOpenChange={setApplyModalOpen}
            />
        </div>
    );
}
