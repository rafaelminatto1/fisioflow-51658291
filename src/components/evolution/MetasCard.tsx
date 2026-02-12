/**
 * MetasCard - Card de Metas do Paciente (Versão Compacta)
 *
 * Exibe metas do paciente de forma compacta com:
 * - Título, countdown e progresso
 * - Ações rápidas de concluir/editar
 */

import { useState, useMemo, memo } from 'react';
import { Target, Plus, CheckCircle2, Clock, Edit, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { usePatientGoals, useCompleteGoal } from '@/hooks/usePatientEvolution';
import { MetaFormModal } from './MetaFormModal';
import type { PatientGoal } from '@/types/evolution';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDetailedDuration } from '@/utils/dateUtils';

interface MetasCardProps {
    patientId: string | undefined;
}

// Calcula o countdown formatado de forma compacta
function formatCountdown(targetDate: string | undefined): { text: string; isUrgent: boolean } {
    if (!targetDate) return { text: '-', isUrgent: false };
    const date = parseISO(targetDate);
    return {
        text: formatDetailedDuration(targetDate),
        isUrgent: isPast(date) || isToday(date)
    };
}

export const MetasCard = memo(function MetasCard({ patientId }: MetasCardProps) {
    const { data: goals = [], isLoading } = usePatientGoals(patientId || '');
    const completeGoal = useCompleteGoal();

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

    const handleCloseModal = (open: boolean) => {
        if (!open) setEditingGoal(null);
        setModalOpen(open);
    };

    if (isLoading) {
        return (
            <Card className="border-primary/20 bg-primary/5 shadow-sm h-full">
                <CardHeader className="pb-1.5 pt-2.5 px-3 flex-shrink-0">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <Target className="h-4 w-4 text-primary animate-pulse" />
                        Metas
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-2.5 flex-1">
                    <div className="flex items-center justify-center h-full">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="border-primary/20 bg-primary/5 shadow-sm flex flex-col">
                <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between flex-shrink-0">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                        <Target className="h-5 w-5 text-primary" />
                        Metas
                        {goals.length > 0 && (
                            <span className="ml-1 h-5 px-2 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                                {activeGoals.length}/{goals.length}
                            </span>
                        )}
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleAdd}
                        className="h-8 w-8 p-0 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title="Adicionar meta"
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </CardHeader>

                <CardContent className="px-4 pb-3 space-y-3 flex-1 min-h-0 overflow-auto">
                    {goals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-6">
                            <Trophy className="h-10 w-10 text-muted-foreground/30 mb-2" />
                            <p className="text-sm text-muted-foreground">
                                Nenhuma meta definida
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Metas ativas - versão ultra compacta */}
                            {activeGoals.slice(0, 3).map((goal) => {
                                const countdown = formatCountdown(goal.target_date);
                                const progress = goal.current_progress || 0;

                                return (
                                    <div
                                        key={goal.id}
                                        className="group relative px-3 py-2.5 rounded-lg bg-card/60 border border-transparent hover:border-primary/10 hover:bg-card/80 transition-all shadow-sm"
                                    >
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-base font-medium text-foreground leading-tight truncate">{goal.goal_title}</h4>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                {goal.target_date && (
                                                    <span className={`flex items-center gap-1.5 font-medium ${countdown.isUrgent ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {countdown.text}
                                                    </span>
                                                )}
                                                <span className="text-primary font-bold">{progress}%</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Progress value={progress} className="h-2 flex-1 shadow-inner" />
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-green-600"
                                                    onClick={() => handleComplete(goal.id)}
                                                    title="Concluir"
                                                >
                                                    <CheckCircle2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                                                    onClick={() => handleEdit(goal)}
                                                    title="Editar"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {activeGoals.length > 3 && (
                                <p className="text-xs text-muted-foreground text-center py-1 font-medium">
                                    +{activeGoals.length - 3} outras metas ativas
                                </p>
                            )}

                            {/* Metas concluídas - indicador compacto */}
                            {completedGoals.length > 0 && (
                                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                                    <span className="text-sm text-green-700 dark:text-green-400 font-semibold flex items-center gap-2">
                                        <Trophy className="h-4 w-4" />
                                        {completedGoals.length} concluída(s)
                                    </span>
                                    {completedGoals.length > 0 && completedGoals[0]?.completed_at && (
                                        <span className="text-xs text-muted-foreground font-medium">
                                            Última em {format(parseISO(completedGoals[0].completed_at!), "dd/MM/yy", { locale: ptBR })}
                                        </span>
                                    )}
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
});
