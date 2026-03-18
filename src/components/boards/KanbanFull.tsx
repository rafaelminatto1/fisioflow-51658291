import { useState, useMemo, useCallback, Suspense } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { Plus, Search, Columns } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { KanbanColumnFull } from './KanbanColumnFull';
import { AddColumnButton } from './AddColumnButton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LazyTaskDetailModal, LazyTaskQuickCreateModal } from '@/components/tarefas/v2/LazyComponents';
import type { BoardColumn } from '@/types/boards';
import type { Tarefa, TarefaStatus } from '@/types/tarefas';
import { useUpdateTarefa, useDeleteTarefa, useBulkUpdateTarefas } from '@/hooks/useTarefas';
import { useCreateBoardColumn, useUpdateBoardColumn, useDeleteBoardColumn, useReorderBoardColumns } from '@/hooks/useBoardColumns';
import { tarefasApi } from '@/lib/api/workers-client';
import { useQueryClient } from '@tanstack/react-query';

interface KanbanFullProps {
  boardId: string;
  columns: BoardColumn[];
  tarefas: Tarefa[];
  teamMembers?: Array<{ id: string; full_name: string; avatar_url?: string }>;
  isLoading?: boolean;
  onRefetch?: () => void;
}

export function KanbanFull({ boardId, columns, tarefas, teamMembers = [], isLoading, onRefetch }: KanbanFullProps) {
  const queryClient = useQueryClient();
  const updateTarefa = useUpdateTarefa();
  const deleteTarefa = useDeleteTarefa();
  const bulkUpdate = useBulkUpdateTarefas();
  const createColumn = useCreateBoardColumn(boardId);
  const updateColumn = useUpdateBoardColumn(boardId);
  const deleteColumn = useDeleteBoardColumn(boardId);
  const reorderColumns = useReorderBoardColumns(boardId);

  const [search, setSearch] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null);
  const [defaultColumnId, setDefaultColumnId] = useState<string>('');
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  // Tarefas grouped by column_id, filtered by search
  // Orphaned tasks (null/undefined column_id) are assigned to the first column
  const grouped = useMemo(() => {
    const filtered = search
      ? tarefas.filter(t =>
        t.titulo.toLowerCase().includes(search.toLowerCase()) ||
        t.descricao?.toLowerCase().includes(search.toLowerCase())
      )
      : tarefas;

    const firstColId = sortedColumns[0]?.id;
    return columns.reduce((acc, col) => {
      acc[col.id] = filtered
        .filter(t => t.column_id === col.id || (!t.column_id && col.id === firstColId))
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      return acc;
    }, {} as Record<string, Tarefa[]>);
  }, [tarefas, columns, sortedColumns, search]);

  // Sort columns by order_index
  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.order_index - b.order_index),
    [columns]
  );

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { source, destination, draggableId, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Column drag
    if (type === 'COLUMN') {
      const newOrder = [...sortedColumns];
      const [moved] = newOrder.splice(source.index, 1);
      newOrder.splice(destination.index, 0, moved);
      const updates = newOrder.map((col, i) => ({ id: col.id, order_index: i }));
      reorderColumns.mutate(updates);
      return;
    }

    // Task drag
    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    const sourceTasks = [...(grouped[sourceColId] ?? [])];
    const destTasks = sourceColId === destColId ? sourceTasks : [...(grouped[destColId] ?? [])];
    const [movedTask] = sourceTasks.splice(source.index, 1);

    if (sourceColId === destColId) {
      sourceTasks.splice(destination.index, 0, movedTask);
    } else {
      destTasks.splice(destination.index, 0, movedTask);
    }

    // Update moved task column_id if changed
    if (sourceColId !== destColId) {
      await tarefasApi.update(draggableId, { column_id: destColId, order_index: destination.index });
    }

    // Update order indices
    const tasksToUpdate = sourceColId === destColId ? sourceTasks : destTasks;
    const updates = tasksToUpdate
      .map((t, i) => ({ id: t.id, order_index: i }))
      .filter(u => u.order_index !== tarefas.find(t => t.id === u.id)?.order_index);

    if (updates.length > 0) {
      await bulkUpdate.mutateAsync(updates);
    }

    // Sync the board-specific cache after all updates
    queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'tarefas'] });
  }, [grouped, sortedColumns, reorderColumns, tarefas, bulkUpdate, queryClient, boardId]);

  const handleAddTask = (columnId: string) => {
    setSelectedTarefa(null);
    setDefaultColumnId(columnId);
    setCreateOpen(true);
  };

  const handleEditTask = (tarefa: Tarefa) => {
    setSelectedTarefa(tarefa);
    setDetailOpen(true);
  };

  const handleDeleteTask = async () => {
    if (deleteTaskId) {
      await deleteTarefa.mutateAsync(deleteTaskId);
      queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'tarefas'] });
      setDeleteTaskId(null);
    }
  };

  const handleRenameColumn = (id: string, name: string) => {
    updateColumn.mutate({ id, name });
  };

  const handleDeleteColumn = (id: string) => {
    deleteColumn.mutate(id);
  };

  const handleUpdateColumnWip = (id: string, wipLimit: number | null) => {
    updateColumn.mutate({ id, wip_limit: wipLimit });
  };

  const handleAddColumn = (name: string) => {
    createColumn.mutate({ name });
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <LoadingSkeleton key={i} type="card" className="w-[280px] h-[500px]" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <Button size="sm" onClick={() => handleAddTask(sortedColumns[0]?.id ?? '')} disabled={sortedColumns.length === 0}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nova Tarefa
        </Button>
      </div>

      {/* Empty state — no columns yet */}
      {sortedColumns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Columns className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="font-semibold text-muted-foreground">Nenhuma coluna criada</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Use o botão abaixo para adicionar sua primeira coluna.</p>
          </div>
        </div>
      )}

      {/* Kanban board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board-columns" type="COLUMN" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex gap-4 overflow-x-auto pb-6"
              style={{ minHeight: 'calc(100vh - 280px)' }}
            >
              {sortedColumns.map((column, index) => (
                <KanbanColumnFull
                  key={column.id}
                  column={column}
                  index={index}
                  tarefas={grouped[column.id] ?? []}
                  onAddTask={handleAddTask}
                  onEditTask={handleEditTask}
                  onViewTask={handleEditTask}
                  onDeleteTask={(id) => setDeleteTaskId(id)}
                  onRenameColumn={handleRenameColumn}
                  onDeleteColumn={handleDeleteColumn}
                  onUpdateColumnWip={handleUpdateColumnWip}
                />
              ))}
              {provided.placeholder}

              {/* Add column button */}
              <AddColumnButton onAdd={handleAddColumn} isLoading={createColumn.isPending} />
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Quick Create Modal */}
      <Suspense fallback={null}>
        <LazyTaskQuickCreateModal
          open={createOpen}
          onOpenChange={(o) => { setCreateOpen(o); if (!o) onRefetch?.(); }}
          defaultStatus={'A_FAZER' as TarefaStatus}
          initialData={{ board_id: boardId, column_id: defaultColumnId } as Partial<Tarefa>}
        />
      </Suspense>

      {/* Detail Modal */}
      <Suspense fallback={null}>
        <LazyTaskDetailModal
          open={detailOpen}
          onOpenChange={setDetailOpen}
          tarefa={selectedTarefa}
          teamMembers={teamMembers}
        />
      </Suspense>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
