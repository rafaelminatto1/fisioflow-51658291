import { useTarefas } from "@/hooks/useTarefas";
import { format, addDays, differenceInDays, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface ProjectTimelineProps {
    projectId: string;
}

export function ProjectTimeline({ projectId }: ProjectTimelineProps) {
    const { data: allTarefas, isLoading } = useTarefas();

    // Filter tasks for this project
    const tasks = allTarefas?.filter(t => t.project_id === projectId) || [];

    // Sort tasks by start date or created_at
    const sortedTasks = [...tasks].sort((a, b) => {
        const dateA = a.start_date || a.created_at;
        const dateB = b.start_date || b.created_at;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    if (isLoading) return <div>Carregando cronograma...</div>;
    if (sortedTasks.length === 0) return <div className="p-8 text-center text-muted-foreground">Nenhuma tarefa neste projeto.</div>;

    // Determine timeline range
    const today = new Date();
    const startDate = startOfWeek(today);
    const endDate = addDays(startDate, 30); // Show next 30 days window default
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const getTaskStyle = (task: any) => {
        const taskStart = task.start_date ? new Date(task.start_date) : new Date(task.created_at);
        const taskEnd = task.data_vencimento ? new Date(task.data_vencimento) : addDays(taskStart, 1);

        // Calculate position and width relative to the timeline window
        const daysFromStart = differenceInDays(taskStart, startDate);
        const duration = Math.max(1, differenceInDays(taskEnd, taskStart) + 1);

        const colWidth = 40; // px per day

        return {
            left: `${Math.max(0, daysFromStart * colWidth)}px`,
            width: `${duration * colWidth}px`,
        };
    };

    return (
        <Card className="h-full flex flex-col border-none shadow-none">
            <ScrollArea className="flex-1 w-full whitespace-nowrap rounded-md border">
                <div className="flex flex-col min-w-[800px]">
                    {/* Header Row (Days) */}
                    <div className="flex border-b h-10 sticky top-0 bg-muted/90 z-10">
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

                    {/* Task Rows */}
                    <div className="space-y-[1px] bg-slate-100 dark:bg-slate-800">
                        {sortedTasks.map(task => (
                            <div key={task.id} className="flex h-12 bg-background hover:bg-muted/30 group">
                                {/* Task Title Column */}
                                <div className="w-64 shrink-0 border-r px-4 py-2 flex items-center gap-2 sticky left-0 bg-background z-10 group-hover:bg-muted/30">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="truncate text-sm font-medium cursor-default">{task.titulo}</span>
                                            </TooltipTrigger>
                                            <TooltipContent>{task.titulo}</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>

                                {/* Timeline Bar Area */}
                                <div className="flex relative flex-1">
                                    {/* Grid Lines */}
                                    {days.map(day => (
                                        <div key={`grid-${day.toISOString()}`} className="w-[40px] shrink-0 border-r h-full" />
                                    ))}

                                    {/* Task Bar */}
                                    <div
                                        className={`absolute top-2 h-8 rounded-md shadow-sm border flex items-center px-2 text-xs text-white overflow-hidden whitespace-nowrap
                         ${task.status === 'CONCLUIDO' ? 'bg-green-500 border-green-600' :
                                                task.status === 'EM_PROGRESSO' ? 'bg-blue-500 border-blue-600' :
                                                    task.status === 'REVISAO' ? 'bg-yellow-500 border-yellow-600' : 'bg-slate-400 border-slate-500'}
                       `}
                                        style={getTaskStyle(task)}
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
                        ))}
                    </div>
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </Card>
    );
}
