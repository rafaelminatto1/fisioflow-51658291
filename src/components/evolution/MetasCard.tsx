/**
 * MetasCard - Card de Metas do Paciente (Versão Compacta)
 *
 * Exibe metas do paciente de forma compacta com:
 * - Título, countdown e progresso
 * - Ações rápidas de concluir/editar
 */

import { useState, useMemo, memo, useEffect } from "react";
import { Target, Plus, CheckCircle2, Clock, Edit, Trophy, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { usePatientGoals, useCompleteGoal } from "@/hooks/usePatientEvolution";
import { MetaFormModal } from "./MetaFormModal";
import type { PatientGoal } from "@/types/evolution";
import { format, parseISO, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDetailedDuration } from "@/utils/dateUtils";

interface MetasCardProps {
	patientId: string | undefined;
	defaultCollapsed?: boolean;
}

// ... (countdown logic remains same)

export const MetasCard = memo(function MetasCard({
	patientId,
	defaultCollapsed = false,
}: MetasCardProps) {
	const { data: goals = [], isLoading } = usePatientGoals(patientId || "");
	const completeGoal = useCompleteGoal();

	const [modalOpen, setModalOpen] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
	const [editingGoal, setEditingGoal] = useState<PatientGoal | null>(null);

	// Separar metas ativas e concluídas
	const { activeGoals, completedGoals } = useMemo(() => {
		const active = goals.filter((g) => g.status === "em_andamento");
		const completed = goals.filter((g) => g.status === "concluido");
		return { activeGoals: active, completedGoals: completed };
	}, [goals]);

	// Colapsar automaticamente se não houver registros
	useEffect(() => {
		if (!isLoading && goals.length === 0) {
			setIsCollapsed(true);
		} else if (goals.length > 0) {
			setIsCollapsed(false);
		}
	}, [goals.length, isLoading]);

	const handleAdd = (e: React.MouseEvent) => {
		e.stopPropagation();
		setEditingGoal(null);
		setModalOpen(true);
	};

	const handleEdit = (goal: PatientGoal, e: React.MouseEvent) => {
		e.stopPropagation();
		setEditingGoal(goal);
		setModalOpen(true);
	};

	const handleComplete = (goalId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		completeGoal.mutate(goalId);
	};

	const handleCloseModal = (open: boolean) => {
		if (!open) setEditingGoal(null);
		setModalOpen(open);
	};

	if (!patientId) return null;

	return (
		<>
			<Card
				className={cn(
					"border-primary/10 bg-white shadow-sm transition-all duration-300 flex flex-col hover:border-primary/30",
					isCollapsed && "cursor-pointer hover:bg-slate-50/50"
				)}
				onClick={() => isCollapsed && setIsCollapsed(false)}
			>
				<CardHeader className={cn(
					"pb-2 pt-3 px-4 flex flex-row items-center justify-between flex-shrink-0 select-none",
					isCollapsed && "pb-3"
				)}>
					<div
						className="flex items-center gap-2 flex-1 cursor-pointer"
						onClick={(e) => {
							if (!isCollapsed) {
								e.stopPropagation();
								setIsCollapsed(true);
							}
						}}
					>
						<Target className={cn("h-5 w-5 transition-colors", goals.length > 0 ? "text-primary" : "text-slate-400")} />
						<CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
							Metas
							{goals.length > 0 && (
								<Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 h-5 px-1.5 font-bold">
									{activeGoals.length}/{goals.length}
								</Badge>
							)}
						</CardTitle>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleAdd}
						className="h-7 w-7 p-0 hover:bg-primary/5 text-slate-400 hover:text-primary transition-colors"
						title="Adicionar meta"
					>
						<Plus className="h-4 w-4" />
					</Button>
				</CardHeader>

				{!isCollapsed && (
					<CardContent className="px-4 pb-3 space-y-3 flex-1 min-h-0 overflow-auto animate-in fade-in slide-in-from-top-1 duration-200">
						{isLoading ? (
							<div className="flex items-center justify-center py-4">
								<RefreshCw className="h-4 w-4 text-primary/40 animate-spin" />
							</div>
						) : goals.length === 0 ? (
							<div className="text-center py-4 border-t border-slate-50 mt-1">
								<p className="text-xs text-slate-400 italic">Nenhuma meta definida</p>
							</div>
						) : (
							<>
								<div className="space-y-2.5">
									{activeGoals.slice(0, 3).map((goal) => {
										const countdown = formatCountdown(goal.target_date);
										const progress = goal.current_progress || 0;

										return (
											<div
												key={goal.id}
												className="group relative p-2.5 rounded-lg bg-slate-50/50 border border-slate-100 hover:border-primary/20 hover:bg-white transition-all shadow-sm"
											>
												<div className="flex items-center justify-between gap-2 mb-2">
													<h4 className="text-sm font-bold text-slate-700 truncate flex-1">
														{goal.goal_title}
													</h4>
													<span className="text-primary font-bold text-xs">
														{progress}%
													</span>
												</div>
												<div className="flex items-center gap-2">
													<Progress value={progress} className="h-1.5 flex-1 bg-slate-200" />
													<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
														<Button
															variant="ghost"
															size="icon"
															className="h-5 w-5 p-0 text-slate-400 hover:text-emerald-600"
															onClick={(e) => handleComplete(goal.id, e)}
															title="Concluir"
														>
															<CheckCircle2 className="h-3.5 w-3.5" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="h-5 w-5 p-0 text-slate-400 hover:text-primary"
															onClick={(e) => handleEdit(goal, e)}
															title="Editar"
														>
															<Edit className="h-3.5 w-3.5" />
														</Button>
													</div>
												</div>
												{goal.target_date && (
													<p className={cn(
														"text-[10px] mt-1.5 font-medium flex items-center gap-1",
														countdown.isUrgent ? "text-orange-600" : "text-slate-400"
													)}>
														<Clock className="h-2.5 w-2.5" />
														{countdown.text}
													</p>
												)}
											</div>
										);
									})}
								</div>

								{activeGoals.length > 3 && (
									<p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-wider">
										+{activeGoals.length - 3} outras metas
									</p>
								)}

								{completedGoals.length > 0 && (
									<div className="pt-2 border-t border-slate-100 flex items-center justify-between">
										<span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1.5">
											<Trophy className="h-3 w-3" />
											{completedGoals.length} Concluídas
										</span>
									</div>
								)}
							</>
						)}
					</CardContent>
				)}
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
