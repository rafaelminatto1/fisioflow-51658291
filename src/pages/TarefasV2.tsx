import { useState, useMemo, Suspense, lazy } from "react";
import {
	LayoutGrid,
	LayoutList,
	BarChart3,
	GanttChart,
	ClipboardList,
	Plus,
	RefreshCw,
	Search,
	ChevronDown,
	ChevronRight,
	CheckCircle2,
	Clock,
	AlertCircle,
	TrendingUp,
	Target,
	Zap,
	Tag,
	Calendar,
	ShieldAlert,
	Filter,
	Users,
} from "lucide-react";
import {
	startOfWeek,
	endOfWeek,
	eachDayOfInterval,
	isWithinInterval,
	differenceInDays,
	subDays,
	startOfMonth,
	endOfMonth,
	isValid,
} from "date-fns";

// safeFormat imported from @/lib/utils
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuCheckboxItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { KanbanBoardV2 } from "@/components/tarefas/v2";
import {
	LazyTaskDetailModal,
	LazyTaskQuickCreateModal,
} from "@/components/tarefas/v2/LazyComponents";
import { TaskTableVirtualized } from "@/components/tarefas/virtualized/TaskTableVirtualized";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
	Tarefa,
	TarefaStatus,
	TarefaPrioridade,
	TarefaTipo,
	STATUS_LABELS,
	STATUS_COLORS,
	TaskStats,
	PRIORIDADE_LABELS,
	TIPO_LABELS,
} from "@/types/tarefas";
import { useTarefas, useDeleteTarefa } from "@/hooks/useTarefas";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/contexts/AuthContext";
import { safeFormat } from "@/lib/utils";
import { accentIncludes } from "@/lib/utils/bilingualSearch";
// Recharts imports removed - moved to TaskInsights

const TaskInsights = lazy(() => import("@/components/tarefas/v2/TaskInsights"));

type ViewMode = "kanban" | "table" | "timeline" | "insights";

export default function TarefasV2() {
	const { data: tarefas, isLoading, refetch } = useTarefas();
	const { data: teamMembers } = useTeamMembers();
	const deleteTarefa = useDeleteTarefa();
	const effectiveTarefas = tarefas ?? [];

	const [viewMode, setViewMode] = useState<ViewMode>("kanban");
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null);
	const [detailModalOpen, setDetailModalOpen] = useState(false);
	const [quickCreateOpen, setQuickCreateOpen] = useState(false);
	const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
	const [filterPendingAck, setFilterPendingAck] = useState(false);
	const [filterPriority, setFilterPriority] = useState<TarefaPrioridade[]>([]);
	const [filterType, setFilterType] = useState<TarefaTipo[]>([]);
	const [filterAssignee, setFilterAssignee] = useState<string[]>([]);
	const { user } = useAuth();
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
		new Set(["A_FAZER", "EM_PROGRESSO", "REVISAO"]),
	);
	const [timelineRange, setTimelineRange] = useState<"week" | "month">("week");
	const [isRefetching, setIsRefetching] = useState(false);

	// Calculate stats
	const stats = useMemo((): TaskStats | null => {
		if (!effectiveTarefas) return null;

		const today = new Date();
		const weekAgo = subDays(today, 7);

		const byStatus = effectiveTarefas.reduce(
			(acc, t) => {
				if (t && t.status) {
					acc[t.status] = (acc[t.status] || 0) + 1;
				}
				return acc;
			},
			{} as Record<TarefaStatus, number>,
		);

		const byPriority = effectiveTarefas.reduce(
			(acc, t) => {
				if (t && t.prioridade) {
					acc[t.prioridade] = (acc[t.prioridade] || 0) + 1;
				}
				return acc;
			},
			{} as Record<TarefaPrioridade, number>,
		);

		const byType = effectiveTarefas.reduce(
			(acc, t) => {
				if (t) {
					const tipo = t.tipo || "TAREFA";
					acc[tipo] = (acc[tipo] || 0) + 1;
				}
				return acc;
			},
			{} as Record<string, number>,
		);

		const overdue = effectiveTarefas.filter(
			(t) =>
				t.data_vencimento &&
				new Date(t.data_vencimento) < today &&
				t.status !== "CONCLUIDO" &&
				t.status !== "ARQUIVADO",
		).length;

		const dueSoon = effectiveTarefas.filter((t) => {
			if (
				!t.data_vencimento ||
				t.status === "CONCLUIDO" ||
				t.status === "ARQUIVADO"
			)
				return false;
			const dueDate = new Date(t.data_vencimento);
			const daysUntil = differenceInDays(dueDate, today);
			return daysUntil >= 0 && daysUntil <= 3;
		}).length;

		const completedThisWeek = effectiveTarefas.filter(
			(t) => t.completed_at && new Date(t.completed_at) >= weekAgo,
		).length;

		const completedTotal = byStatus["CONCLUIDO"] || 0;
		const completionRate =
			effectiveTarefas.length > 0
				? (completedTotal / effectiveTarefas.length) * 100
				: 0;

		// Average cycle time (days from creation to completion)
		const completedTasks = effectiveTarefas.filter(
			(t) => t.completed_at && t.created_at,
		);
		const avgCycleTime =
			completedTasks.length > 0
				? completedTasks.reduce((acc, t) => {
						return (
							acc +
							differenceInDays(
								new Date(t.completed_at!),
								new Date(t.created_at),
							)
						);
					}, 0) / completedTasks.length
				: 0;

		const pendingAcknowledgments = effectiveTarefas.filter(
			(t) =>
				t.requires_acknowledgment &&
				(!user ||
					!t.acknowledgments?.some(
						(a) => a.user_id === user.uid && a.acknowledged_at,
					)),
		).length;

		return {
			total: effectiveTarefas.length,
			by_status: byStatus,
			by_priority: byPriority,
			by_type: byType,
			overdue,
			due_soon: dueSoon,
			completed_this_week: completedThisWeek,
			completion_rate: completionRate,
			average_cycle_time: avgCycleTime,
			pending_acknowledgments: pendingAcknowledgments,
		};
	}, [effectiveTarefas, user]);

	// Filtered tasks
	const filteredTarefas = useMemo(() => {
		if (!effectiveTarefas) return [];

		let result = effectiveTarefas;

		// Filter by search term
		if (searchTerm) {
			result = result.filter(
				(t) =>
					accentIncludes(t.titulo, searchTerm) ||
					(t.descricao && accentIncludes(t.descricao, searchTerm)) ||
					(t.tags && t.tags.some((tag) => accentIncludes(tag, searchTerm))),
			);
		}

		// Filter by pending acknowledgment (Super Premium Feature)
		if (filterPendingAck && user) {
			result = result.filter(
				(t) =>
					t.requires_acknowledgment &&
					!t.acknowledgments?.some(
						(a) => a.user_id === user.uid && a.acknowledged_at,
					),
			);
		}

		// Filter by Priority
		if (filterPriority.length > 0) {
			result = result.filter((t) => filterPriority.includes(t.prioridade));
		}

		// Filter by Type
		if (filterType.length > 0) {
			result = result.filter((t) => filterType.includes(t.tipo));
		}

		// Filter by Assignee
		if (filterAssignee.length > 0) {
			result = result.filter(
				(t) => t.responsavel_id && filterAssignee.includes(t.responsavel_id),
			);
		}

		return result;
	}, [
		effectiveTarefas,
		searchTerm,
		filterPendingAck,
		filterPriority,
		filterType,
		filterAssignee,
		user,
	]);

	// Group tasks by status for table view
	const groupedTasks = useMemo(() => {
		const groups: Record<TarefaStatus, Tarefa[]> = {
			BACKLOG: [],
			A_FAZER: [],
			EM_PROGRESSO: [],
			REVISAO: [],
			CONCLUIDO: [],
			ARQUIVADO: [],
		};

		filteredTarefas.forEach((t) => {
			if (t && t.status && groups[t.status]) {
				groups[t.status].push(t);
			}
		});

		return groups;
	}, [filteredTarefas]);

	// Timeline data
	const timelineData = useMemo(() => {
		const today = new Date();
		let start: Date, end: Date;

		if (timelineRange === "week") {
			start = startOfWeek(today, { weekStartsOn: 1 });
			end = endOfWeek(today, { weekStartsOn: 1 });
		} else {
			start = startOfMonth(today);
			end = endOfMonth(today);
		}

		const days = eachDayOfInterval({ start, end });

		return {
			days,
			tasks: filteredTarefas.filter((t) => t.start_date || t.data_vencimento),
		};
	}, [filteredTarefas, timelineRange]);

	// Chart data calculation moved to TaskInsights

	const handleRefresh = async () => {
		setIsRefetching(true);
		await refetch();
		setIsRefetching(false);
	};

	const handleViewTask = (tarefa: Tarefa) => {
		setSelectedTarefa(tarefa);
		setDetailModalOpen(true);
	};

	const handleDeleteTask = async (id: string) => {
		await deleteTarefa.mutateAsync(id);
	};

	const toggleGroup = (status: TarefaStatus) => {
		const newExpanded = new Set(expandedGroups);
		if (newExpanded.has(status)) {
			newExpanded.delete(status);
		} else {
			newExpanded.add(status);
		}
		setExpandedGroups(newExpanded);
	};

	const toggleTaskSelection = (id: string) => {
		const newSelected = new Set(selectedTasks);
		if (newSelected.has(id)) {
			newSelected.delete(id);
		} else {
			newSelected.add(id);
		}
		setSelectedTasks(newSelected);
	};

	if (isLoading) {
		return (
			<MainLayout>
				<div className="space-y-6">
					<LoadingSkeleton type="card" className="h-12 w-full" />
					<LoadingSkeleton type="card" className="h-[600px] w-full" />
				</div>
			</MainLayout>
		);
	}

	if (effectiveTarefas.length === 0) {
		return (
			<MainLayout>
				<div className="space-y-6">
					<EmptyState
						icon={ClipboardList}
						title="Nenhuma tarefa cadastrada"
						description="As tarefas premium agora exibem apenas dados reais. Crie a primeira tarefa para começar a acompanhar o fluxo do time."
						action={{
							label: "Criar nova tarefa",
							onClick: () => setQuickCreateOpen(true),
						}}
					/>

					<LazyTaskQuickCreateModal
						open={quickCreateOpen}
						onOpenChange={setQuickCreateOpen}
					/>
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout>
			<div className="flex flex-col h-full">
				{/* Header */}
				<div className="flex flex-col gap-6 mb-8">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center shadow-xl shadow-slate-900/20 rotate-3">
								<ClipboardList className="h-7 w-7 text-white -rotate-3" />
							</div>
							<div>
								<div className="flex items-center gap-3">
									<h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
										Tarefas Premium
									</h1>
									<Badge className="bg-primary/10 text-primary border-none font-black text-[10px] px-2 py-0.5 uppercase tracking-widest">
										Enterprise
									</Badge>
								</div>
								<p className="text-sm font-bold text-slate-400 uppercase tracking-[0.1em] mt-1">
									Controle de Responsabilidade e Fluxo de Trabalho
								</p>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<Button
								variant="ghost"
								size="icon"
								onClick={handleRefresh}
								disabled={isRefetching}
								className="h-12 w-12 rounded-2xl hover:bg-slate-100 transition-all active:scale-95"
							>
								<RefreshCw
									className={cn(
										"h-5 w-5 text-slate-400",
										isRefetching && "animate-spin",
									)}
								/>
							</Button>
							<Button
								onClick={() => setQuickCreateOpen(true)}
								className="h-12 px-6 rounded-2xl bg-slate-900 text-white font-bold shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all gap-2"
							>
								<Plus className="h-5 w-5" />
								Criar Nova Tarefa
							</Button>
						</div>
					</div>

					{/* Stats Cards */}
					{stats && (
						<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
							<Card>
								<CardContent className="pt-4">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm text-muted-foreground">Total</p>
											<p className="text-2xl font-bold">{stats.total}</p>
										</div>
										<Target className="h-8 w-8 text-muted-foreground/20" />
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardContent className="pt-4">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm text-muted-foreground">
												Em Progresso
											</p>
											<p className="text-2xl font-bold text-blue-600">
												{stats.by_status["EM_PROGRESSO"] || 0}
											</p>
										</div>
										<Clock className="h-8 w-8 text-blue-500/20" />
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardContent className="pt-4">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm text-muted-foreground">
												Concluídas
											</p>
											<p className="text-2xl font-bold text-green-600">
												{stats.by_status["CONCLUIDO"] || 0}
											</p>
										</div>
										<CheckCircle2 className="h-8 w-8 text-green-500/20" />
									</div>
								</CardContent>
							</Card>

							<Card className={cn(stats.overdue > 0 && "border-red-500/50")}>
								<CardContent className="pt-4">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm text-muted-foreground">Atrasadas</p>
											<p
												className={cn(
													"text-2xl font-bold",
													stats.overdue > 0
														? "text-red-600"
														: "text-muted-foreground",
												)}
											>
												{stats.overdue}
											</p>
										</div>
										<AlertCircle
											className={cn(
												"h-8 w-8",
												stats.overdue > 0
													? "text-red-500/20"
													: "text-muted-foreground/20",
											)}
										/>
									</div>
								</CardContent>
							</Card>

							<Card
								className={cn(
									stats.pending_acknowledgments > 0 &&
										"border-orange-500/50 bg-orange-50/10",
								)}
							>
								<CardContent className="pt-4">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm text-muted-foreground">
												Aguardando Ciente
											</p>
											<p
												className={cn(
													"text-2xl font-bold",
													stats.pending_acknowledgments > 0
														? "text-orange-600"
														: "text-muted-foreground",
												)}
											>
												{stats.pending_acknowledgments}
											</p>
										</div>
										<ShieldAlert
											className={cn(
												"h-8 w-8",
												stats.pending_acknowledgments > 0
													? "text-orange-500/20"
													: "text-muted-foreground/20",
											)}
										/>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardContent className="pt-4">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm text-muted-foreground">
												Esta Semana
											</p>
											<p className="text-2xl font-bold text-emerald-600">
												{stats.completed_this_week}
											</p>
										</div>
										<TrendingUp className="h-8 w-8 text-emerald-500/20" />
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardContent className="pt-4">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm text-muted-foreground">
												Taxa Conclusão
											</p>
											<p className="text-2xl font-bold">
												{stats.completion_rate.toFixed(0)}%
											</p>
										</div>
										<Zap className="h-8 w-8 text-yellow-500/20" />
									</div>
								</CardContent>
							</Card>
						</div>
					)}

					{/* Toolbar */}
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="relative w-64">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Buscar tarefas..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10 rounded-xl"
								/>
							</div>

							<Button
								variant={filterPendingAck ? "secondary" : "outline"}
								size="sm"
								onClick={() => setFilterPendingAck(!filterPendingAck)}
								className={cn(
									"rounded-xl gap-2 h-10 px-4 transition-all duration-300",
									filterPendingAck
										? "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200 shadow-sm"
										: "text-slate-500",
								)}
							>
								<ShieldAlert
									className={cn(
										"h-4 w-4",
										filterPendingAck ? "text-orange-600" : "text-slate-400",
									)}
								/>
								<span className="text-xs font-bold uppercase tracking-tight">
									Aguardando Ciente
								</span>
								{filterPendingAck && (
									<Badge
										variant="secondary"
										className="bg-orange-200 text-orange-800 ml-1 border-none px-1.5 h-4 min-w-[16px] flex items-center justify-center"
									>
										{filteredTarefas.length}
									</Badge>
								)}
							</Button>

							{/* Priority Filter */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										className="rounded-xl gap-2 h-10 px-4 text-slate-500"
									>
										<Filter className="h-4 w-4" />
										<span className="text-xs font-bold uppercase tracking-tight">
											Prioridade
										</span>
										{filterPriority.length > 0 && (
											<Badge variant="secondary" className="ml-1 h-4 px-1">
												{filterPriority.length}
											</Badge>
										)}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="rounded-xl">
									<DropdownMenuLabel>Filtrar por Prioridade</DropdownMenuLabel>
									<DropdownMenuSeparator />
									{(Object.keys(PRIORIDADE_LABELS) as TarefaPrioridade[]).map(
										(p) => (
											<DropdownMenuCheckboxItem
												key={p}
												checked={filterPriority.includes(p)}
												onCheckedChange={(checked) => {
													setFilterPriority((prev) =>
														checked
															? [...prev, p]
															: prev.filter((x) => x !== p),
													);
												}}
											>
												{PRIORIDADE_LABELS[p]}
											</DropdownMenuCheckboxItem>
										),
									)}
								</DropdownMenuContent>
							</DropdownMenu>

							{/* Type Filter */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										className="rounded-xl gap-2 h-10 px-4 text-slate-500"
									>
										<Tag className="h-4 w-4" />
										<span className="text-xs font-bold uppercase tracking-tight">
											Tipo
										</span>
										{filterType.length > 0 && (
											<Badge variant="secondary" className="ml-1 h-4 px-1">
												{filterType.length}
											</Badge>
										)}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="rounded-xl">
									<DropdownMenuLabel>Filtrar por Tipo</DropdownMenuLabel>
									<DropdownMenuSeparator />
									{(Object.keys(TIPO_LABELS) as TarefaTipo[]).map((t) => (
										<DropdownMenuCheckboxItem
											key={t}
											checked={filterType.includes(t)}
											onCheckedChange={(checked) => {
												setFilterType((prev) =>
													checked ? [...prev, t] : prev.filter((x) => x !== t),
												);
											}}
										>
											{TIPO_LABELS[t]}
										</DropdownMenuCheckboxItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>

							{/* Assignee Filter */}
							{teamMembers && teamMembers.length > 0 && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="outline"
											className="rounded-xl gap-2 h-10 px-4 text-slate-500"
										>
											<Users className="h-4 w-4" />
											<span className="text-xs font-bold uppercase tracking-tight">
												Membros
											</span>
											{filterAssignee.length > 0 && (
												<Badge variant="secondary" className="ml-1 h-4 px-1">
													{filterAssignee.length}
												</Badge>
											)}
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent className="rounded-xl max-h-[300px] overflow-y-auto">
										<DropdownMenuLabel>Filtrar por Membro</DropdownMenuLabel>
										<DropdownMenuSeparator />
										{teamMembers.map((member) => (
											<DropdownMenuCheckboxItem
												key={member.id}
												checked={filterAssignee.includes(member.id)}
												onCheckedChange={(checked) => {
													setFilterAssignee((prev) =>
														checked
															? [...prev, member.id]
															: prev.filter((x) => x !== member.id),
													);
												}}
											>
												{member.full_name}
											</DropdownMenuCheckboxItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							)}
						</div>

						{/* View Toggle */}
						<Tabs
							value={viewMode}
							onValueChange={(v) => setViewMode(v as ViewMode)}
						>
							<TabsList className="bg-slate-100/50 p-1 h-11 rounded-xl">
								<TabsTrigger
									value="kanban"
									className="rounded-lg h-9 data-[state=active]:bg-white data-[state=active]:shadow-sm"
								>
									<LayoutGrid className="h-4 w-4 mr-2" />
									Kanban
								</TabsTrigger>
								<TabsTrigger
									value="table"
									className="rounded-lg h-9 data-[state=active]:bg-white data-[state=active]:shadow-sm"
								>
									<LayoutList className="h-4 w-4 mr-2" />
									Tabela
								</TabsTrigger>
								<TabsTrigger
									value="timeline"
									className="rounded-lg h-9 data-[state=active]:bg-white data-[state=active]:shadow-sm"
								>
									<GanttChart className="h-4 w-4 mr-2" />
									Timeline
								</TabsTrigger>
								<TabsTrigger
									value="insights"
									className="rounded-lg h-9 data-[state=active]:bg-white data-[state=active]:shadow-sm"
								>
									<BarChart3 className="h-4 w-4 mr-2" />
									Insights
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>
				</div>

				{/* Content */}
				<div className="flex-1 min-h-0">
					{/* Kanban View */}
					{viewMode === "kanban" && <KanbanBoardV2 tarefas={filteredTarefas} />}

					{/* Table View */}
					{viewMode === "table" && (
						<Card className="rounded-[2rem] border-none shadow-premium-sm overflow-hidden">
							{/* Table Header */}
							<div className="p-4 border-b">
								<div className="flex items-center gap-2 mb-3">
									{Object.entries(groupedTasks || {})
										.filter(([status]) => status !== "ARQUIVADO")
										.map(([status, tasks]) => (
											<div
												key={`header-${status}`}
												className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
												onClick={() => toggleGroup(status as TarefaStatus)}
											>
												{expandedGroups.has(status) ? (
													<ChevronDown className="h-4 w-4" />
												) : (
													<ChevronRight className="h-4 w-4" />
												)}
												<div
													className={cn(
														"h-3 w-3 rounded-full",
														STATUS_COLORS[status as TarefaStatus]?.dot,
													)}
												/>
												<span className="font-medium text-sm">
													{STATUS_LABELS[status as TarefaStatus]}
												</span>
												<Badge variant="secondary" className="text-xs">
													{tasks.length}
												</Badge>
											</div>
										))}
								</div>
							</div>

							{/* Virtualized Table */}
							<ScrollArea className="h-[calc(100vh-450px)]">
								<TaskTableVirtualized
									tasks={Object.entries(groupedTasks || {})
										.filter(([status]) => expandedGroups.has(status))
										.flatMap(([, tasks]) => tasks)}
									selectedTasks={selectedTasks}
									toggleTaskSelection={toggleTaskSelection}
									onViewTask={handleViewTask}
									onEditTask={handleViewTask}
									onDeleteTask={handleDeleteTask}
									onDuplicateTask={(tarefa) =>
										console.log("Duplicate task:", tarefa)
									}
									onArchiveTask={(id) => console.log("Archive task:", id)}
								/>
							</ScrollArea>
						</Card>
					)}

					{/* Timeline View */}
					{viewMode === "timeline" && (
						<Card>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<CardTitle>Timeline de Tarefas</CardTitle>
									<Select
										value={timelineRange}
										onValueChange={(v) =>
											setTimelineRange(v as "week" | "month")
										}
									>
										<SelectTrigger className="w-32">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="week">Semana</SelectItem>
											<SelectItem value="month">Mês</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</CardHeader>
							<CardContent>
								<ScrollArea className="h-[calc(100vh-450px)]">
									{/* Timeline Header */}
									<div className="flex border-b sticky top-0 bg-background z-10">
										<div className="w-64 p-2 border-r shrink-0">
											<span className="text-sm font-medium">Tarefa</span>
										</div>
										<div className="flex flex-1">
											{timelineData.days.map((day, i) => (
												<div
													key={i}
													className={cn(
														"flex-1 min-w-12 p-2 text-center border-r text-xs",
														safeFormat(day, "yyyy-MM-dd") ===
															safeFormat(new Date(), "yyyy-MM-dd") &&
															"bg-primary/10",
													)}
												>
													<div className="font-medium">
														{safeFormat(day, "EEE")}
													</div>
													<div className="text-muted-foreground">
														{safeFormat(day, "dd")}
													</div>
												</div>
											))}
										</div>
									</div>

									{/* Timeline Rows */}
									{timelineData.tasks.map((tarefa) => {
										const startDate = tarefa.start_date
											? new Date(tarefa.start_date)
											: null;
										const endDate = tarefa.data_vencimento
											? new Date(tarefa.data_vencimento)
											: null;
										const statusConfig = STATUS_COLORS[tarefa.status] || {
											dot: "bg-gray-400",
										};

										return (
											<div
												key={tarefa.id}
												className="flex border-b hover:bg-muted/50 cursor-pointer"
												onClick={() => handleViewTask(tarefa)}
											>
												<div className="w-64 p-2 border-r shrink-0">
													<div className="flex items-center gap-2">
														<div
															className={cn(
																"h-2 w-2 rounded-full shrink-0",
																statusConfig.dot,
															)}
														/>
														<span className="text-sm truncate">
															{tarefa.titulo}
														</span>
													</div>
												</div>
												<div className="flex flex-1 relative">
													{timelineData.days.map((day, i) => {
														const dayStr = safeFormat(day, "yyyy-MM-dd");
														const isStartValid =
															startDate && isValid(startDate);
														const isEndValid = endDate && isValid(endDate);

														const isInRange =
															(isStartValid || isEndValid) &&
															((isStartValid &&
																isEndValid &&
																isWithinInterval(day, {
																	start: startDate,
																	end: endDate,
																})) ||
																(isStartValid &&
																	!isEndValid &&
																	dayStr ===
																		safeFormat(startDate, "yyyy-MM-dd")) ||
																(!isStartValid &&
																	isEndValid &&
																	dayStr ===
																		safeFormat(endDate, "yyyy-MM-dd")));

														const isStart =
															isStartValid &&
															dayStr === safeFormat(startDate, "yyyy-MM-dd");
														const isEnd =
															isEndValid &&
															dayStr === safeFormat(endDate, "yyyy-MM-dd");

														return (
															<div
																key={i}
																className={cn(
																	"flex-1 min-w-12 h-10 border-r relative",
																	safeFormat(day, "yyyy-MM-dd") ===
																		safeFormat(new Date(), "yyyy-MM-dd") &&
																		"bg-primary/5",
																)}
															>
																{isInRange && (
																	<div
																		className={cn(
																			"absolute top-2 h-6",
																			isStart
																				? "left-0 rounded-l-full"
																				: "left-0",
																			isEnd
																				? "right-0 rounded-r-full"
																				: "right-0",
																			tarefa.status === "CONCLUIDO"
																				? "bg-green-500/60"
																				: tarefa.status === "EM_PROGRESSO"
																					? "bg-blue-500/60"
																					: "bg-primary/40",
																		)}
																	>
																		{isStart && (
																			<span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-white font-medium whitespace-nowrap">
																				{tarefa.titulo.slice(0, 15)}...
																			</span>
																		)}
																	</div>
																)}
															</div>
														);
													})}
												</div>
											</div>
										);
									})}

									{timelineData.tasks.length === 0 && (
										<div className="text-center py-12 text-muted-foreground">
											<Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
											<p>Nenhuma tarefa com datas definidas</p>
										</div>
									)}
									<ScrollBar orientation="horizontal" />
								</ScrollArea>
							</CardContent>
						</Card>
					)}

					{/* Insights View */}
					{viewMode === "insights" && stats && (
						<Suspense
							fallback={
								<LoadingSkeleton type="card" className="h-[500px] w-full" />
							}
						>
							<TaskInsights stats={stats} effectiveTarefas={effectiveTarefas} />
						</Suspense>
					)}
				</div>
			</div>

			{/* Modals */}
			<Suspense
				fallback={<LoadingSkeleton type="card" className="w-full h-64" />}
			>
				<LazyTaskQuickCreateModal
					open={quickCreateOpen}
					onOpenChange={setQuickCreateOpen}
					defaultStatus="A_FAZER"
				/>
			</Suspense>

			<Suspense
				fallback={<LoadingSkeleton type="card" className="w-full h-64" />}
			>
				<LazyTaskDetailModal
					open={detailModalOpen}
					onOpenChange={setDetailModalOpen}
					tarefa={selectedTarefa}
					teamMembers={teamMembers || []}
				/>
			</Suspense>
		</MainLayout>
	);
}
