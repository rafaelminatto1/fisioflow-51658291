import { useState, useMemo } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Filter, LayoutGrid, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {

  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { KanbanColumn } from './KanbanColumn';
import { TarefaModal } from './TarefaModal';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Tarefa,
  TarefaStatus,
  TarefaPrioridade,
  PRIORIDADE_LABELS,
  useTarefas,
  useUpdateTarefa,
  useDeleteTarefa,
  useBulkUpdateTarefas
} from '@/hooks/useTarefas';

const STATUSES: TarefaStatus[] = ['A_FAZER', 'EM_PROGRESSO', 'REVISAO', 'CONCLUIDO'];

interface KanbanBoardProps {
  projectId?: string;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { data: tarefas, isLoading } = useTarefas();
  const updateTarefa = useUpdateTarefa();
  const deleteTarefa = useDeleteTarefa();
  const bulkUpdate = useBulkUpdateTarefas();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrioridade, setFilterPrioridade] = useState<TarefaPrioridade | 'ALL'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TarefaStatus>('A_FAZER');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filter and group tasks by status
  const groupedTarefas = useMemo(() => {
    if (!tarefas) return {};

    const filtered = tarefas.filter(t => {
      const matchesSearch = t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesPrioridade = filterPrioridade === 'ALL' || t.prioridade === filterPrioridade;
      const matchesProject = projectId ? t.project_id === projectId : true;

      return matchesSearch && matchesPrioridade && matchesProject;
    });

    const getOrderIndex = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

    return STATUSES.reduce((acc, status) => {
      acc[status] = filtered
        .filter(t => t.status === status)
        .sort((a, b) => getOrderIndex(a.order_index) - getOrderIndex(b.order_index));
      return acc;
    }, {} as Record<TarefaStatus, Tarefa[]>);
  }, [tarefas, searchTerm, filterPrioridade, projectId]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceStatus = source.droppableId as TarefaStatus;
    const destStatus = destination.droppableId as TarefaStatus;

    // Create new arrays for source and destination
    const sourceTasks = [...(groupedTarefas[sourceStatus] || [])];
    const destTasks = sourceStatus === destStatus
      ? sourceTasks
      : [...(groupedTarefas[destStatus] || [])];

    // Find the task being moved
    const [movedTask] = sourceTasks.splice(source.index, 1);

    // Insert into destination
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
        order_index: destination.index
      });
    }

    // Update order indices
    const updates: Array<{ id: string; order_index: number }> = [];

    if (sourceStatus === destStatus) {
      sourceTasks.forEach((t, i) => {
        if (t.order_index !== i) {
          updates.push({ id: t.id, order_index: i });
        }
      });
    } else {
      destTasks.forEach((t, i) => {
        if (t.order_index !== i || t.id === draggableId) {
          updates.push({ id: t.id, order_index: i });
        }
      });
    }

    if (updates.length > 0) {
      await bulkUpdate.mutateAsync(updates);
    }
  };

  const [defaultOrderIndex, setDefaultOrderIndex] = useState(0);

  const handleAddTask = (status: TarefaStatus) => {
    setSelectedTarefa(null);
    setDefaultStatus(status);
    setDefaultOrderIndex(groupedTarefas[status]?.length ?? 0);
    setModalOpen(true);
  };

  const handleEditTask = (tarefa: Tarefa) => {
    setSelectedTarefa(tarefa);
    setModalOpen(true);
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <LoadingSkeleton type="card" className="h-10 w-64" />
          <LoadingSkeleton type="card" className="h-10 w-40" />
        </div>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map(i => (
            <LoadingSkeleton key={i} type="card" className="w-[320px] h-[400px]" />
          ))}
        </div>
      </div>
    );
  }

  const totalTarefas = tarefas?.length || 0;

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
        <TarefaModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          tarefa={selectedTarefa}
          defaultStatus={defaultStatus}
          defaultOrderIndex={defaultOrderIndex}
          defaultProjectId={projectId}
        />
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Priority Filter */}
          <Select value={filterPrioridade} onValueChange={(v) => setFilterPrioridade(v as TarefaPrioridade | 'ALL')}>
            <SelectTrigger className="w-36">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {(Object.keys(PRIORIDADE_LABELS) as TarefaPrioridade[]).map(p => (
                <SelectItem key={p} value={p}>{PRIORIDADE_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => handleAddTask('A_FAZER')}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {STATUSES.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              tarefas={groupedTarefas[status] || []}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
            />
          ))}
        </div>
      </DragDropContext>

      <TarefaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        tarefa={selectedTarefa}
        defaultStatus={defaultStatus}
        defaultProjectId={projectId}
      />

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
