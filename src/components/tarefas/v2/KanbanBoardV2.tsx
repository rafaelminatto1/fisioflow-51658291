import { useState, useMemo, useCallback, Suspense } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import {

  Filter,
  LayoutGrid,
  Plus,
  Search,
  LayoutList,
  Calendar as CalendarIcon,
  BarChart3,
  Users,
  Tag,
  X,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';


import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { LazyKanbanColumnV2, LazyTaskDetailModal, LazyTaskQuickCreateModal } from './LazyComponents';
import {
  Tarefa,
  TarefaStatus,
  TarefaPrioridade,
  TarefaTipo,
  PRIORIDADE_LABELS,
  TIPO_LABELS,
  TaskFilter
} from '@/types/tarefas';
import {
  useTarefas,
  useUpdateTarefa,
  useDeleteTarefa,
  useBulkUpdateTarefas
} from '@/hooks/useTarefas';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { cn } from '@/lib/utils';

const DEFAULT_STATUSES: TarefaStatus[] = ['BACKLOG', 'A_FAZER', 'EM_PROGRESSO', 'REVISAO', 'CONCLUIDO'];

// WIP Limits por status (pode ser configurável)
const DEFAULT_WIP_LIMITS: Partial<Record<TarefaStatus, number>> = {
  EM_PROGRESSO: 5,
  REVISAO: 3
};

interface KanbanBoardV2Props {
  projectId?: string;
  statuses?: TarefaStatus[];
  wipLimits?: Partial<Record<TarefaStatus, number>>;
  onViewChange?: (view: 'kanban' | 'list' | 'calendar' | 'analytics') => void;
  tarefas?: Tarefa[];
}

export function KanbanBoardV2({
  projectId,
  statuses = DEFAULT_STATUSES,
  wipLimits = DEFAULT_WIP_LIMITS,
  onViewChange,
  tarefas: propTarefas
}: KanbanBoardV2Props) {
  const { data: hookTarefas, isLoading, refetch } = useTarefas();
  // Use prop tarefas if provided (for mock data), otherwise use hook data
  const tarefas = propTarefas !== undefined ? propTarefas : hookTarefas;
  const { data: teamMembers } = useTeamMembers();
  const updateTarefa = useUpdateTarefa();
  const deleteTarefa = useDeleteTarefa();
  const bulkUpdate = useBulkUpdateTarefas();

  // State
  const [filters, setFilters] = useState<TaskFilter>({});
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TarefaStatus>('A_FAZER');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);

  // Filter and group tasks by status
  const groupedTarefas = useMemo(() => {
    if (!tarefas) return {};

    const filtered = tarefas.filter(t => {
      // Text search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          t.titulo.toLowerCase().includes(searchLower) ||
          t.descricao?.toLowerCase().includes(searchLower) ||
          t.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status && filters.status.length > 0 && !filters.status.includes(t.status)) {
        return false;
      }

      // Priority filter
      if (filters.prioridade && filters.prioridade.length > 0 && !filters.prioridade.includes(t.prioridade)) {
        return false;
      }

      // Type filter
      if (filters.tipo && filters.tipo.length > 0 && !filters.tipo.includes(t.tipo)) {
        return false;
      }

      // Assignee filter
      if (filters.assignees && filters.assignees.length > 0) {
        const taskAssignees = t.assignees?.map(a => a.id) || [];
        if (t.responsavel_id) taskAssignees.push(t.responsavel_id);
        if (!filters.assignees.some(a => taskAssignees.includes(a))) {
          return false;
        }
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        if (!t.tags || !filters.tags.some(tag => t.tags?.includes(tag))) {
          return false;
        }
      }

      // Project filter
      if (projectId && t.project_id !== projectId) {
        return false;
      }

      // Overdue filter
      if (filters.is_overdue && t.data_vencimento) {
        const isOverdue = new Date(t.data_vencimento) < new Date() && t.status !== 'CONCLUIDO';
        if (!isOverdue) return false;
      }

      return true;
    });

    // Group by status
    const getOrderIndex = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

    return statuses.reduce((acc, status) => {
      acc[status] = filtered
        .filter(t => t.status === status)
        .sort((a, b) => getOrderIndex(a.order_index) - getOrderIndex(b.order_index));
      return acc;
    }, {} as Record<TarefaStatus, Tarefa[]>);
  }, [tarefas, filters, projectId, statuses]);

  // Get all unique tags
  const _allTags = useMemo(() => {
    if (!tarefas) return [];
    const tags = new Set<string>();
    tarefas.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [tarefas]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.prioridade?.length) count++;
    if (filters.tipo?.length) count++;
    if (filters.assignees?.length) count++;
    if (filters.tags?.length) count++;
    if (filters.is_overdue) count++;
    return count;
  }, [filters]);

  // Handlers
  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceStatus = source.droppableId as TarefaStatus;
    const destStatus = destination.droppableId as TarefaStatus;

    // Create new arrays
    const sourceTasks = [...(groupedTarefas[sourceStatus] || [])];
    const destTasks = sourceStatus === destStatus
      ? sourceTasks
      : [...(groupedTarefas[destStatus] || [])];

    // Find and move task
    const [movedTask] = sourceTasks.splice(source.index, 1);

    if (sourceStatus === destStatus) {
      sourceTasks.splice(destination.index, 0, movedTask);
    } else {
      destTasks.splice(destination.index, 0, movedTask);
    }

    // Update the moved task's status if changed
    if (sourceStatus !== destStatus) {
      await updateTarefa.mutateAsync({
        id: draggableId,
        status: destStatus,
        order_index: destination.index,
        ...(destStatus === 'CONCLUIDO' ? { completed_at: new Date().toISOString() } : {})
      });
    }

    // Update order indices
    const updates: Array<{ id: string; order_index: number }> = [];

    const tasksToUpdate = sourceStatus === destStatus ? sourceTasks : destTasks;
    tasksToUpdate.forEach((t, i) => {
      if (t.order_index !== i || t.id === draggableId) {
        updates.push({ id: t.id, order_index: i });
      }
    });

    if (updates.length > 0) {
      await bulkUpdate.mutateAsync(updates);
    }
  }, [groupedTarefas, updateTarefa, bulkUpdate]);

  const handleAddTask = (status: TarefaStatus) => {
    setSelectedTarefa(null);
    setDefaultStatus(status);
    setQuickCreateOpen(true);
  };

  const handleEditTask = (tarefa: Tarefa) => {
    setSelectedTarefa(tarefa);
    setDetailModalOpen(true);
  };

  const handleViewTask = (tarefa: Tarefa) => {
    setSelectedTarefa(tarefa);
    setDetailModalOpen(true);
  };

  const handleDeleteTask = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteTarefa.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleDuplicateTask = async (tarefa: Tarefa) => {
    // Create a copy of the task
    const { _id, _created_at, _updated_at, _completed_at, ...rest } = tarefa;
    // The create function will be called from the modal
    setSelectedTarefa({ ...rest, titulo: `${tarefa.titulo} (cópia)` } as Tarefa);
    setQuickCreateOpen(true);
  };

  const handleArchiveTask = async (id: string) => {
    await updateTarefa.mutateAsync({ id, status: 'ARQUIVADO' });
  };

  const handleRefresh = async () => {
    setIsRefetching(true);
    await refetch();
    setIsRefetching(false);
  };

  const clearFilters = () => {
    setFilters({});
  };

  // Loading state - only show if we don't have props and still loading
  if (isLoading && propTarefas === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <LoadingSkeleton type="card" className="h-10 w-64" />
          <LoadingSkeleton type="card" className="h-10 w-40" />
        </div>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {statuses.map(i => (
            <LoadingSkeleton key={i} type="card" className="w-[320px] h-[500px]" />
          ))}
        </div>
      </div>
    );
  }

  const totalTarefas = tarefas?.length || 0;

  // Empty state
  if (totalTarefas === 0) {
    return (
      <>
        <EmptyState
          icon={LayoutGrid}
          title="Nenhuma tarefa criada"
          description="Comece criando sua primeira tarefa para organizar o trabalho da equipe."
          action={{
            label: 'Criar Tarefa',
            onClick: () => handleAddTask('A_FAZER')
          }}
        />
        <Suspense fallback={<LoadingSkeleton type="card" className="w-full h-64" />}>
          <LazyTaskQuickCreateModal
            open={quickCreateOpen}
            onOpenChange={setQuickCreateOpen}
            defaultStatus={defaultStatus}
            defaultProjectId={projectId}
          />
        </Suspense>
      </>
    );
  }

  return (
    <>
      {/* Header / Toolbar */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Search and Filters */}
          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tarefas..."
                value={filters.search || ''}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                className="pl-10"
              />
            </div>

            {/* Priority Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Prioridade
                  {filters.prioridade?.length ? (
                    <Badge variant="secondary" className="ml-1">
                      {filters.prioridade.length}
                    </Badge>
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filtrar por Prioridade</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(PRIORIDADE_LABELS) as TarefaPrioridade[]).map(p => (
                  <DropdownMenuCheckboxItem
                    key={p}
                    checked={filters.prioridade?.includes(p)}
                    onCheckedChange={(checked) => {
                      setFilters(f => ({
                        ...f,
                        prioridade: checked
                          ? [...(f.prioridade || []), p]
                          : f.prioridade?.filter(x => x !== p)
                      }));
                    }}
                  >
                    {PRIORIDADE_LABELS[p]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Type Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Tag className="h-4 w-4" />
                  Tipo
                  {filters.tipo?.length ? (
                    <Badge variant="secondary" className="ml-1">
                      {filters.tipo.length}
                    </Badge>
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filtrar por Tipo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(TIPO_LABELS) as TarefaTipo[]).map(t => (
                  <DropdownMenuCheckboxItem
                    key={t}
                    checked={filters.tipo?.includes(t)}
                    onCheckedChange={(checked) => {
                      setFilters(f => ({
                        ...f,
                        tipo: checked
                          ? [...(f.tipo || []), t]
                          : f.tipo?.filter(x => x !== t)
                      }));
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
                  <Button variant="outline" className="gap-2">
                    <Users className="h-4 w-4" />
                    Responsável
                    {filters.assignees?.length ? (
                      <Badge variant="secondary" className="ml-1">
                        {filters.assignees.length}
                      </Badge>
                    ) : null}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-64 overflow-y-auto">
                  <DropdownMenuLabel>Filtrar por Responsável</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {teamMembers.map(member => (
                    <DropdownMenuCheckboxItem
                      key={member.id}
                      checked={filters.assignees?.includes(member.id)}
                      onCheckedChange={(checked) => {
                        setFilters(f => ({
                          ...f,
                          assignees: checked
                            ? [...(f.assignees || []), member.id]
                            : f.assignees?.filter(x => x !== member.id)
                        }));
                      }}
                    >
                      {member.full_name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Clear Filters */}
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar ({activeFiltersCount})
              </Button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Refresh */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefetching}
            >
              <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
            </Button>

            {/* View Toggle */}
            {onViewChange && (
              <Tabs defaultValue="kanban" className="hidden sm:block">
                <TabsList>
                  <TabsTrigger value="kanban" onClick={() => onViewChange('kanban')}>
                    <LayoutGrid className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="list" onClick={() => onViewChange('list')}>
                    <LayoutList className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="calendar" onClick={() => onViewChange('calendar')}>
                    <CalendarIcon className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="analytics" onClick={() => onViewChange('analytics')}>
                    <BarChart3 className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {/* New Task Button */}
            <Button onClick={() => handleAddTask('A_FAZER')}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Filtros ativos:</span>
            {filters.search && (
              <Badge variant="secondary" className="gap-1">
                Busca: "{filters.search}"
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setFilters(f => ({ ...f, search: undefined }))}
                />
              </Badge>
            )}
            {filters.prioridade?.map(p => (
              <Badge key={p} variant="secondary" className="gap-1">
                {PRIORIDADE_LABELS[p]}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setFilters(f => ({
                    ...f,
                    prioridade: f.prioridade?.filter(x => x !== p)
                  }))}
                />
              </Badge>
            ))}
            {filters.tipo?.map(t => (
              <Badge key={t} variant="secondary" className="gap-1">
                {TIPO_LABELS[t]}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setFilters(f => ({
                    ...f,
                    tipo: f.tipo?.filter(x => x !== t)
                  }))}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {statuses.map(status => (
            <Suspense key={status} fallback={<LoadingSkeleton type="card" className="w-[320px] h-[500px]" />}>
              <LazyKanbanColumnV2
                status={status}
                tarefas={groupedTarefas[status] || []}
                wipLimit={wipLimits[status]}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onViewTask={handleViewTask}
                onDeleteTask={handleDeleteTask}
                onDuplicateTask={handleDuplicateTask}
                onArchiveTask={handleArchiveTask}
              />
            </Suspense>
          ))}
        </div>
      </DragDropContext>

      {/* Quick Create Modal */}
      <Suspense fallback={<LoadingSkeleton type="card" className="w-full h-64" />}>
        <LazyTaskQuickCreateModal
          open={quickCreateOpen}
          onOpenChange={setQuickCreateOpen}
          defaultStatus={defaultStatus}
          defaultProjectId={projectId}
          initialData={selectedTarefa || undefined}
        />
      </Suspense>

      {/* Detail Modal */}
      <Suspense fallback={<LoadingSkeleton type="card" className="w-full h-64" />}>
        <LazyTaskDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          tarefa={selectedTarefa}
          teamMembers={teamMembers || []}
        />
      </Suspense>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tarefa será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
