import { useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { BoardHeader, type BoardView } from '@/components/boards/BoardHeader';
import { KanbanFull } from '@/components/boards/KanbanFull';
import { BoardListView } from '@/components/boards/BoardListView';
import { BoardCalendarView } from '@/components/boards/BoardCalendarView';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBoard, useUpdateBoard, useDeleteBoard } from '@/hooks/useBoards';
import { useBoardTarefas } from '@/hooks/useBoardColumns';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import type { Tarefa } from '@/types/tarefas';
import { LazyTaskDetailModal } from '@/components/tarefas/v2/LazyComponents';

export default function BoardDetail() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [view, setView] = useState<BoardView>('kanban');
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const { data: board, isLoading, error, refetch } = useBoard(boardId);
  const { data: tarefasRaw, refetch: refetchTarefas } = useBoardTarefas(boardId);
  const { data: teamMembers } = useTeamMembers();
  const updateBoard = useUpdateBoard();
  const deleteBoard = useDeleteBoard();

  const tarefas = tarefasRaw ?? [];

  if (isLoading) {
    return (
      <div>
        <LoadingSkeleton type="card" className="h-[110px] w-full rounded-none" />
        <div className="p-6 flex gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <LoadingSkeleton key={i} type="card" className="w-[280px] h-[500px]" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Board não encontrado.</p>
        <Button variant="outline" onClick={() => navigate('/boards')}>
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

  const handleArchive = () => setArchiveConfirmOpen(true);

  const handleArchiveConfirm = () => {
    deleteBoard.mutate(board.id, {
      onSuccess: () => navigate('/boards'),
    });
  };

  const handleViewTask = (tarefa: Tarefa) => {
    setSelectedTarefa(tarefa);
    setDetailOpen(true);
  };

  const handleAddTaskInList = (_columnId: string) => {
    setView('kanban');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <BoardHeader
        board={board}
        currentView={view}
        onViewChange={setView}
        onRename={handleRename}
        onStar={handleStar}
        onArchive={handleArchive}
      />

      <div className="flex-1 p-6 overflow-hidden">
        {view === 'kanban' && (
          <KanbanFull
            boardId={board.id}
            columns={board.columns ?? []}
            tarefas={tarefas}
            teamMembers={teamMembers}
            onRefetch={() => { refetch(); refetchTarefas(); }}
          />
        )}

        {view === 'list' && (
          <BoardListView
            columns={board.columns ?? []}
            tarefas={tarefas}
            onAddTask={handleAddTaskInList}
            onViewTask={handleViewTask}
          />
        )}

        {view === 'calendar' && (
          <BoardCalendarView
            tarefas={tarefas}
            onViewTask={handleViewTask}
          />
        )}
      </div>

      {/* Task detail modal */}
      <Suspense fallback={null}>
        <LazyTaskDetailModal
          open={detailOpen}
          onOpenChange={setDetailOpen}
          tarefa={selectedTarefa}
          teamMembers={teamMembers ?? []}
        />
      </Suspense>

      {/* Archive confirm */}
      <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar board "{board?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              O board será arquivado. As tarefas serão preservadas e podem ser recuperadas.
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
