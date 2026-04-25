import { useState, useMemo, useCallback, Suspense } from "react";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import {
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  Columns,
  CheckSquare,
  Tag,
  User,
  AlertTriangle,
  Settings,
  Zap,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { KanbanColumnFull } from "./KanbanColumnFull";
import { AddColumnButton } from "./AddColumnButton";
import { BoardLabelManager } from "./BoardLabelManager";
import { AutomationCenter } from "./AutomationCenter";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  LazyTaskDetailModal,
  LazyTaskQuickCreateModal,
} from "@/components/tarefas/v2/LazyComponents";
import type { BoardColumn } from "@/types/boards";
import type { Tarefa, TarefaStatus } from "@/types/tarefas";
import { useDeleteTarefa, useBulkUpdateTarefas } from "@/hooks/useTarefas";
import {
  useCreateBoardColumn,
  useUpdateBoardColumn,
  useDeleteBoardColumn,
  useReorderBoardColumns,
} from "@/hooks/useBoardColumns";
import { tarefasApi } from "@/api/v2";
import { useQueryClient } from "@tanstack/react-query";
import { useBoardLabels } from "@/contexts/BoardLabelsContext";
import { cn } from "@/lib/utils";

interface KanbanFullProps {
  boardId: string;
  columns: BoardColumn[];
  tarefas: Tarefa[];
  teamMembers?: Array<{ id: string; full_name: string; avatar_url?: string }>;
  isLoading?: boolean;
  onRefetch?: () => void;
  currentUserId?: string;
}

export function KanbanFull({
  boardId,
  columns,
  tarefas,
  teamMembers = [],
  isLoading,
  onRefetch,
  currentUserId,
}: KanbanFullProps) {
  const queryClient = useQueryClient();

  const deleteTarefa = useDeleteTarefa();
  const bulkUpdate = useBulkUpdateTarefas();
  const createColumn = useCreateBoardColumn(boardId);
  const updateColumn = useUpdateBoardColumn(boardId);
  const deleteColumn = useDeleteBoardColumn(boardId);
  const reorderColumns = useReorderBoardColumns(boardId);

  // Board labels — provided by BoardDetail via BoardLabelsContext
  const { labels, labelsMap } = useBoardLabels();

  // Filters — persisted per board in localStorage
  const storageKey = `kanban-filters-${boardId}`;
  const savedFilters = useMemo(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [storageKey]);

  const [search, setSearch] = useState<string>(savedFilters.search ?? "");
  const [filterLabelIds, setFilterLabelIds] = useState<string[]>(savedFilters.filterLabelIds ?? []);
  const [filterPendingChecklist, setFilterPendingChecklist] = useState<boolean>(
    savedFilters.filterPendingChecklist ?? false,
  );
  const [quickFilter, setQuickFilter] = useState<string | null>(savedFilters.quickFilter ?? null);

  // Persist filter changes
  const persistFilters = useCallback(
    (patch: Record<string, unknown>) => {
      try {
        const current = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
        localStorage.setItem(storageKey, JSON.stringify({ ...current, ...patch }));
      } catch {
        // non-critical
      }
    },
    [storageKey],
  );

  const setSearchPersisted = useCallback(
    (v: string) => {
      setSearch(v);
      persistFilters({ search: v });
    },
    [persistFilters],
  );
  const setFilterLabelIdsPersisted = useCallback(
    (v: string[]) => {
      setFilterLabelIds(v);
      persistFilters({ filterLabelIds: v });
    },
    [persistFilters],
  );
  const setFilterPendingChecklistPersisted = useCallback(
    (v: boolean) => {
      setFilterPendingChecklist(v);
      persistFilters({ filterPendingChecklist: v });
    },
    [persistFilters],
  );
  const setQuickFilterPersisted = useCallback(
    (v: string | null) => {
      setQuickFilter(v);
      persistFilters({ quickFilter: v });
    },
    [persistFilters],
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null);
  const [defaultColumnId, setDefaultColumnId] = useState<string>("");
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);
  const [automationOpen, setAutomationOpen] = useState(false);

  // Sort columns by order_index
  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.order_index - b.order_index),
    [columns],
  );

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterLabelIds.length) count++;
    if (filterPendingChecklist) count++;
    if (quickFilter) count++;
    return count;
  }, [filterLabelIds.length, filterPendingChecklist, quickFilter]);

  // Tarefas grouped by column_id, filtered by search + labels + checklist + quick filters
  // Orphaned tasks (null/undefined column_id) are assigned to the first column
  const grouped = useMemo(() => {
    const now = new Date();
    const filtered = tarefas.filter((t) => {
      // Text search: title, description, tags, checklist item text
      if (search) {
        const q = search.toLowerCase();
        const checklistMatch = t.checklists?.some((cl) =>
          cl.items.some((item) => item.text.toLowerCase().includes(q)),
        );
        const tagMatch = t.tags?.some((tag) => tag.toLowerCase().includes(q));
        const labelMatch = t.label_ids?.some((lid) =>
          labelsMap.get(lid)?.name.toLowerCase().includes(q),
        );
        if (
          !t.titulo.toLowerCase().includes(q) &&
          !t.descricao?.toLowerCase().includes(q) &&
          !checklistMatch &&
          !tagMatch &&
          !labelMatch
        ) {
          return false;
        }
      }

      // Label filter
      if (filterLabelIds.length > 0) {
        if (!t.label_ids || !filterLabelIds.some((lid) => t.label_ids!.includes(lid))) {
          return false;
        }
      }

      // Pending checklist filter
      if (filterPendingChecklist) {
        const hasPending =
          t.checklists &&
          t.checklists.length > 0 &&
          t.checklists.some((cl) => cl.items.some((item) => !item.completed));
        if (!hasPending) return false;
      }

      // Quick filters
      if (quickFilter === "mine" && currentUserId) {
        const assigneeIds = t.assignees?.map((a) => a.id) ?? [];
        if (t.responsavel_id) assigneeIds.push(t.responsavel_id);
        if (!assigneeIds.includes(currentUserId)) return false;
      }
      if (quickFilter === "overdue") {
        if (!t.data_vencimento || new Date(t.data_vencimento) >= now || t.status === "CONCLUIDO")
          return false;
      }
      if (quickFilter === "high_priority") {
        if (t.prioridade !== "ALTA" && t.prioridade !== "URGENTE") return false;
      }
      if (quickFilter === "no_assignee") {
        if (t.responsavel_id || (t.assignees && t.assignees.length > 0)) return false;
      }

      return true;
    });

    const firstColId = sortedColumns[0]?.id;
    return columns.reduce(
      (acc, col) => {
        acc[col.id] = filtered
          .filter((t) => t.column_id === col.id || (!t.column_id && col.id === firstColId))
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
        return acc;
      },
      {} as Record<string, Tarefa[]>,
    );
  }, [
    tarefas,
    columns,
    sortedColumns,
    search,
    filterLabelIds,
    filterPendingChecklist,
    quickFilter,
    currentUserId,
    labelsMap,
  ]);

  const totalVisibleTasks = Object.values(grouped).reduce((total, list) => total + list.length, 0);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { source, destination, draggableId, type } = result;
      if (!destination) return;
      if (source.droppableId === destination.droppableId && source.index === destination.index)
        return;

      // Column drag
      if (type === "COLUMN") {
        const newOrder = [...sortedColumns];
        const [moved] = newOrder.splice(source.index, 1);
        newOrder.splice(destination.index, 0, moved);
        const updates = newOrder.map((col, i) => ({
          id: col.id,
          order_index: i,
        }));
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
        await tarefasApi.update(draggableId, {
          column_id: destColId,
          order_index: destination.index,
        });
      }

      // Update order indices
      const tasksToUpdate = sourceColId === destColId ? sourceTasks : destTasks;
      const updates = tasksToUpdate
        .map((t, i) => ({ id: t.id, order_index: i }))
        .filter((u) => u.order_index !== tarefas.find((t) => t.id === u.id)?.order_index);

      if (updates.length > 0) {
        await bulkUpdate.mutateAsync(updates);
      }

      // Sync the board-specific cache after all updates
      queryClient.invalidateQueries({
        queryKey: ["boards", boardId, "tarefas"],
      });
    },
    [grouped, sortedColumns, reorderColumns, tarefas, bulkUpdate, queryClient, boardId],
  );

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
      queryClient.invalidateQueries({
        queryKey: ["boards", boardId, "tarefas"],
      });
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
      <Card className="mb-4 overflow-hidden rounded-[24px] border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,252,0.92))] shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4">
          {/* Top row: stats + actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                Canvas do board
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {sortedColumns.length} coluna
                {sortedColumns.length !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {totalVisibleTasks} tarefa
                {totalVisibleTasks !== 1 ? "s" : ""}
              </Badge>
              {(search || activeFilterCount > 0) && (
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 text-blue-600 border-blue-300"
                >
                  <Filter className="mr-1.5 h-3.5 w-3.5" />
                  {activeFilterCount + (search ? 1 : 0)} filtro
                  {activeFilterCount + (search ? 1 : 0) !== 1 ? "s" : ""} ativo
                  {activeFilterCount + (search ? 1 : 0) !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Board settings menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 rounded-xl gap-1.5">
                    <Settings className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Board</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLabelManagerOpen(true)}>
                    <Tag className="h-4 w-4 mr-2" />
                    Gerenciar etiquetas
                    {labels.length > 0 && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {labels.length}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setAutomationOpen(true)}>
                    <Zap className="h-4 w-4 mr-2" />
                    Automações
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="sm"
                className="h-9 rounded-xl"
                onClick={() => handleAddTask(sortedColumns[0]?.id ?? "")}
                disabled={sortedColumns.length === 0}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Nova tarefa
              </Button>
            </div>
          </div>

          {/* Search + filters row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar título, descrição, etiquetas ou itens de checklist..."
                value={search}
                onChange={(e) => setSearchPersisted(e.target.value)}
                className="h-9 rounded-xl border-border/60 bg-background pl-9 pr-8 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearchPersisted("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Label filter popover */}
            {labels.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={filterLabelIds.length > 0 ? "default" : "outline"}
                    size="sm"
                    className="h-9 rounded-xl gap-1.5 shrink-0"
                  >
                    <Tag className="h-3.5 w-3.5" />
                    Etiquetas
                    {filterLabelIds.length > 0 && (
                      <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                        {filterLabelIds.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <p className="text-xs font-medium text-muted-foreground px-1 pb-1">
                    Filtrar por etiqueta
                  </p>
                  {labels.map((label) => {
                    const active = filterLabelIds.includes(label.id);
                    return (
                      <button
                        key={label.id}
                        onClick={() =>
                          setFilterLabelIdsPersisted(
                            active
                              ? filterLabelIds.filter((id) => id !== label.id)
                              : [...filterLabelIds, label.id],
                          )
                        }
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          active ? "bg-accent" : "hover:bg-accent/50",
                        )}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="flex-1 text-left truncate">{label.name}</span>
                        {active && <span className="text-xs text-muted-foreground">✓</span>}
                      </button>
                    );
                  })}
                  {filterLabelIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-1 h-7 text-xs"
                      onClick={() => setFilterLabelIdsPersisted([])}
                    >
                      Limpar
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Quick filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {[
              {
                id: "mine",
                label: "Minhas tarefas",
                icon: <User className="h-3 w-3" />,
              },
              {
                id: "overdue",
                label: "Atrasadas",
                icon: <AlertTriangle className="h-3 w-3" />,
              },
              {
                id: "high_priority",
                label: "Alta prioridade",
                icon: <Filter className="h-3 w-3" />,
              },
              {
                id: "no_assignee",
                label: "Sem responsável",
                icon: <User className="h-3 w-3" />,
              },
            ].map((qf) => (
              <button
                key={qf.id}
                onClick={() => setQuickFilterPersisted(quickFilter === qf.id ? null : qf.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all",
                  quickFilter === qf.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
                )}
              >
                {qf.icon}
                {qf.label}
              </button>
            ))}
            <button
              onClick={() => setFilterPendingChecklistPersisted(!filterPendingChecklist)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all",
                filterPendingChecklist
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
              )}
            >
              <CheckSquare className="h-3 w-3" />
              Checklist pendente
            </button>

            {/* Clear all filters */}
            {(quickFilter || filterPendingChecklist || filterLabelIds.length > 0 || search) && (
              <button
                onClick={() => {
                  setQuickFilterPersisted(null);
                  setFilterPendingChecklistPersisted(false);
                  setFilterLabelIdsPersisted([]);
                  setSearchPersisted("");
                }}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-destructive border border-dashed border-border hover:border-destructive/40 transition-all"
              >
                <X className="h-3 w-3" />
                Limpar filtros
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Empty state — no columns yet */}
      {sortedColumns.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed border-border/70 bg-muted/20 py-20 text-center">
          <Columns className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="font-semibold text-muted-foreground">Nenhuma coluna criada</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Use o botão abaixo para adicionar sua primeira coluna.
            </p>
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
              style={{ minHeight: "calc(100vh - 360px)" }}
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
          onOpenChange={(o) => {
            setCreateOpen(o);
            if (!o) onRefetch?.();
          }}
          defaultStatus={"A_FAZER" as TarefaStatus}
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
            <AlertDialogAction
              onClick={handleDeleteTask}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Label Manager */}
      <BoardLabelManager
        boardId={boardId}
        open={labelManagerOpen}
        onOpenChange={setLabelManagerOpen}
      />

      {/* Automation Center */}
      <AutomationCenter
        boardId={boardId}
        open={automationOpen}
        onOpenChange={setAutomationOpen}
        labels={labels}
      />
    </>
  );
}
