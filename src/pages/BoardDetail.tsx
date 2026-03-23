import { Suspense, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { BoardHeader, type BoardView } from "@/components/boards/BoardHeader";
import { BoardCalendarView } from "@/components/boards/BoardCalendarView";
import { BoardListView } from "@/components/boards/BoardListView";
import { BoardWorkspaceSidebar } from "@/components/boards/BoardWorkspaceSidebar";
import { KanbanFull } from "@/components/boards/KanbanFull";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
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
import { useBoardTarefas } from "@/hooks/useBoardColumns";
import { useBoard, useDeleteBoard, useUpdateBoard } from "@/hooks/useBoards";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import type { Tarefa } from "@/types/tarefas";
import { LazyTaskDetailModal } from "@/components/tarefas/v2/LazyComponents";

export default function BoardDetail() {
	const { boardId } = useParams<{ boardId: string }>();
	const navigate = useNavigate();
	const [view, setView] = useState<BoardView>("kanban");
	const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);
	const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);

	const { data: board, isLoading, error, refetch } = useBoard(boardId);
	const { data: tarefasRaw, refetch: refetchTarefas } =
		useBoardTarefas(boardId);
	const { data: teamMembers } = useTeamMembers();
	const updateBoard = useUpdateBoard();
	const deleteBoard = useDeleteBoard();

	const tarefas = tarefasRaw ?? [];
	const columns = board?.columns ?? [];

	const boardStats = useMemo(() => {
		const completedCount = tarefas.filter(
			(task) => task.status === "CONCLUIDO",
		).length;
		const overdueCount = tarefas.filter((task) => {
			if (!task.data_vencimento || task.status === "CONCLUIDO") return false;
			return new Date(task.data_vencimento).getTime() < Date.now();
		}).length;
		return {
			taskCount: tarefas.length,
			columnCount: columns.length,
			completedCount,
			overdueCount,
		};
	}, [columns.length, tarefas]);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background">
				<LoadingSkeleton
					type="card"
					className="h-[220px] w-full rounded-none"
				/>
				<div className="px-4 py-6 sm:px-6 lg:px-8">
					<div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
						<LoadingSkeleton type="card" className="h-[640px] rounded-[28px]" />
						<LoadingSkeleton type="card" className="h-[640px] rounded-[28px]" />
					</div>
				</div>
			</div>
		);
	}

	if (error || !board) {
		return (
			<div className="flex h-64 flex-col items-center justify-center gap-4">
				<AlertTriangle className="h-12 w-12 text-muted-foreground" />
				<p className="text-muted-foreground">Board não encontrado.</p>
				<Button variant="outline" onClick={() => navigate("/boards")}>
					Voltar aos Boards
				</Button>
			</div>
		);
	}

	const handleRename = (name: string) => {
		updateBoard.mutate({ id: board.id, name });
	};

	const handleStar = () => {
		updateBoard.mutate({ id: board.id, is_starred: !board.is_starred });
	};

	const handleArchiveConfirm = () => {
		deleteBoard.mutate(board.id, {
			onSuccess: () => navigate("/boards"),
		});
	};

	const handleViewTask = (tarefa: Tarefa) => {
		setSelectedTarefa(tarefa);
		setDetailOpen(true);
	};

	const handleAddTaskInList = (_columnId: string) => {
		setView("kanban");
	};

	const handleRefreshAll = () => {
		refetch();
		refetchTarefas();
	};

	const sidebarContent = (
		<BoardWorkspaceSidebar
			board={board}
			columns={columns}
			tarefas={tarefas}
			teamMembers={teamMembers}
			currentView={view}
			onViewChange={setView}
			onViewTask={handleViewTask}
		/>
	);

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.10),transparent_26%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(248,250,252,1))]">
			<BoardHeader
				board={board}
				currentView={view}
				onViewChange={setView}
				onRename={handleRename}
				onStar={handleStar}
				onArchive={() => setArchiveConfirmOpen(true)}
				onRefresh={handleRefreshAll}
				onOpenSidebar={() => setSidebarOpen(true)}
				stats={boardStats}
			/>

			<div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
				<div className="overflow-hidden rounded-[28px] border border-border/60 bg-card/70 shadow-sm backdrop-blur-sm lg:hidden">
					<div className="p-4 sm:p-5">
						{view === "kanban" && (
							<KanbanFull
								boardId={board.id}
								columns={columns}
								tarefas={tarefas}
								teamMembers={teamMembers}
								onRefetch={handleRefreshAll}
							/>
						)}

						{view === "list" && (
							<BoardListView
								columns={columns}
								tarefas={tarefas}
								onAddTask={handleAddTaskInList}
								onViewTask={handleViewTask}
							/>
						)}

						{view === "calendar" && (
							<BoardCalendarView
								tarefas={tarefas}
								onViewTask={handleViewTask}
							/>
						)}
					</div>
				</div>

				<div className="hidden overflow-hidden rounded-[28px] border border-border/60 bg-card/70 shadow-sm backdrop-blur-sm lg:block">
					<ResizablePanelGroup
						direction="horizontal"
						className="min-h-[calc(100vh-280px)]"
					>
						<ResizablePanel defaultSize={22} minSize={18} maxSize={30}>
							<div className="h-full border-r border-border/60 bg-muted/25 p-4">
								{sidebarContent}
							</div>
						</ResizablePanel>
						<ResizableHandle withHandle />
						<ResizablePanel defaultSize={78} minSize={50}>
							<div className="h-full bg-background/60">
								<div className="h-full p-6">
									{view === "kanban" && (
										<KanbanFull
											boardId={board.id}
											columns={columns}
											tarefas={tarefas}
											teamMembers={teamMembers}
											onRefetch={handleRefreshAll}
										/>
									)}

									{view === "list" && (
										<BoardListView
											columns={columns}
											tarefas={tarefas}
											onAddTask={handleAddTaskInList}
											onViewTask={handleViewTask}
										/>
									)}

									{view === "calendar" && (
										<BoardCalendarView
											tarefas={tarefas}
											onViewTask={handleViewTask}
										/>
									)}
								</div>
							</div>
						</ResizablePanel>
					</ResizablePanelGroup>
				</div>
			</div>

			<Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
				<SheetContent side="left" className="w-full max-w-md p-0">
					<SheetHeader className="border-b px-6 py-5">
						<SheetTitle>Resumo do board</SheetTitle>
						<SheetDescription>
							Views, métricas, pessoas ativas e próximos prazos.
						</SheetDescription>
					</SheetHeader>
					<div className="h-[calc(100%-81px)] p-4">{sidebarContent}</div>
				</SheetContent>
			</Sheet>

			<Suspense fallback={null}>
				<LazyTaskDetailModal
					open={detailOpen}
					onOpenChange={setDetailOpen}
					tarefa={selectedTarefa}
					teamMembers={teamMembers ?? []}
				/>
			</Suspense>

			<AlertDialog
				open={archiveConfirmOpen}
				onOpenChange={setArchiveConfirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Arquivar board "{board.name}"?</AlertDialogTitle>
						<AlertDialogDescription>
							O board será arquivado. As tarefas serão preservadas e podem ser
							recuperadas.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={handleArchiveConfirm}>
							Arquivar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
