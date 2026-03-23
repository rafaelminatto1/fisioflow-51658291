import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	Clock3,
	LayoutGrid,
	Plus,
	RefreshCw,
	Search,
	Sparkles,
	Star,
	TrendingUp,
} from "lucide-react";
import { BoardCard } from "@/components/boards/BoardCard";
import { BoardsEmptyState } from "@/components/boards/BoardsEmptyState";
import { CreateBoardModal } from "@/components/boards/CreateBoardModal";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { cn } from "@/lib/utils";
import {
	useBoards,
	useCreateBoard,
	useDeleteBoard,
	useUpdateBoard,
} from "@/hooks/useBoards";

type BoardCollection = "all" | "favorites" | "recent";

export default function BoardsHome() {
	const [createOpen, setCreateOpen] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [collection, setCollection] = useState<BoardCollection>("all");
	const { data: boards, isLoading, refetch } = useBoards();
	const createBoard = useCreateBoard();
	const updateBoard = useUpdateBoard();
	const deleteBoard = useDeleteBoard();

	const allBoards = boards ?? [];
	const starredBoards = allBoards.filter((board) => board.is_starred);
	const recentBoards = [...allBoards]
		.sort(
			(a, b) =>
				new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
		)
		.slice(0, 5);

	const visibleBoards = useMemo(() => {
		const lowerSearch = search.toLowerCase();
		const searched = search
			? allBoards.filter(
					(board) =>
						board.name.toLowerCase().includes(lowerSearch) ||
						board.description?.toLowerCase().includes(lowerSearch),
				)
			: allBoards;

		if (collection === "favorites") {
			return searched.filter((board) => board.is_starred);
		}

		if (collection === "recent") {
			const recentIds = new Set(recentBoards.map((board) => board.id));
			return searched.filter((board) => recentIds.has(board.id));
		}

		return searched;
	}, [allBoards, collection, recentBoards, search]);

	const handleStar = (id: string, starred: boolean) => {
		updateBoard.mutate({ id, is_starred: starred });
	};

	const handleDelete = (id: string) => setDeletingId(id);

	const handleDeleteConfirm = () => {
		if (!deletingId) return;
		deleteBoard.mutate(deletingId, {
			onSuccess: () => setDeletingId(null),
		});
	};

	const handleCreate = (data: {
		name: string;
		description?: string;
		background_color: string;
		icon: string;
	}) => {
		createBoard.mutate(data, {
			onSuccess: () => setCreateOpen(false),
		});
	};

	if (isLoading) {
		return (
			<div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
				<LoadingSkeleton type="card" className="h-[220px] rounded-[32px]" />
				<div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
					<LoadingSkeleton type="card" className="h-[460px] rounded-[28px]" />
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{Array.from({ length: 6 }).map((_, index) => (
							<LoadingSkeleton
								key={index}
								type="card"
								className="h-[212px] rounded-[28px]"
							/>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.12),transparent_28%),linear-gradient(180deg,rgba(248,250,252,0.96),rgba(248,250,252,1))]">
			<div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
				<section className="overflow-hidden rounded-[32px] border border-slate-800/70 bg-[linear-gradient(135deg,#0f172a,#111827,#1e293b)] text-white shadow-2xl">
					<div className="grid gap-8 px-6 py-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
						<div className="space-y-6">
							<div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/78">
								<Sparkles className="mr-2 h-3.5 w-3.5" />
								Workspace de boards
							</div>
							<div className="space-y-3">
								<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
									Trate boards como missão, não só como lista de tarefas.
								</h1>
								<p className="max-w-3xl text-sm leading-7 text-white/72 sm:text-base">
									Inspire o fluxo no que há de melhor em Trello, Monday e
									ClickUp: clareza visual, contexto operacional e acesso rápido
									às views mais usadas.
								</p>
							</div>

							<div className="grid gap-3 sm:grid-cols-4">
								<div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
									<div className="text-xs uppercase tracking-[0.16em] text-white/62">
										Boards
									</div>
									<div className="mt-2 text-3xl font-semibold">
										{allBoards.length}
									</div>
								</div>
								<div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
									<div className="text-xs uppercase tracking-[0.16em] text-white/62">
										Favoritos
									</div>
									<div className="mt-2 text-3xl font-semibold">
										{starredBoards.length}
									</div>
								</div>
								<div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
									<div className="text-xs uppercase tracking-[0.16em] text-white/62">
										Tarefas
									</div>
									<div className="mt-2 text-3xl font-semibold">
										{allBoards.reduce(
											(total, board) => total + Number(board.task_count ?? 0),
											0,
										)}
									</div>
								</div>
								<div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
									<div className="flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-white/62">
										<TrendingUp className="h-3.5 w-3.5" />
										Ritmo
									</div>
									<div className="mt-2 text-3xl font-semibold">
										{recentBoards.length}
									</div>
								</div>
							</div>
						</div>

						<div className="space-y-4 rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
							<div className="flex items-center justify-between">
								<div>
									<div className="text-lg font-semibold">Acesse rápido</div>
									<div className="text-sm text-white/68">
										Busque, atualize ou crie um novo board.
									</div>
								</div>
								<Button
									variant="ghost"
									size="icon"
									className="text-white hover:bg-white/10 hover:text-white"
									onClick={() => refetch()}
									title="Atualizar"
								>
									<RefreshCw className="h-4 w-4" />
								</Button>
							</div>

							<div className="relative">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/48" />
								<Input
									placeholder="Buscar boards, descrições ou contexto..."
									value={search}
									onChange={(event) => setSearch(event.target.value)}
									className="h-11 border-white/15 bg-white/10 pl-9 text-white placeholder:text-white/45"
								/>
							</div>

							<div className="flex flex-wrap gap-2">
								{(
									[
										["all", "Todos"],
										["favorites", "Favoritos"],
										["recent", "Recentes"],
									] as const
								).map(([value, label]) => (
									<button
										key={value}
										type="button"
										onClick={() => setCollection(value)}
										className={cn(
											"rounded-full border px-3 py-1.5 text-sm transition-colors",
											collection === value
												? "border-white bg-white text-slate-950"
												: "border-white/15 bg-white/10 text-white/78 hover:bg-white/15",
										)}
									>
										{label}
									</button>
								))}
							</div>

							<Button
								onClick={() => setCreateOpen(true)}
								className="h-11 w-full rounded-2xl bg-white text-slate-950 hover:bg-white/90"
							>
								<Plus className="mr-2 h-4 w-4" />
								Novo board
							</Button>
						</div>
					</div>
				</section>

				{allBoards.length === 0 ? (
					<BoardsEmptyState onCreate={() => setCreateOpen(true)} />
				) : (
					<div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
						<aside className="space-y-4">
							<Card className="rounded-[28px] border-border/60 shadow-sm">
								<CardHeader className="pb-3">
									<CardTitle className="text-sm font-semibold">
										Coleções
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									{(
										[
											{
												value: "all",
												label: "Todos os boards",
												description: `${allBoards.length} disponíveis`,
												icon: LayoutGrid,
											},
											{
												value: "favorites",
												label: "Favoritos",
												description: `${starredBoards.length} destacados`,
												icon: Star,
											},
											{
												value: "recent",
												label: "Atualizados há pouco",
												description: `${recentBoards.length} em foco`,
												icon: Clock3,
											},
										] as const
									).map((item) => {
										const Icon = item.icon;
										return (
											<button
												key={item.value}
												type="button"
												onClick={() => setCollection(item.value)}
												className={cn(
													"flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors",
													collection === item.value
														? "border-primary/30 bg-primary/10"
														: "border-border/50 bg-background hover:border-primary/20 hover:bg-accent/40",
												)}
											>
												<div className="rounded-xl bg-muted p-2">
													<Icon className="h-4 w-4" />
												</div>
												<div className="min-w-0">
													<div className="text-sm font-medium">
														{item.label}
													</div>
													<div className="text-xs text-muted-foreground">
														{item.description}
													</div>
												</div>
											</button>
										);
									})}
								</CardContent>
							</Card>

							<Card className="rounded-[28px] border-border/60 shadow-sm">
								<CardHeader className="pb-3">
									<CardTitle className="text-sm font-semibold">
										Atualizados recentemente
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									{recentBoards.map((board) => (
										<div
											key={board.id}
											className="rounded-2xl border border-border/50 bg-background px-3 py-3"
										>
											<div className="flex items-start justify-between gap-3">
												<div className="min-w-0">
													<div className="truncate text-sm font-medium">
														{board.icon ? `${board.icon} ` : ""}
														{board.name}
													</div>
													<div className="mt-1 text-xs text-muted-foreground">
														{formatDistanceToNow(new Date(board.updated_at), {
															addSuffix: true,
															locale: ptBR,
														})}
													</div>
												</div>
												<Badge variant="secondary" className="rounded-full">
													{board.task_count ?? 0}
												</Badge>
											</div>
										</div>
									))}
								</CardContent>
							</Card>
						</aside>

						<div className="space-y-6">
							{starredBoards.length > 0 && collection === "all" && !search && (
								<section className="space-y-3">
									<div className="flex items-center justify-between">
										<div>
											<h2 className="text-lg font-semibold tracking-tight">
												Favoritos
											</h2>
											<p className="text-sm text-muted-foreground">
												Boards que merecem acesso direto no dia a dia.
											</p>
										</div>
										<Badge variant="secondary" className="rounded-full">
											{starredBoards.length}
										</Badge>
									</div>
									<div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
										{starredBoards.slice(0, 3).map((board) => (
											<BoardCard
												key={board.id}
												board={board}
												onStar={handleStar}
												onDelete={handleDelete}
											/>
										))}
									</div>
								</section>
							)}

							<section className="space-y-3">
								<div className="flex flex-wrap items-end justify-between gap-3">
									<div>
										<h2 className="text-lg font-semibold tracking-tight">
											{search
												? `Resultados para "${search}"`
												: collection === "favorites"
													? "Boards favoritos"
													: collection === "recent"
														? "Boards recentes"
														: "Todos os boards"}
										</h2>
										<p className="text-sm text-muted-foreground">
											{visibleBoards.length} resultado
											{visibleBoards.length !== 1 ? "s" : ""}.
										</p>
									</div>
									<Button
										onClick={() => setCreateOpen(true)}
										className="rounded-2xl"
									>
										<Plus className="mr-2 h-4 w-4" />
										Novo board
									</Button>
								</div>

								{visibleBoards.length === 0 ? (
									<Card className="rounded-[28px] border-dashed border-border/70 shadow-sm">
										<CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
											<div className="rounded-full bg-muted p-4">
												<Search className="h-6 w-6 text-muted-foreground" />
											</div>
											<div className="space-y-1">
												<div className="text-lg font-medium">
													Nenhum board encontrado
												</div>
												<div className="text-sm text-muted-foreground">
													Ajuste a busca ou mude a coleção ativa.
												</div>
											</div>
										</CardContent>
									</Card>
								) : (
									<div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
										{visibleBoards.map((board) => (
											<BoardCard
												key={board.id}
												board={board}
												onStar={handleStar}
												onDelete={handleDelete}
											/>
										))}
										{!search && collection === "all" && (
											<button
												type="button"
												onClick={() => setCreateOpen(true)}
												className="flex min-h-[212px] flex-col items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-border/70 bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
											>
												<div className="rounded-2xl bg-muted p-3">
													<Plus className="h-6 w-6" />
												</div>
												<div className="space-y-1 text-center">
													<div className="font-medium">Criar board</div>
													<div className="text-sm text-muted-foreground">
														Abra um novo fluxo para o time.
													</div>
												</div>
											</button>
										)}
									</div>
								)}
							</section>
						</div>
					</div>
				)}

				<CreateBoardModal
					open={createOpen}
					onOpenChange={setCreateOpen}
					onSubmit={handleCreate}
					isLoading={createBoard.isPending}
				/>

				<AlertDialog
					open={!!deletingId}
					onOpenChange={() => setDeletingId(null)}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Arquivar board?</AlertDialogTitle>
							<AlertDialogDescription>
								O board será arquivado. As tarefas serão preservadas e podem ser
								recuperadas.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancelar</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleDeleteConfirm}
								disabled={deleteBoard.isPending}
							>
								Arquivar
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</div>
	);
}
