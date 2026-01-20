import { useState, useMemo, useCallback, memo } from "react";
import { useProjectTarefas, useUpdateTarefa, Tarefa } from "@/hooks/useTarefas";
import { format, addDays, differenceInDays, isSameDay, startOfWeek, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { TarefaModal } from "@/components/tarefas/TarefaModal";

interface ProjectTimelineProps {
    projectId: string;
}

export function ProjectTimeline({ projectId }: ProjectTimelineProps) {
    // Hook otimizado que busca apenas tarefas do projeto específico
    const { data: tasks = [], isLoading } = useProjectTarefas(projectId);
    const { mutate: updateTarefa } = useUpdateTarefa();

    if (isLoading) {
        return <div className="flex items-center justify-center h-full">Carregando...</div>;
    }

    return (
        <ProjectTimelineContent
            projectId={projectId}
            tasks={tasks}
            updateTarefa={updateTarefa}
        />
    );
}

// Componente memoizado para linha de tarefa individual
// Só re-renderiza quando as props mudam
const TaskRow = memo(({
    task,
    styles,
    isDragging,
    days,
    onTaskClick,
    onMouseDown
}: {
    task: Tarefa;
    styles: { x: number; y: number; width: number; height: number };
    isDragging: boolean;
    days: Date[];
    onTaskClick: (task: Tarefa) => void;
    onMouseDown: (e: React.MouseEvent, task: Tarefa) => void;
}) => {
    const getStatusColor = (status: Tarefa['status']) => {
        switch (status) {
            case 'CONCLUIDO': return 'bg-green-500 border-green-600';
            case 'EM_PROGRESSO': return 'bg-blue-500 border-blue-600';
            case 'REVISAO': return 'bg-yellow-500 border-yellow-600';
            default: return 'bg-slate-400 border-slate-500';
        }
    };

    return (
        <div className="flex h-12 bg-background hover:bg-muted/30 group">
            {/* Task Title Column */}
            <div className="w-64 shrink-0 border-r px-4 py-2 flex items-center gap-2 sticky left-0 bg-background z-10 group-hover:bg-muted/30">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span
                            className="truncate text-sm font-medium cursor-pointer hover:underline"
                            onClick={() => onTaskClick(task)}
                        >
                            {task.titulo}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>{task.titulo}</TooltipContent>
                </Tooltip>
            </div>

            {/* Timeline Bar Area */}
            <div className="flex relative flex-1">
                {/* Grid Lines */}
                {days.map(day => (
                    <div key={`grid-${day.toISOString()}`} className="w-[40px] shrink-0 border-r h-full" />
                ))}

                {/* Task Bar */}
                <div
                    className={`absolute top-2 h-8 rounded-md shadow-sm border flex items-center px-2 text-xs text-white overflow-hidden whitespace-nowrap cursor-grab active:cursor-grabbing hover:opacity-90 transition-opacity z-10
                                ${getStatusColor(task.status)}
                                ${isDragging ? 'opacity-80 shadow-lg ring-2 ring-primary z-50' : ''}
                            `}
                    style={{
                        left: `${styles.x}px`,
                        width: `${styles.width}px`,
                        transition: isDragging ? 'none' : 'left 0.2s ease, width 0.2s ease'
                    }}
                    onClick={() => {
                        if (!isDragging) onTaskClick(task);
                    }}
                    onMouseDown={(e) => onMouseDown(e, task)}
                >
                    {task.responsavel?.avatar_url && (
                        <Avatar className="h-5 w-5 mr-1 border-white border">
                            <AvatarImage src={task.responsavel.avatar_url} />
                            <AvatarFallback className="text-[10px]">{task.responsavel.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                    )}
                    <span className="truncate drop-shadow-md">{task.titulo}</span>
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison para otimizar ainda mais
    return (
        prevProps.task.id === nextProps.task.id &&
        prevProps.task.titulo === nextProps.task.titulo &&
        prevProps.task.status === nextProps.task.status &&
        prevProps.task.start_date === nextProps.task.start_date &&
        prevProps.task.data_vencimento === nextProps.task.data_vencimento &&
        prevProps.task.responsavel?.avatar_url === nextProps.task.responsavel?.avatar_url &&
        prevProps.isDragging === nextProps.isDragging &&
        prevProps.styles.x === nextProps.styles.x &&
        prevProps.styles.width === nextProps.styles.width
    );
});

TaskRow.displayName = 'TaskRow';

// Split into sub-component to handle complex logic cleaner
function ProjectTimelineContent({
    projectId,
    tasks,
    updateTarefa
}: {
    projectId: string;
    tasks: Tarefa[];
    updateTarefa: ReturnType<typeof useUpdateTarefa>['mutate'];
}) {
    const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Drag State
    const [dragState, setDragState] = useState<{
        taskId: string;
        startX: number;
        currentX: number;
        originalStart: Date;
    } | null>(null);

    // Memoizar cálculos de datas - não recalcula em cada render
    const today = useMemo(() => new Date(), []);
    const days = useMemo(() => {
        const startDate = startOfWeek(today);
        const endDate = addDays(startDate, 30);
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [today]);

    const startDate = useMemo(() => startOfWeek(today), [today]);

    const COL_WIDTH = 40;
    const ROW_HEIGHT = 48;

    const handleTaskClick = useCallback((task: Tarefa) => {
        if (dragState) return; // Don't open modal if dragging
        setSelectedTarefa(task);
        setIsModalOpen(true);
    }, [dragState]);

    const onMouseDown = useCallback((e: React.MouseEvent, task: Tarefa) => {
        // Only left click
        if (e.button !== 0) return;

        e.preventDefault();
        e.stopPropagation();

        const taskStart = task.start_date ? new Date(task.start_date) : new Date(task.created_at);

        setDragState({
            taskId: task.id,
            startX: e.clientX,
            currentX: e.clientX,
            originalStart: taskStart
        });

        const onMouseMove = (moveEvent: MouseEvent) => {
            setDragState(prev => prev ? ({ ...prev, currentX: moveEvent.clientX }) : null);
        };

        const onMouseUp = (upEvent: MouseEvent) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            setDragState(current => {
                if (!current) return null;

                const diffX = upEvent.clientX - current.startX;
                const daysDiff = Math.round(diffX / COL_WIDTH);

                if (daysDiff !== 0) {
                    const newStart = addDays(current.originalStart, daysDiff);
                    const task = tasks.find(t => t.id === current.taskId);

                    if (task) {
                        const originalStart = task.start_date ? new Date(task.start_date) : new Date(task.created_at);
                        const originalEnd = task.data_vencimento ? new Date(task.data_vencimento) : addDays(originalStart, 1);
                        const duration = differenceInDays(originalEnd, originalStart);
                        const newEnd = addDays(newStart, duration);

                        updateTarefa.mutate({
                            id: task.id,
                            start_date: newStart.toISOString(),
                            data_vencimento: newEnd.toISOString()
                        });
                    }
                }
                return null;
            });
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [tasks, updateTarefa, COL_WIDTH]);

    // Memoizar coordenadas das tarefas - só recalcula quando tasks ou dragState mudam
    const taskCoordinates = useMemo(() => {
        const coords = new Map<string, { x: number; y: number; width: number; height: number }>();

        tasks.forEach((task, index) => {
            let taskStart = task.start_date ? new Date(task.start_date) : new Date(task.created_at);
            let taskEnd = task.data_vencimento ? new Date(task.data_vencimento) : addDays(taskStart, 1);

            // If dragging this task, calculate temporary position
            if (dragState && dragState.taskId === task.id) {
                const diffX = dragState.currentX - dragState.startX;
                const daysDiff = Math.round(diffX / COL_WIDTH);
                taskStart = addDays(taskStart, daysDiff);
                const duration = differenceInDays(taskEnd, (task.start_date ? new Date(task.start_date) : new Date(task.created_at)));
                taskEnd = addDays(taskStart, duration);
            }

            const daysFromStart = differenceInDays(taskStart, startDate);
            const duration = Math.max(1, differenceInDays(taskEnd, taskStart) + 1);

            coords.set(task.id, {
                x: Math.max(0, daysFromStart * COL_WIDTH),
                y: index * ROW_HEIGHT + (ROW_HEIGHT - 32) / 2,
                width: duration * COL_WIDTH,
                height: 32
            });
        });

        return coords;
    }, [tasks, dragState, startDate, COL_WIDTH, ROW_HEIGHT]);

    // Memoizar linhas de dependência - só recalcula quando taskCoordinates muda
    const dependencyLines = useMemo(() => {
        const lines: React.ReactNode[] = [];

        tasks.forEach((task) => {
            if (task.dependencies && task.dependencies.length > 0) {
                const taskCoords = taskCoordinates.get(task.id);

                if (!taskCoords) return;

                task.dependencies.forEach(depId => {
                    const depTask = tasks.find(t => t.id === depId);
                    const depCoords = depTask ? taskCoordinates.get(depId) : null;

                    if (depCoords) {
                        const startX = depCoords.x + depCoords.width;
                        const startY = depCoords.y + depCoords.height / 2;
                        const endX = taskCoords.x;
                        const endY = taskCoords.y + taskCoords.height / 2;

                        const path = `M ${startX} ${startY} C ${startX + 20} ${startY}, ${endX - 20} ${endY}, ${endX} ${endY}`;

                        lines.push(
                            <path
                                key={`${depId}-${task.id}`}
                                d={path}
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth="2"
                                markerEnd="url(#arrowhead)"
                                className="opacity-50 hover:opacity-100 transition-opacity"
                            />
                        );
                    }
                });
            }
        });

        return lines;
    }, [tasks, taskCoordinates]);

    return (
        <>
            <Card className="h-full flex flex-col border-none shadow-none">
                <ScrollArea className="flex-1 w-full whitespace-nowrap rounded-md border">
                    <div className="flex flex-col min-w-[800px] relative select-none">
                        {/* Header Row (Days) */}
                        <div className="flex border-b h-10 sticky top-0 bg-muted/90 z-20">
                            <div className="w-64 shrink-0 border-r px-4 py-2 font-medium text-sm sticky left-0 bg-muted/90 z-20">
                                Tarefa
                            </div>
                            <div className="flex">
                                {days.map(day => (
                                    <div
                                        key={day.toISOString()}
                                        className={`w-[40px] shrink-0 border-r text-center text-xs py-2 flex flex-col items-center justify-center ${isSameDay(day, today) ? 'bg-primary/10' : ''}`}
                                    >
                                        <span className="font-bold">{format(day, 'dd', { locale: ptBR })}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase">{format(day, 'EEEEE', { locale: ptBR })}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Task Rows Container */}
                        <div className="relative">

                            {/* SVG Overlay for Dependencies */}
                            <svg className="absolute top-0 left-64 w-full h-full pointer-events-none z-10" style={{ width: `calc(100% - 256px)` }}>
                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                                    </marker>
                                </defs>
                                {dependencyLines}
                            </svg>

                            {/* Task Rows */}
                            <TooltipProvider>
                                <div className="space-y-[1px] bg-slate-100 dark:bg-slate-800">
                                    {tasks.map((task) => {
                                        const styles = taskCoordinates.get(task.id);
                                        const isDragging = dragState?.taskId === task.id;

                                        if (!styles) return null;

                                        return (
                                            <TaskRow
                                                key={task.id}
                                                task={task}
                                                styles={styles}
                                                isDragging={isDragging}
                                                days={days}
                                                onTaskClick={handleTaskClick}
                                                onMouseDown={onMouseDown}
                                            />
                                        );
                                    })}
                                </div>
                            </TooltipProvider>
                        </div>
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </Card>

            <TarefaModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                tarefa={selectedTarefa}
                defaultProjectId={projectId}
            />
        </>
    );
}
