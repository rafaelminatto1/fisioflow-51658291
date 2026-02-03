import { useState, useMemo } from 'react';
import {
  LayoutGrid,
  LayoutList,
  Calendar as CalendarIcon,
  BarChart3,
  GanttChart,
  Plus,
  Filter,
  Download,
  Settings,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Target,
  Users,
  Zap,
  Calendar,
  Flag,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, differenceInDays, addDays, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KanbanBoardV2 } from '@/components/tarefas/v2';
import { TaskDetailModal } from '@/components/tarefas/v2/TaskDetailModal';
import { TaskQuickCreateModal } from '@/components/tarefas/v2/TaskQuickCreateModal';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import {
  Tarefa,
  TarefaStatus,
  TarefaPrioridade,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORIDADE_LABELS,
  PRIORIDADE_COLORS,
  TIPO_LABELS,
  TaskStats
} from '@/types/tarefas';
import { useTarefas, useDeleteTarefa } from '@/hooks/useTarefas';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from 'recharts';

type ViewMode = 'kanban' | 'table' | 'timeline' | 'insights';

export default function TarefasV2() {
  const { data: tarefas, isLoading, refetch } = useTarefas();
  const { data: teamMembers } = useTeamMembers();
  const deleteTarefa = useDeleteTarefa();

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['A_FAZER', 'EM_PROGRESSO', 'REVISAO']));
  const [timelineRange, setTimelineRange] = useState<'week' | 'month'>('week');
  const [isRefetching, setIsRefetching] = useState(false);

  // Calculate stats
  const stats = useMemo((): TaskStats | null => {
    if (!tarefas) return null;

    const today = new Date();
    const weekAgo = subDays(today, 7);

    const byStatus = tarefas.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<TarefaStatus, number>);

    const byPriority = tarefas.reduce((acc, t) => {
      acc[t.prioridade] = (acc[t.prioridade] || 0) + 1;
      return acc;
    }, {} as Record<TarefaPrioridade, number>);

    const byType = tarefas.reduce((acc, t) => {
      acc[t.tipo || 'TAREFA'] = (acc[t.tipo || 'TAREFA'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const overdue = tarefas.filter(t =>
      t.data_vencimento &&
      new Date(t.data_vencimento) < today &&
      t.status !== 'CONCLUIDO' &&
      t.status !== 'ARQUIVADO'
    ).length;

    const dueSoon = tarefas.filter(t => {
      if (!t.data_vencimento || t.status === 'CONCLUIDO' || t.status === 'ARQUIVADO') return false;
      const dueDate = new Date(t.data_vencimento);
      const daysUntil = differenceInDays(dueDate, today);
      return daysUntil >= 0 && daysUntil <= 3;
    }).length;

    const completedThisWeek = tarefas.filter(t =>
      t.completed_at && new Date(t.completed_at) >= weekAgo
    ).length;

    const completedTotal = byStatus['CONCLUIDO'] || 0;
    const completionRate = tarefas.length > 0 ? (completedTotal / tarefas.length) * 100 : 0;

    // Average cycle time (days from creation to completion)
    const completedTasks = tarefas.filter(t => t.completed_at && t.created_at);
    const avgCycleTime = completedTasks.length > 0
      ? completedTasks.reduce((acc, t) => {
        return acc + differenceInDays(new Date(t.completed_at!), new Date(t.created_at));
      }, 0) / completedTasks.length
      : 0;

    return {
      total: tarefas.length,
      by_status: byStatus,
      by_priority: byPriority,
      by_type: byType,
      overdue,
      due_soon: dueSoon,
      completed_this_week: completedThisWeek,
      completion_rate: completionRate,
      average_cycle_time: avgCycleTime
    };
  }, [tarefas]);

  // Filtered tasks
  const filteredTarefas = useMemo(() => {
    if (!tarefas) return [];
    if (!searchTerm) return tarefas;

    const search = searchTerm.toLowerCase();
    return tarefas.filter(t =>
      t.titulo.toLowerCase().includes(search) ||
      t.descricao?.toLowerCase().includes(search) ||
      t.tags?.some(tag => tag.toLowerCase().includes(search))
    );
  }, [tarefas, searchTerm]);

  // Group tasks by status for table view
  const groupedTasks = useMemo(() => {
    const groups: Record<TarefaStatus, Tarefa[]> = {
      BACKLOG: [],
      A_FAZER: [],
      EM_PROGRESSO: [],
      REVISAO: [],
      CONCLUIDO: [],
      ARQUIVADO: []
    };

    filteredTarefas.forEach(t => {
      if (groups[t.status]) {
        groups[t.status].push(t);
      }
    });

    return groups;
  }, [filteredTarefas]);

  // Timeline data
  const timelineData = useMemo(() => {
    const today = new Date();
    let start: Date, end: Date;

    if (timelineRange === 'week') {
      start = startOfWeek(today, { weekStartsOn: 1 });
      end = endOfWeek(today, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(today);
      end = endOfMonth(today);
    }

    const days = eachDayOfInterval({ start, end });

    return {
      days,
      tasks: filteredTarefas.filter(t => t.start_date || t.data_vencimento)
    };
  }, [filteredTarefas, timelineRange]);

  // Chart data for insights
  const chartData = useMemo(() => {
    if (!stats) return { status: [], priority: [], weekly: [] };

    const statusData = Object.entries(STATUS_LABELS)
      .filter(([key]) => key !== 'ARQUIVADO')
      .map(([key, label]) => ({
        name: label,
        value: stats.by_status[key as TarefaStatus] || 0,
        color: key === 'CONCLUIDO' ? '#22c55e' :
          key === 'EM_PROGRESSO' ? '#3b82f6' :
            key === 'REVISAO' ? '#a855f7' :
              key === 'A_FAZER' ? '#64748b' : '#94a3b8'
      }));

    const priorityData = Object.entries(PRIORIDADE_LABELS).map(([key, label]) => ({
      name: label,
      value: stats.by_priority[key as TarefaPrioridade] || 0
    }));

    // Weekly trend (last 7 days)
    const weeklyData = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const created = tarefas?.filter(t =>
        t.created_at?.startsWith(dateStr)
      ).length || 0;

      const completed = tarefas?.filter(t =>
        t.completed_at?.startsWith(dateStr)
      ).length || 0;

      weeklyData.push({
        date: format(date, 'EEE', { locale: ptBR }),
        criadas: created,
        concluidas: completed
      });
    }

    return { status: statusData, priority: priorityData, weekly: weeklyData };
  }, [stats, tarefas]);

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

  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <LayoutGrid className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Tarefas V2</h1>
                <p className="text-sm text-muted-foreground">
                  Gerenciamento avançado de tarefas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefetching}
              >
                <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
              </Button>
              <Button onClick={() => setQuickCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Tarefa
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
                      <p className="text-sm text-muted-foreground">Em Progresso</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {stats.by_status['EM_PROGRESSO'] || 0}
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
                      <p className="text-sm text-muted-foreground">Concluídas</p>
                      <p className="text-2xl font-bold text-green-600">
                        {stats.by_status['CONCLUIDO'] || 0}
                      </p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500/20" />
                  </div>
                </CardContent>
              </Card>

              <Card className={cn(stats.overdue > 0 && 'border-red-500/50')}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Atrasadas</p>
                      <p className={cn('text-2xl font-bold', stats.overdue > 0 ? 'text-red-600' : 'text-muted-foreground')}>
                        {stats.overdue}
                      </p>
                    </div>
                    <AlertCircle className={cn('h-8 w-8', stats.overdue > 0 ? 'text-red-500/20' : 'text-muted-foreground/20')} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Esta Semana</p>
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
                      <p className="text-sm text-muted-foreground">Taxa Conclusão</p>
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
                  className="pl-10"
                />
              </div>
            </div>

            {/* View Toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="kanban">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="table">
                  <LayoutList className="h-4 w-4 mr-2" />
                  Tabela
                </TabsTrigger>
                <TabsTrigger value="timeline">
                  <GanttChart className="h-4 w-4 mr-2" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="insights">
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
          {viewMode === 'kanban' && (
            <KanbanBoardV2 />
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <Card>
              <ScrollArea className="h-[calc(100vh-400px)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead className="w-32">Status</TableHead>
                      <TableHead className="w-28">Prioridade</TableHead>
                      <TableHead className="w-28">Tipo</TableHead>
                      <TableHead className="w-36">Responsável</TableHead>
                      <TableHead className="w-28">Prazo</TableHead>
                      <TableHead className="w-20">Progresso</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(Object.entries(groupedTasks) as [TarefaStatus, Tarefa[]][])
                      .filter(([status]) => status !== 'ARQUIVADO')
                      .map(([status, tasks]) => (
                        <>
                          {/* Group Header */}
                          <TableRow
                            key={`header-${status}`}
                            className="bg-muted/50 hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleGroup(status)}
                          >
                            <TableCell colSpan={10}>
                              <div className="flex items-center gap-2">
                                {expandedGroups.has(status) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <div className={cn('h-3 w-3 rounded-full', STATUS_COLORS[status].dot)} />
                                <span className="font-medium">{STATUS_LABELS[status]}</span>
                                <Badge variant="secondary">{tasks.length}</Badge>
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Tasks */}
                          {expandedGroups.has(status) && tasks.map((tarefa) => {
                            const isOverdue = tarefa.data_vencimento &&
                              new Date(tarefa.data_vencimento) < new Date() &&
                              tarefa.status !== 'CONCLUIDO';

                            const checklistProgress = (() => {
                              if (!tarefa.checklists?.length) return null;
                              const total = tarefa.checklists.reduce((acc, cl) => acc + cl.items.length, 0);
                              const done = tarefa.checklists.reduce((acc, cl) => acc + cl.items.filter(i => i.completed).length, 0);
                              return total > 0 ? Math.round((done / total) * 100) : null;
                            })();

                            return (
                              <TableRow
                                key={tarefa.id}
                                className="cursor-pointer"
                                onClick={() => handleViewTask(tarefa)}
                              >
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedTasks.has(tarefa.id)}
                                    onCheckedChange={() => toggleTaskSelection(tarefa.id)}
                                  />
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium line-clamp-1">{tarefa.titulo}</span>
                                    {tarefa.tags && tarefa.tags.length > 0 && (
                                      <div className="flex gap-1 mt-1">
                                        {tarefa.tags.slice(0, 2).map((tag, i) => (
                                          <Badge key={i} variant="outline" className="text-[10px] px-1 py-0">
                                            {tag}
                                          </Badge>
                                        ))}
                                        {tarefa.tags.length > 2 && (
                                          <span className="text-[10px] text-muted-foreground">
                                            +{tarefa.tags.length - 2}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={cn('text-xs', STATUS_COLORS[tarefa.status].bg, STATUS_COLORS[tarefa.status].text)}>
                                    {STATUS_LABELS[tarefa.status]}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={cn('text-xs', PRIORIDADE_COLORS[tarefa.prioridade])}>
                                    <Flag className="h-3 w-3 mr-1" />
                                    {PRIORIDADE_LABELS[tarefa.prioridade]}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {TIPO_LABELS[tarefa.tipo || 'TAREFA']}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {tarefa.responsavel ? (
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={tarefa.responsavel.avatar_url} />
                                        <AvatarFallback className="text-[10px]">
                                          {tarefa.responsavel.full_name?.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm truncate max-w-20">
                                        {tarefa.responsavel.full_name}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {tarefa.data_vencimento ? (
                                    <span className={cn(
                                      'text-sm',
                                      isOverdue && 'text-red-500 font-medium'
                                    )}>
                                      {format(new Date(tarefa.data_vencimento), 'dd/MM/yyyy')}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {checklistProgress !== null ? (
                                    <div className="flex items-center gap-2">
                                      <Progress value={checklistProgress} className="h-2 w-12" />
                                      <span className="text-xs text-muted-foreground">{checklistProgress}%</span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleViewTask(tarefa)}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Ver
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleViewTask(tarefa)}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteTask(tarefa.id)}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Excluir
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </>
                      ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          )}

          {/* Timeline View */}
          {viewMode === 'timeline' && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Timeline de Tarefas</CardTitle>
                  <Select value={timelineRange} onValueChange={(v) => setTimelineRange(v as 'week' | 'month')}>
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
                            'flex-1 min-w-12 p-2 text-center border-r text-xs',
                            format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && 'bg-primary/10'
                          )}
                        >
                          <div className="font-medium">{format(day, 'EEE', { locale: ptBR })}</div>
                          <div className="text-muted-foreground">{format(day, 'dd')}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timeline Rows */}
                  {timelineData.tasks.map((tarefa) => {
                    const startDate = tarefa.start_date ? new Date(tarefa.start_date) : null;
                    const endDate = tarefa.data_vencimento ? new Date(tarefa.data_vencimento) : null;

                    return (
                      <div
                        key={tarefa.id}
                        className="flex border-b hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleViewTask(tarefa)}
                      >
                        <div className="w-64 p-2 border-r shrink-0">
                          <div className="flex items-center gap-2">
                            <div className={cn('h-2 w-2 rounded-full shrink-0', STATUS_COLORS[tarefa.status].dot)} />
                            <span className="text-sm truncate">{tarefa.titulo}</span>
                          </div>
                        </div>
                        <div className="flex flex-1 relative">
                          {timelineData.days.map((day, i) => {
                            const dayStr = format(day, 'yyyy-MM-dd');
                            const isInRange = (startDate || endDate) && (
                              (startDate && endDate && isWithinInterval(day, { start: startDate, end: endDate })) ||
                              (startDate && !endDate && dayStr === format(startDate, 'yyyy-MM-dd')) ||
                              (!startDate && endDate && dayStr === format(endDate, 'yyyy-MM-dd'))
                            );

                            const isStart = startDate && dayStr === format(startDate, 'yyyy-MM-dd');
                            const isEnd = endDate && dayStr === format(endDate, 'yyyy-MM-dd');

                            return (
                              <div
                                key={i}
                                className={cn(
                                  'flex-1 min-w-12 h-10 border-r relative',
                                  format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && 'bg-primary/5'
                                )}
                              >
                                {isInRange && (
                                  <div
                                    className={cn(
                                      'absolute top-2 h-6',
                                      isStart ? 'left-0 rounded-l-full' : 'left-0',
                                      isEnd ? 'right-0 rounded-r-full' : 'right-0',
                                      tarefa.status === 'CONCLUIDO' ? 'bg-green-500/60' :
                                        tarefa.status === 'EM_PROGRESSO' ? 'bg-blue-500/60' :
                                          'bg-primary/40'
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
          {viewMode === 'insights' && stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={chartData.status}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {chartData.status.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Priority Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição por Prioridade</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData.priority} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <RechartsTooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Weekly Trend */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Tendência Semanal</CardTitle>
                  <CardDescription>Tarefas criadas vs. concluídas nos últimos 7 dias</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData.weekly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Area type="monotone" dataKey="criadas" name="Criadas" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="concluidas" name="Concluídas" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Performance Insights */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Insights de Produtividade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Completion Rate */}
                    <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                      <div className="flex items-center gap-2 mb-2">
                        {stats.completion_rate >= 50 ? (
                          <ArrowUpRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-5 w-5 text-red-600" />
                        )}
                        <span className="font-medium text-green-700 dark:text-green-400">Taxa de Conclusão</span>
                      </div>
                      <p className="text-3xl font-bold text-green-600">{stats.completion_rate.toFixed(0)}%</p>
                      <p className="text-sm text-green-600/70 mt-1">
                        {stats.by_status['CONCLUIDO'] || 0} de {stats.total} tarefas concluídas
                      </p>
                    </div>

                    {/* Average Cycle Time */}
                    <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-blue-700 dark:text-blue-400">Tempo Médio</span>
                      </div>
                      <p className="text-3xl font-bold text-blue-600">{stats.average_cycle_time.toFixed(1)} dias</p>
                      <p className="text-sm text-blue-600/70 mt-1">
                        Tempo médio para concluir tarefas
                      </p>
                    </div>

                    {/* Overdue Alert */}
                    <div className={cn(
                      'p-4 rounded-lg',
                      stats.overdue > 0
                        ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30'
                        : 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30'
                    )}>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className={cn('h-5 w-5', stats.overdue > 0 ? 'text-red-600' : 'text-gray-600')} />
                        <span className={cn('font-medium', stats.overdue > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-400')}>
                          Atenção Necessária
                        </span>
                      </div>
                      <p className={cn('text-3xl font-bold', stats.overdue > 0 ? 'text-red-600' : 'text-gray-600')}>
                        {stats.overdue + stats.due_soon}
                      </p>
                      <p className={cn('text-sm mt-1', stats.overdue > 0 ? 'text-red-600/70' : 'text-gray-600/70')}>
                        {stats.overdue} atrasadas, {stats.due_soon} vencem em breve
                      </p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="mt-6 space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      Recomendações
                    </h4>

                    {stats.overdue > 0 && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-700 dark:text-red-400">
                            {stats.overdue} tarefas atrasadas
                          </p>
                          <p className="text-sm text-red-600/70">
                            Considere repriorizar ou delegar essas tarefas para evitar acúmulo.
                          </p>
                        </div>
                      </div>
                    )}

                    {(stats.by_status['EM_PROGRESSO'] || 0) > 5 && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30">
                        <Clock className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-700 dark:text-yellow-400">
                            Muitas tarefas em progresso
                          </p>
                          <p className="text-sm text-yellow-600/70">
                            Focar em concluir tarefas antes de iniciar novas pode melhorar o fluxo de trabalho.
                          </p>
                        </div>
                      </div>
                    )}

                    {stats.completion_rate >= 70 && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-700 dark:text-green-400">
                            Excelente taxa de conclusão!
                          </p>
                          <p className="text-sm text-green-600/70">
                            Sua equipe está performando bem com {stats.completion_rate.toFixed(0)}% das tarefas concluídas.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <TaskQuickCreateModal
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        defaultStatus="A_FAZER"
      />

      <TaskDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        tarefa={selectedTarefa}
        teamMembers={teamMembers || []}
      />
    </MainLayout>
  );
}
