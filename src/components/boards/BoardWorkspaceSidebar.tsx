import { format, formatDistanceToNow, isAfter, isBefore, startOfToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	AlertTriangle,
	CalendarClock,
	CheckCircle2,
	CircleDot,
	Clock3,
	Columns3,
	LayoutGrid,
	List,
	type LucideIcon,
	Users2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Board, BoardColumn } from "@/types/boards";
import { PRIORIDADE_LABELS, STATUS_LABELS, type Tarefa } from "@/types/tarefas";
import type { BoardView } from "./BoardHeader";

interface BoardWorkspaceSidebarProps {
	board: Board;
	columns: BoardColumn[];
	tarefas: Tarefa[];
	teamMembers?: Array<{ id: string; full_name: string; avatar_url?: string }>;
	currentView: BoardView;
	onViewChange: (view: BoardView) => void;
	onViewTask: (tarefa: Tarefa) => void;
}

const VIEW_OPTIONS: Array<{
	value: BoardView;
	label: string;
	icon: LucideIcon;
	description: string;
}> = [
	{
		value: "kanban",
		label: "Board",
		icon: LayoutGrid,
		description: "Fluxo visual por coluna",
	},
	{
		value: "list",
		label: "Lista",
		icon: List,
		description: "Escaneie itens rapidamente",
	},
	{
		value: "calendar",
		label: "Calendário",
		icon: CalendarClock,
		description: "Prazos e datas-chave",
	},
];

function formatShortDate(date?: string) {
	if (!date) return null;
	return format(new Date(date), "dd MMM", { locale: ptBR });
}

export function BoardWorkspaceSidebar({
	board,
	columns,
	tarefas,
	teamMembers = [],
	currentView,
	onViewChange,
	onViewTask,
}: BoardWorkspaceSidebarProps) {
	const today = startOfToday();
	const doneTasks = tarefas.filter((task) => task.status === "CONCLUIDO");
	const overdueTasks = tarefas.filter((task) => {
		if (!task.data_vencimento || task.status === "CONCLUIDO") return false;
		return isBefore(new Date(task.data_vencimento), today);
	});
	const upcomingTasks = tarefas
		.filter((task) => {
			if (!task.data_vencimento || task.status === "CONCLUIDO") return false;
			return isAfter(new Date(task.data_vencimento), today);
		})
		.sort(
			(a, b) =>
				new Date(a.data_vencimento ?? 0).getTime() -
				new Date(b.data_vencimento ?? 0).getTime(),
		)
		.slice(0, 5);

	const completionRate = tarefas.length
		? Math.round((doneTasks.length / tarefas.length) * 100)
		: 0;

	const assigneeMap = new Map(
		teamMembers.map((member) => [member.id, member]),
	);

	const activeAssigneeIds = Array.from(
		new Set(
			tarefas.flatMap((task) => {
				const ids = task.responsavel_id ? [task.responsavel_id] : [];
				const assigneeIds = task.assignees?.map((person) => person.id) ?? [];
				return [...ids, ...assigneeIds];
			}),
		),
	).filter(Boolean);

	return (
		<ScrollArea className="h-full">
			<div className="space-y-4 pr-4">
				<Card className="border-border/60 bg-card/90 shadow-sm">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-semibold">Views</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{VIEW_OPTIONS.map((option) => {
							const Icon = option.icon;
							const isActive = currentView === option.value;
							return (
								<button
									key={option.value}
									type="button"
									onClick={() => onViewChange(option.value)}
									className={cn(
										"flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors",
										isActive
											? "border-primary/30 bg-primary/10 text-foreground"
											: "border-border/50 bg-background hover:border-primary/20 hover:bg-accent/50",
									)}
								>
									<div
										className={cn(
											"mt-0.5 rounded-xl p-2",
											isActive ? "bg-primary text-primary-foreground" : "bg-muted",
										)}
									>
										<Icon className="h-4 w-4" />
									</div>
									<div className="min-w-0">
										<div className="text-sm font-medium">{option.label}</div>
										<div className="text-xs text-muted-foreground">
											{option.description}
										</div>
									</div>
								</button>
							);
						})}
					</CardContent>
				</Card>

				<Card className="border-border/60 bg-card/90 shadow-sm">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-semibold">
							Visão geral
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-2 gap-3">
							<div className="rounded-2xl border border-border/50 bg-background p-3">
								<div className="flex items-center gap-2 text-muted-foreground">
									<CircleDot className="h-4 w-4" />
									<span className="text-xs uppercase tracking-wide">Tarefas</span>
								</div>
								<div className="mt-2 text-2xl font-semibold">{tarefas.length}</div>
							</div>
							<div className="rounded-2xl border border-border/50 bg-background p-3">
								<div className="flex items-center gap-2 text-muted-foreground">
									<Columns3 className="h-4 w-4" />
									<span className="text-xs uppercase tracking-wide">Colunas</span>
								</div>
								<div className="mt-2 text-2xl font-semibold">{columns.length}</div>
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
								<div className="mt-2 text-2xl font-semibold">{overdueTasks.length}</div>
							</div>
						</div>

						<div className="rounded-2xl border border-border/50 bg-background p-4">
							<div className="flex items-center justify-between text-sm">
								<span className="font-medium">Progresso</span>
								<span className="text-muted-foreground">{completionRate}%</span>
							</div>
							<Progress value={completionRate} className="mt-3 h-2.5" />
							<p className="mt-3 text-xs text-muted-foreground">
								{doneTasks.length} de {tarefas.length} tarefas concluídas.
							</p>
						</div>

						{board.description && (
							<p className="text-sm leading-6 text-muted-foreground">
								{board.description}
							</p>
						)}
					</CardContent>
				</Card>

				<Card className="border-border/60 bg-card/90 shadow-sm">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-semibold">Pipeline</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{columns.length === 0 && (
							<p className="text-sm text-muted-foreground">
								Crie colunas para estruturar o fluxo deste board.
							</p>
						)}
						{columns
							.slice()
							.sort((a, b) => a.order_index - b.order_index)
							.map((column) => {
								const count = tarefas.filter((task) => task.column_id === column.id).length;
								const overLimit =
									typeof column.wip_limit === "number" && count > column.wip_limit;
								return (
									<div
										key={column.id}
										className="rounded-2xl border border-border/50 bg-background p-3"
									>
										<div className="flex items-center justify-between gap-3">
											<div className="flex min-w-0 items-center gap-2">
												<span
													className="h-2.5 w-2.5 rounded-full"
													style={{ backgroundColor: column.color ?? "#94a3b8" }}
												/>
												<span className="truncate text-sm font-medium">
													{column.name}
												</span>
											</div>
											<Badge
												variant={overLimit ? "destructive" : "secondary"}
												className="rounded-full px-2.5"
											>
												{count}
												{column.wip_limit ? `/${column.wip_limit}` : ""}
											</Badge>
										</div>
									</div>
								);
							})}
					</CardContent>
				</Card>

				<Card className="border-border/60 bg-card/90 shadow-sm">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-semibold">Próximos prazos</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{upcomingTasks.length === 0 && (
							<p className="text-sm text-muted-foreground">
								Nenhum prazo próximo configurado.
							</p>
						)}
						{upcomingTasks.map((task) => (
							<button
								key={task.id}
								type="button"
								onClick={() => onViewTask(task)}
								className="w-full rounded-2xl border border-border/50 bg-background p-3 text-left transition-colors hover:border-primary/30 hover:bg-accent/40"
							>
								<div className="flex items-center justify-between gap-3">
									<span className="line-clamp-2 text-sm font-medium">
										{task.titulo}
									</span>
									<Badge variant="outline" className="shrink-0 rounded-full">
										{PRIORIDADE_LABELS[task.prioridade]}
									</Badge>
								</div>
								<div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
									<span>{STATUS_LABELS[task.status]}</span>
									<span>{formatShortDate(task.data_vencimento)}</span>
								</div>
							</button>
						))}
					</CardContent>
				</Card>

				<Card className="border-border/60 bg-card/90 shadow-sm">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-semibold">Pessoas ativas</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Users2 className="h-4 w-4" />
							<span>{activeAssigneeIds.length} pessoas com itens no board</span>
						</div>
						<Separator />
						<div className="space-y-3">
							{activeAssigneeIds.length === 0 && (
								<p className="text-sm text-muted-foreground">
									As tarefas ainda não têm responsáveis atribuídos.
								</p>
							)}
							{activeAssigneeIds.slice(0, 5).map((id) => {
								const member = assigneeMap.get(id);
								if (!member) return null;
								return (
									<div key={id} className="flex items-center gap-3">
										<Avatar className="h-9 w-9 border">
											<AvatarImage src={member.avatar_url} alt={member.full_name} />
											<AvatarFallback>
												{member.full_name
													.split(" ")
													.map((part) => part[0])
													.join("")
													.slice(0, 2)
													.toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div className="min-w-0">
											<div className="truncate text-sm font-medium">
												{member.full_name}
											</div>
											<div className="text-xs text-muted-foreground">
												Atualizado{" "}
												{formatDistanceToNow(new Date(board.updated_at), {
													addSuffix: true,
													locale: ptBR,
												})}
											</div>
										</div>
									</div>
								);
							})}
						</div>
						<div className="rounded-2xl border border-dashed border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
							<Clock3 className="mr-2 inline h-3.5 w-3.5" />
							Última atividade no board{" "}
							{formatDistanceToNow(new Date(board.updated_at), {
								addSuffix: true,
								locale: ptBR,
							})}
						</div>
					</CardContent>
				</Card>
			</div>
		</ScrollArea>
	);
}
