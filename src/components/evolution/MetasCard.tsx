/**
 * MetasCard - Card de Metas do Paciente
 * 
 * Exibe metas do paciente com:
 * - Título, descrição e categoria
 * - Contador regressivo para data alvo
 * - Barra de progresso
 * - Indicadores de prioridade
 * - CRUD completo
 */

import { useState, useMemo } from 'react';
import { Target, Plus, Calendar, CheckCircle2, Clock, Edit, Trash2, Flag, Trophy, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePatientGoals, useCompleteGoal, useUpdateGoalStatus } from '@/hooks/usePatientEvolution';
import { MetaFormModal } from './MetaFormModal';
import type { PatientGoal } from '@/types/evolution';
import { differenceInDays, differenceInWeeks, differenceInMonths, format, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MetasCardProps {
    patientId: string | undefined;
}

// Calcula o countdown formatado
function formatCountdown(targetDate: string | undefined): { text: string; isPast: boolean; isToday: boolean } {
    if (!targetDate) return { text: 'Sem prazo', isPast: false, isToday: false };

    const target = parseISO(targetDate);
    const now = new Date();

    if (isToday(target)) {
        return { text: 'Hoje', isPast: false, isToday: true };
    }

    if (isPast(target)) {
        const daysPast = Math.abs(differenceInDays(target, now));
        if (daysPast === 1) return { text: '1 dia atrás', isPast: true, isToday: false };
        if (daysPast < 7) return { text: `${daysPast} dias atrás`, isPast: true, isToday: false };
        if (daysPast < 30) return { text: `${Math.abs(differenceInWeeks(target, now))} semana(s) atrás`, isPast: true, isToday: false };
        return { text: `${Math.abs(differenceInMonths(target, now))} mês(es) atrás`, isPast: true, isToday: false };
    }

    const daysLeft = differenceInDays(target, now);
    if (daysLeft === 1) return { text: '1 dia', isPast: false, isToday: false };
    if (daysLeft < 7) return { text: `${daysLeft} dias`, isPast: false, isToday: false };
    if (daysLeft < 30) return { text: `${differenceInWeeks(target, now)} semana(s)`, isPast: false, isToday: false };
    return { text: `${differenceInMonths(target, now)} mês(es)`, isPast: false, isToday: false };
}

// Cores por prioridade
const priorityConfig: Record<string, { color: string; bgColor: string; label: string }> = {
    critica: { color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', label: 'Crítica' },
    alta: { color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30', label: 'Alta' },
    media: { color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Média' },
    baixa: { color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', label: 'Baixa' },
};

// Cores por status
const statusConfig: Record<string, { color: string; bgColor: string; label: string }> = {
    em_andamento: { color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', label: 'Em andamento' },
    concluido: { color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', label: 'Concluído' },
    cancelado: { color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800/30', label: 'Cancelado' },
};

export function MetasCard({ patientId }: MetasCardProps) {
    const { data: goals = [], isLoading } = usePatientGoals(patientId || '');
    const completeGoal = useCompleteGoal();
    const updateStatus = useUpdateGoalStatus();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<PatientGoal | null>(null);

    // Separar metas ativas e concluídas
    const { activeGoals, completedGoals } = useMemo(() => {
        const active = goals.filter(g => g.status === 'em_andamento');
        const completed = goals.filter(g => g.status === 'concluido');
        return { activeGoals: active, completedGoals: completed };
    }, [goals]);

    const handleAdd = () => {
        setEditingGoal(null);
        setModalOpen(true);
    };

    const handleEdit = (goal: PatientGoal) => {
        setEditingGoal(goal);
        setModalOpen(true);
    };

    const handleComplete = (goalId: string) => {
        completeGoal.mutate(goalId);
    };

    const handleCancel = (goalId: string) => {
        updateStatus.mutate({ goalId, status: 'cancelado' });
    };

    const handleCloseModal = (open: boolean) => {
        if (!open) {
            setEditingGoal(null);
        }
        setModalOpen(open);
    };

    if (isLoading) {
        return (
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-1.5 pt-3 px-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-primary animate-pulse" />
                        Metas
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                    <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                        Carregando metas...
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-1.5 pt-3 px-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        Metas
                        {goals.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                {activeGoals.length}/{goals.length}
                            </Badge>
                        )}
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={handleAdd} className="h-7 gap-0.5">
                        <Plus className="h-3 w-3" />
                        Adicionar
                    </Button>
                </CardHeader>

                <CardContent className="px-3 pb-3 space-y-2">
                    {goals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-4 text-center">
                            <Trophy className="h-8 w-8 text-muted-foreground/50 mb-2" />
                            <p className="text-sm text-muted-foreground">
                                Nenhuma meta definida
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                                Adicione metas para acompanhar o progresso do paciente
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Metas ativas */}
                            {activeGoals.map((goal) => {
                                const countdown = formatCountdown(goal.target_date);
                                const priority = priorityConfig[goal.priority] || priorityConfig.media;

                                return (
                                    <div
                                        key={goal.id}
                                        className="group relative p-2.5 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 hover:shadow-sm transition-all"
                                    >
                                        <div className="flex items-start gap-2">
                                            {/* Indicador de prioridade */}
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className={`mt-0.5 p-1 rounded ${priority.bgColor}`}>
                                                            <Flag className={`h-3 w-3 ${priority.color}`} />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left">
                                                        <p>Prioridade: {priority.label}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className="text-sm font-medium truncate">{goal.goal_title}</h4>

                                                    {/* Ações */}
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => handleComplete(goal.id)}
                                                            title="Marcar como concluída"
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => handleEdit(goal)}
                                                            title="Editar"
                                                        >
                                                            <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => handleCancel(goal.id)}
                                                            title="Cancelar"
                                                        >
                                                            <X className="h-3.5 w-3.5 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {goal.goal_description && (
                                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                        {goal.goal_description}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-3 mt-2">
                                                    {/* Countdown */}
                                                    {goal.target_date && (
                                                        <div className={`flex items-center gap-1 text-xs ${countdown.isPast ? 'text-red-500' :
                                                            countdown.isToday ? 'text-orange-500' :
                                                                'text-muted-foreground'
                                                            }`}>
                                                            <Clock className="h-3 w-3" />
                                                            <span>{countdown.text}</span>
                                                        </div>
                                                    )}

                                                    {/* Data alvo */}
                                                    {goal.target_date && (
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>{format(parseISO(goal.target_date), "dd MMM yy", { locale: ptBR })}</span>
                                                        </div>
                                                    )}

                                                    {/* Categoria */}
                                                    {goal.category && (
                                                        <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                                                            {goal.category}
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Barra de progresso */}
                                                {typeof goal.current_progress === 'number' && (
                                                    <div className="mt-2">
                                                        <div className="flex items-center justify-between text-xs mb-1">
                                                            <span className="text-muted-foreground">Progresso</span>
                                                            <span className="font-medium">{goal.current_progress}%</span>
                                                        </div>
                                                        <Progress value={goal.current_progress} className="h-1.5" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Metas concluídas (colapsadas) */}
                            {completedGoals.length > 0 && (
                                <div className="pt-2 border-t border-border/50">
                                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                        <Trophy className="h-3 w-3 text-yellow-500" />
                                        {completedGoals.length} meta(s) concluída(s)
                                    </p>
                                    <div className="space-y-1">
                                        {completedGoals.slice(0, 3).map((goal) => (
                                            <div
                                                key={goal.id}
                                                className="flex items-center gap-2 p-1.5 rounded bg-green-50 dark:bg-green-900/20 text-sm"
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                                <span className="truncate text-muted-foreground text-xs line-through">
                                                    {goal.goal_title}
                                                </span>
                                                {goal.completed_at && (
                                                    <span className="text-[10px] text-muted-foreground ml-auto">
                                                        {format(parseISO(goal.completed_at), "dd/MM", { locale: ptBR })}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                        {completedGoals.length > 3 && (
                                            <p className="text-[10px] text-muted-foreground text-center">
                                                +{completedGoals.length - 3} outras
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            <MetaFormModal
                open={modalOpen}
                onOpenChange={handleCloseModal}
                patientId={patientId}
                goal={editingGoal}
            />
        </>
    );
}
