import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isBefore, startOfToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	AlertTriangle,
	CheckCircle2,
	CircleDot,
	Plus,
	X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { tarefasApi } from "@/api/v2";
import {
	PRIORIDADE_LABELS,
	STATUS_LABELS,
	type Tarefa,
} from "@/types/tarefas";
import { toast } from "sonner";

interface PatientTasksPanelProps {
	patientId: string;
}

export function PatientTasksPanel({ patientId }: PatientTasksPanelProps) {
	const queryClient = useQueryClient();
	const [newTitle, setNewTitle] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: ["tarefas", "by-entity", "patient", patientId],
		queryFn: () => tarefasApi.getByEntity("patient", patientId),
		enabled: !!patientId,
	});

	const tasks = (data?.data ?? []) as unknown as Tarefa[];
	const today = startOfToday();

	const createTask = useMutation({
		mutationFn: (titulo: string) =>
			tarefasApi.create({
				titulo,
				status: "A_FAZER",
				prioridade: "MEDIA",
				tipo: "TAREFA",
				linked_entity_type: "patient",
				linked_entity_id: patientId,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["tarefas", "by-entity", "patient", patientId],
			});
			setNewTitle("");
			toast.success("Tarefa criada!");
		},
	});

	const updateTask = useMutation({
		mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
			tarefasApi.update(id, data),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: ["tarefas", "by-entity", "patient", patientId],
			}),
	});

	const handleCreate = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && newTitle.trim()) {
			e.preventDefault();
			createTask.mutate(newTitle.trim());
		}
	};

	const toggleDone = (task: Tarefa) => {
		const isDone = task.status === "CONCLUIDO";
		updateTask.mutate({
			id: task.id,
			status: isDone ? "A_FAZER" : "CONCLUIDO",
			...(isDone ? {} : { completed_at: new Date().toISOString() }),
		});
	};

	const openTasks = tasks.filter((t) => t.status !== "CONCLUIDO");
	const doneTasks = tasks.filter((t) => t.status === "CONCLUIDO");
	const overdueTasks = openTasks.filter(
		(t) =>
			t.data_vencimento &&
			isBefore(new Date(t.data_vencimento), today),
	);

	return (
		<div className="space-y-4">
			{/* Stats row */}
			{tasks.length > 0 && (
				<div className="grid grid-cols-3 gap-3">
					<div className="rounded-2xl border border-border/50 bg-background p-3">
						<div className="flex items-center gap-2 text-muted-foreground">
							<CircleDot className="h-4 w-4" />
							<span className="text-xs uppercase tracking-wide">Abertas</span>
						</div>
						<div className="mt-2 text-2xl font-semibold">{openTasks.length}</div>
					</div>
					<div className="rounded-2xl border border-border/50 bg-background p-3">
						<div className="flex items-center gap-2 text-muted-foreground">
							<CheckCircle2 className="h-4 w-4" />
							<span className="text-xs uppercase tracking-wide">Feitas</span>
						</div>
						<div className="mt-2 text-2xl font-semibold">{doneTasks.length}</div>
					</div>
					<div className="rounded-2xl border border-border/50 bg-background p-3">
						<div className="flex items-center gap-2 text-muted-foreground">
							<AlertTriangle className="h-4 w-4" />
							<span className="text-xs uppercase tracking-wide">Atrasadas</span>
						</div>
						<div className="mt-2 text-2xl font-semibold text-destructive">
							{overdueTasks.length}
						</div>
					</div>
				</div>
			)}

			{/* Quick add */}
			<div className="flex items-center gap-2">
				<Input
					placeholder="Nova tarefa para este paciente... (Enter para salvar)"
					value={newTitle}
					onChange={(e) => setNewTitle(e.target.value)}
					onKeyDown={handleCreate}
					className="rounded-xl"
					disabled={createTask.isPending}
				/>
				<Button
					type="button"
					size="icon"
					className="rounded-xl shrink-0"
					disabled={!newTitle.trim() || createTask.isPending}
					onClick={() => createTask.mutate(newTitle.trim())}
				>
					<Plus className="h-4 w-4" />
				</Button>
			</div>

			{/* Task list */}
			{isLoading && (
				<p className="text-sm text-muted-foreground">Carregando tarefas...</p>
			)}

			{!isLoading && tasks.length === 0 && (
				<div className="rounded-2xl border border-dashed border-border/70 bg-background p-8 text-center text-sm text-muted-foreground">
					Nenhuma tarefa vinculada a este paciente. Crie uma acima.
				</div>
			)}

			{openTasks.length > 0 && (
				<Card className="border-border/60 shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-semibold">Pendentes</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{openTasks.map((task) => {
							const overdue =
								task.data_vencimento &&
								isBefore(new Date(task.data_vencimento), today);
							return (
								<div
									key={task.id}
									className={cn(
										"flex items-start gap-3 rounded-xl border px-3 py-2.5",
										overdue
											? "border-destructive/30 bg-destructive/5"
											: "border-border/50 bg-background",
									)}
								>
									<button
										type="button"
										onClick={() => toggleDone(task)}
										className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
									>
										<CircleDot className="h-4 w-4" />
									</button>
									<div className="min-w-0 flex-1">
										<div className="text-sm font-medium truncate">{task.titulo}</div>
										<div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
											<span>{PRIORIDADE_LABELS[task.prioridade]}</span>
											{task.data_vencimento && (
												<span className={cn(overdue && "text-destructive font-medium")}>
													{format(new Date(task.data_vencimento), "dd MMM", { locale: ptBR })}
												</span>
											)}
										</div>
									</div>
									<Badge
										variant="secondary"
										className={cn("shrink-0 text-[10px] rounded-full", overdue && "bg-destructive/10 text-destructive")}
									>
										{STATUS_LABELS[task.status]}
									</Badge>
								</div>
							);
						})}
					</CardContent>
				</Card>
			)}

			{doneTasks.length > 0 && (
				<Card className="border-border/60 shadow-sm opacity-70">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-semibold text-muted-foreground">
							Concluídas ({doneTasks.length})
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1.5">
						{doneTasks.slice(0, 5).map((task) => (
							<div
								key={task.id}
								className="flex items-center gap-3 rounded-xl border border-border/30 bg-background px-3 py-2"
							>
								<button
									type="button"
									onClick={() => toggleDone(task)}
									className="shrink-0 text-emerald-500 hover:text-muted-foreground transition-colors"
								>
									<CheckCircle2 className="h-4 w-4" />
								</button>
								<span className="min-w-0 flex-1 truncate text-sm line-through text-muted-foreground">
									{task.titulo}
								</span>
							</div>
						))}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
