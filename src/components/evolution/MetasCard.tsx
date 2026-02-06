/**
 * MetasCard - Card de Metas do Paciente (Versão Compacta)
 *
 * Exibe metas do paciente de forma compacta com:
 * - Título, countdown e progresso
 * - Ações rápidas de concluir/editar
 */

import { useState, useMemo } from 'react';
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

export function MetasCard({ patientId }: MetasCardProps) {
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
                    <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                        <Target className="h-3 w-3 text-primary animate-pulse" />
                        Metas
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-2.5 flex-1">
                    <div className="flex items-center justify-center h-full">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="border-primary/20 bg-primary/5 shadow-sm flex flex-col">
                <CardHeader className="pb-1.5 pt-2.5 px-3 flex flex-row items-center justify-between flex-shrink-0">
                    <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                        <Target className="h-3 w-3 text-primary" />
                        Metas
                        {goals.length > 0 && (
                            <span className="ml-1 h-4 px-1 rounded-full bg-primary/10 text-primary text-[9px] flex items-center justify-center">
                                {activeGoals.length}/{goals.length}
                            </span>
                        )}
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleAdd}
                        className="h-6 w-6 p-0 hover:bg-primary/10"
                        title="Adicionar meta"
                    >
                        <Plus className="h-2.5 w-2.5" />
                    </Button>
                </CardHeader>

                <CardContent className="px-3 pb-2.5 space-y-1.5 flex-1 min-h-0 overflow-auto">
                    {goals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <Trophy className="h-6 w-6 text-muted-foreground/30 mb-1" />
                            <p className="text-[10px] text-muted-foreground">
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
                                        className="group relative px-2 py-1.5 rounded-lg bg-card/40 hover:bg-card/60 transition-all"
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-[10px] font-medium truncate">{goal.goal_title}</h4>
                                            </div>
                                            <div className="flex items-center gap-1 text-[9px]">
                                                {goal.target_date && (
                                                    <span className={`flex items-center gap-0.5 ${countdown.isUrgent ? 'text-orange-500' : 'text-muted-foreground'}`}>
                                                        <Clock className="h-2 w-2" />
                                                        {countdown.text}
                                                    </span>
                                                )}
                                                <span className="text-primary font-medium">{progress}%</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Progress value={progress} className="h-1 flex-1" />
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 p-0"
                                                    onClick={() => handleComplete(goal.id)}
                                                    title="Concluir"
                                                >
                                                    <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 p-0"
                                                    onClick={() => handleEdit(goal)}
                                                    title="Editar"
                                                >
                                                    <Edit className="h-2.5 w-2.5 text-muted-foreground" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {activeGoals.length > 3 && (
                                <p className="text-[9px] text-muted-foreground text-center py-1">
                                    +{activeGoals.length - 3} outras metas
                                </p>
                            )}

                            {/* Metas concluídas - indicador compacto */}
                            {completedGoals.length > 0 && (
                                <div className="pt-1 border-t border-border/50 flex items-center justify-between">
                                    <span className="text-[9px] text-green-600 flex items-center gap-1">
                                        <Trophy className="h-2.5 w-2.5" />
                                        {completedGoals.length} concluída(s)
                                    </span>
                                    {completedGoals.length > 0 && completedGoals[0]?.completed_at && (
                                        <span className="text-[9px] text-muted-foreground">
                                            {format(parseISO(completedGoals[0].completed_at!), "dd/MM/yy", { locale: ptBR })}
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
}
