import { useState, useMemo, Suspense, lazy } from 'react';
import {

  LayoutGrid,
  LayoutList,
  BarChart3,
  GanttChart,
  Plus,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Target,
  Zap,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, differenceInDays, addDays, subDays, startOfMonth, endOfMonth, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// safeFormat imported from @/lib/utils
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';




import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KanbanBoardV2 } from '@/components/tarefas/v2';
import { LazyTaskDetailModal, LazyTaskQuickCreateModal } from '@/components/tarefas/v2/LazyComponents';
import { TaskTableVirtualized } from '@/components/tarefas/virtualized/TaskTableVirtualized';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import {
  Tarefa,
  TarefaStatus,
  TarefaPrioridade,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORIDADE_LABELS,
  TaskStats
} from '@/types/tarefas';
import { useTarefas, useDeleteTarefa } from '@/hooks/useTarefas';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useTarefas, useDeleteTarefa } from '@/hooks/useTarefas';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { cn, safeFormat } from '@/lib/utils';
// Recharts imports removed - moved to TaskInsights

const TaskInsights = lazy(() => import('@/components/tarefas/v2/TaskInsights'));

type ViewMode = 'kanban' | 'table' | 'timeline' | 'insights';

// Mock data para teste quando não houver dados reais
const MOCK_TAREFAS: Tarefa[] = [
  {
    id: 'mock-1',
    titulo: 'Preparar plano de tratamento para paciente com lombalgia',
    descricao: 'Elaborar protocolo de exercícios para fortalecimento core',
    status: 'BACKLOG',
    prioridade: 'ALTA',
    tipo: 'AVALIACAO',
    tags: ['fisioterapia', 'coluna', 'ortopedia'],
    data_vencimento: addDays(new Date(), 3).toISOString(),
    created_at: subDays(new Date(), 5).toISOString(),
    project_id: null,
    responsavel: {
      id: 'user-1',
      full_name: 'Rafael Minatto',
      email: 'rafael.minatto@yahoo.com.br',
      avatar_url: null
    },
    assignees: [],
    checklists: [],
    attachments: [],
    references: [],
    comments: [],
    subtasks: [],
    dependencies: [],
    blocking: [],
    color: null,
    cover_image: null,
    start_date: null,
    completed_at: null,
    due_date: null,
    order_index: 0,
    parent_id: null,
    recurrent: false,
    recurrence_rule: null,
    estimated_hours: null,
    actual_hours: null,
    location: null,
    checklist_progress: null
  },
  {
    id: 'mock-2',
    titulo: 'Avaliar evolução do paciente João Silva',
    descricao: 'Revisar progresso após 4 sessões de fisioterapia',
    status: 'A_FAZER',
    prioridade: 'MEDIA',
    tipo: 'CONSULTA',
    tags: ['avaliação', 'progresso'],
    data_vencimento: addDays(new Date(), 1).toISOString(),
    created_at: subDays(new Date(), 2).toISOString(),
    project_id: null,
    responsavel: {
      id: 'user-1',
      full_name: 'Rafael Minatto',
      email: 'rafael.minatto@yahoo.com.br',
      avatar_url: null
    },
    assignees: [],
    checklists: [
      {
        id: 'check-1',
        title: 'Itens de avaliação',
        items: [
          { id: 'item-1', text: 'Verificar amplitude de movimento', completed: true },
          { id: 'item-2', text: 'Avaliar dor', completed: true },
          { id: 'item-3', text: 'Testar força muscular', completed: false }
        ]
      }
    ],
    attachments: [],
    references: [],
    comments: [],
    subtasks: [],
    dependencies: [],
    blocking: [],
    color: null,
    cover_image: null,
    start_date: null,
    completed_at: null,
    due_date: null,
    order_index: 1,
    parent_id: null,
    recurrent: false,
    recurrence_rule: null,
    estimated_hours: 1,
    actual_hours: null,
    location: null,
    checklist_progress: null
  },
  {
    id: 'mock-3',
    titulo: 'Atualizar prontuário do paciente Maria Santos',
    descricao: 'Registrar evolução da sessão de hoje',
    status: 'EM_PROGRESSO',
    prioridade: 'BAIXA',
    tipo: 'DOCUMENTACAO',
    tags: ['prontuário', 'documentação'],
    data_vencimento: new Date().toISOString(),
    created_at: subDays(new Date(), 1).toISOString(),
    project_id: null,
    responsavel: {
      id: 'user-1',
      full_name: 'Rafael Minatto',
      email: 'rafael.minatto@yahoo.com.br',
      avatar_url: null
    },
    assignees: [],
    checklists: [],
    attachments: [{ id: 'att-1', name: 'exame-raio-x.jpg', url: '/mock/files/exame.jpg', size: 1024000 }],
    references: [{ id: 'ref-1', title: 'Protocolo de Avaliação Lumbar', url: 'https://example.com' }],
    comments: [{ id: 'comm-1', text: 'Lembre de atualizar os exercícios prescritos', author: 'Rafael Minatto', created_at: new Date().toISOString() }],
    subtasks: [],
    dependencies: [],
    blocking: [],
    color: '#3b82f6',
    cover_image: null,
    start_date: subDays(new Date(), 1).toISOString(),
    completed_at: null,
    due_date: null,
    order_index: 2,
    parent_id: null,
    recurrent: false,
    recurrence_rule: null,
    estimated_hours: 0.5,
    actual_hours: null,
    location: 'Consultório 1',
    checklist_progress: null
  },
  {
    id: 'mock-4',
    titulo: 'Reunião com equipe multidisciplinar',
    descricao: 'Discutir casos complexos do mês',
    status: 'EM_PROGRESSO',
    prioridade: 'ALTA',
    tipo: 'REUNIAO',
    tags: ['equipe', 'multidisciplinar'],
    data_vencimento: addDays(new Date(), 2).toISOString(),
    created_at: subDays(new Date(), 3).toISOString(),
    project_id: null,
    responsavel: {
      id: 'user-1',
      full_name: 'Rafael Minatto',
      email: 'rafael.minatto@yahoo.com.br',
      avatar_url: null
    },
    assignees: [],
    checklists: [],
    attachments: [],
    references: [],
    comments: [],
    subtasks: [],
    dependencies: [],
    blocking: [],
    color: '#a855f7',
    cover_image: null,
    start_date: new Date().toISOString(),
    completed_at: null,
    due_date: null,
    order_index: 3,
    parent_id: null,
    recurrent: false,
    recurrence_rule: null,
    estimated_hours: 2,
    actual_hours: null,
    location: 'Sala de Reunião',
    checklist_progress: null
  },
  {
    id: 'mock-5',
    titulo: 'Revisar literatura sobre fisioterapia esportiva',
    descricao: 'Pesquisar artigos recentes sobre reabilitação de atletas',
    status: 'REVISAO',
    prioridade: 'MEDIA',
    tipo: 'PESQUISA',
    tags: ['pesquisa', 'esporte', 'atletas'],
    data_vencimento: addDays(new Date(), 5).toISOString(),
    created_at: subDays(new Date(), 7).toISOString(),
    project_id: null,
    responsavel: {
      id: 'user-1',
      full_name: 'Rafael Minatto',
      email: 'rafael.minatto@yahoo.com.br',
      avatar_url: null
    },
    assignees: [],
    checklists: [],
    attachments: [],
    references: [
      { id: 'ref-1', title: 'Journal of Orthopedic & Sports Physical Therapy', url: 'https://example.com' },
      { id: 'ref-2', title: 'Physical Therapy in Sport', url: 'https://example.com' }
    ],
    comments: [],
    subtasks: [],
    dependencies: [],
    blocking: [],
    color: null,
    cover_image: null,
    start_date: null,
    completed_at: null,
    due_date: null,
    order_index: 4,
    parent_id: null,
    recurrent: false,
    recurrence_rule: null,
    estimated_hours: 3,
    actual_hours: 1.5,
    location: null,
    checklist_progress: null
  },
  {
    id: 'mock-6',
    titulo: 'Organizar estoque de materiais',
    descricao: 'Verificar e repor materiais de consumo do consultório',
    status: 'CONCLUIDO',
    prioridade: 'BAIXA',
    tipo: 'ADMINISTRATIVO',
    tags: ['estoque', 'materiais'],
    data_vencimento: subDays(new Date(), 2).toISOString(),
    created_at: subDays(new Date(), 5).toISOString(),
    project_id: null,
    responsavel: {
      id: 'user-1',
      full_name: 'Rafael Minatto',
      email: 'rafael.minatto@yahoo.com.br',
      avatar_url: null
    },
    assignees: [],
    checklists: [],
    attachments: [],
    references: [],
    comments: [],
    subtasks: [],
    dependencies: [],
    blocking: [],
    color: null,
    cover_image: null,
    start_date: subDays(new Date(), 5).toISOString(),
    completed_at: subDays(new Date(), 1).toISOString(),
    due_date: null,
    order_index: 5,
    parent_id: null,
    recurrent: false,
    recurrence_rule: null,
    estimated_hours: 1,
    actual_hours: 1.5,
    location: null,
    checklist_progress: null
  },
  {
    id: 'mock-7',
    titulo: 'Curso de atualização em terapia manual',
    descricao: 'Participar do curso online de 20 horas',
    status: 'A_FAZER',
    prioridade: 'MEDIA',
    tipo: 'CAPACITACAO',
    tags: ['curso', 'terapia manual', 'capacitação'],
    data_vencimento: addDays(new Date(), 15).toISOString(),
    created_at: subDays(new Date(), 10).toISOString(),
    project_id: null,
    responsavel: {
      id: 'user-1',
      full_name: 'Rafael Minatto',
      email: 'rafael.minatto@yahoo.com.br',
      avatar_url: null
    },
    assignees: [],
    checklists: [
      {
        id: 'check-2',
        title: 'Módulos do curso',
        items: [
          { id: 'item-1', text: 'Módulo 1: Introdução', completed: true },
          { id: 'item-2', text: 'Módulo 2: Técnicas básicas', completed: true },
          { id: 'item-3', text: 'Módulo 3: Técnicas avançadas', completed: false },
          { id: 'item-4', text: 'Módulo 4: Casos clínicos', completed: false }
        ]
      }
    ],
    attachments: [],
    references: [],
    comments: [],
    subtasks: [],
    dependencies: [],
    blocking: [],
    color: '#f59e0b',
    cover_image: null,
    start_date: null,
    completed_at: null,
    due_date: null,
    order_index: 6,
    parent_id: null,
    recurrent: false,
    recurrence_rule: null,
    estimated_hours: 20,
    actual_hours: 5,
    location: null,
    checklist_progress: null
  },
  {
    id: 'mock-8',
    titulo: 'Ligar para paciente para confirmar consulta',
    descricao: 'Confirmar consulta de amanhã às 14h',
    status: 'BACKLOG',
    prioridade: 'ALTA',
    tipo: 'COMUNICACAO',
    tags: ['contato', 'confirmação'],
    data_vencimento: new Date().toISOString(),
    created_at: new Date().toISOString(),
    project_id: null,
    responsavel: {
      id: 'user-1',
      full_name: 'Rafael Minatto',
      email: 'rafael.minatto@yahoo.com.br',
      avatar_url: null
    },
    assignees: [],
    checklists: [],
    attachments: [],
    references: [],
    comments: [],
    subtasks: [],
    dependencies: [],
    blocking: [],
    color: '#ef4444',
    cover_image: null,
    start_date: null,
    completed_at: null,
    due_date: null,
    order_index: 7,
    parent_id: null,
    recurrent: false,
    recurrence_rule: null,
    estimated_hours: 0.25,
    actual_hours: null,
    location: null,
    checklist_progress: null
  },
  {
    id: 'mock-9',
    titulo: 'Preparar material educativo para paciente',
    descricao: 'Criar folheto com exercícios domiciliares',
    status: 'EM_PROGRESSO',
    prioridade: 'MEDIA',
    tipo: 'EDUCACAO',
    tags: ['educação', 'exercícios', 'domiciliar'],
    data_vencimento: addDays(new Date(), 4).toISOString(),
    created_at: subDays(new Date(), 4).toISOString(),
    project_id: null,
    responsavel: {
      id: 'user-1',
      full_name: 'Rafael Minatto',
      email: 'rafael.minatto@yahoo.com.br',
      avatar_url: null
    },
    assignees: [],
    checklists: [],
    attachments: [],
    references: [],
    comments: [],
    subtasks: [
      { id: 'sub-1', text: 'Selecionar exercícios', completed: true, status: 'CONCLUIDO' },
      { id: 'sub-2', text: 'Criar diagramas', completed: false, status: 'A_FAZER' },
      { id: 'sub-3', text: 'Revisar texto', completed: false, status: 'BACKLOG' }
    ],
    dependencies: [],
    blocking: [],
    color: '#06b6d4',
    cover_image: null,
    start_date: subDays(new Date(), 4).toISOString(),
    completed_at: null,
    due_date: null,
    order_index: 8,
    parent_id: null,
    recurrent: false,
    recurrence_rule: null,
    estimated_hours: 2,
    actual_hours: 1,
    location: null,
    checklist_progress: null
  }
];

export default function TarefasV2() {
  const { data: tarefas, isLoading, refetch } = useTarefas();
  const { data: teamMembers } = useTeamMembers();
  const deleteTarefa = useDeleteTarefa();

  // Use mock data when no real data is available
  const effectiveTarefas = useMemo(() => {
    if (!tarefas || tarefas.length === 0) {
      return MOCK_TAREFAS;
    }
    return tarefas;
  }, [tarefas]);

  // Check if using mock data
  const usingMockData = !tarefas || tarefas.length === 0;

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
    if (!effectiveTarefas) return null;

    const today = new Date();
    const weekAgo = subDays(today, 7);

    const byStatus = effectiveTarefas.reduce((acc, t) => {
      if (t && t.status) {
        acc[t.status] = (acc[t.status] || 0) + 1;
      }
      return acc;
    }, {} as Record<TarefaStatus, number>);

    const byPriority = effectiveTarefas.reduce((acc, t) => {
      if (t && t.prioridade) {
        acc[t.prioridade] = (acc[t.prioridade] || 0) + 1;
      }
      return acc;
    }, {} as Record<TarefaPrioridade, number>);

    const byType = effectiveTarefas.reduce((acc, t) => {
      if (t) {
        const tipo = t.tipo || 'TAREFA';
        acc[tipo] = (acc[tipo] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const overdue = effectiveTarefas.filter(t =>
      t.data_vencimento &&
      new Date(t.data_vencimento) < today &&
      t.status !== 'CONCLUIDO' &&
      t.status !== 'ARQUIVADO'
    ).length;

    const dueSoon = effectiveTarefas.filter(t => {
      if (!t.data_vencimento || t.status === 'CONCLUIDO' || t.status === 'ARQUIVADO') return false;
      const dueDate = new Date(t.data_vencimento);
      const daysUntil = differenceInDays(dueDate, today);
      return daysUntil >= 0 && daysUntil <= 3;
    }).length;

    const completedThisWeek = effectiveTarefas.filter(t =>
      t.completed_at && new Date(t.completed_at) >= weekAgo
    ).length;

    const completedTotal = byStatus['CONCLUIDO'] || 0;
    const completionRate = effectiveTarefas.length > 0 ? (completedTotal / effectiveTarefas.length) * 100 : 0;

    // Average cycle time (days from creation to completion)
    const completedTasks = effectiveTarefas.filter(t => t.completed_at && t.created_at);
    const avgCycleTime = completedTasks.length > 0
      ? completedTasks.reduce((acc, t) => {
        return acc + differenceInDays(new Date(t.completed_at!), new Date(t.created_at));
      }, 0) / completedTasks.length
      : 0;

    return {
      total: effectiveTarefas.length,
      by_status: byStatus,
      by_priority: byPriority,
      by_type: byType,
      overdue,
      due_soon: dueSoon,
      completed_this_week: completedThisWeek,
      completion_rate: completionRate,
      average_cycle_time: avgCycleTime
    };
  }, [effectiveTarefas]);

  // Filtered tasks
  const filteredTarefas = useMemo(() => {
    if (!effectiveTarefas) return [];
    if (!searchTerm) return effectiveTarefas;

    const search = searchTerm.toLowerCase();
    return effectiveTarefas.filter(t =>
      t.titulo.toLowerCase().includes(search) ||
      (t.descricao && t.descricao.toLowerCase().includes(search)) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(search)))
    );
  }, [effectiveTarefas, searchTerm]);

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
      if (t && t.status && groups[t.status]) {
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

  // Chart data calculation moved to TaskInsights


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

  // Show loading skeleton only if we don't have mock data ready yet
  // (isLoading && !usingMockData) means we're waiting for real data with no fallback
  if (isLoading && !usingMockData) {
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
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">Tarefas V2</h1>
                  {usingMockData && (
                    <Badge variant="outline" className="text-xs">
                      📊 Dados de Demonstração
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Gerenciamento avançado de tarefas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {usingMockData && (
                <Badge variant="secondary" className="hidden md:inline-flex">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Modo Demo
                </Badge>
              )}
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
            <KanbanBoardV2 tarefas={effectiveTarefas} />
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <Card>
              {/* Table Header */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-2 mb-3">
                  {Object.entries(groupedTasks || {}).filter(([status]) => status !== 'ARQUIVADO').map(([status, tasks]) => (
                    <div
                      key={`header-${status}`}
                      className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
                      onClick={() => toggleGroup(status as TarefaStatus)}
                    >
                      {expandedGroups.has(status) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <div className={cn('h-3 w-3 rounded-full', STATUS_COLORS[status as TarefaStatus]?.dot)} />
                      <span className="font-medium text-sm">{STATUS_LABELS[status as TarefaStatus]}</span>
                      <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Virtualized Table */}
              <ScrollArea className="h-[calc(100vh-450px)]">
                <TaskTableVirtualized
                  tasks={Object.entries(groupedTasks || {})
                    .filter(([status]) => expandedGroups.has(status))
                    .flatMap(([, tasks]) => tasks)}
                  selectedTasks={selectedTasks}
                  toggleTaskSelection={toggleTaskSelection}
                  onViewTask={handleViewTask}
                  onEditTask={handleViewTask}
                  onDeleteTask={handleDeleteTask}
                  onDuplicateTask={(tarefa) => console.log('Duplicate task:', tarefa)}
                  onArchiveTask={(id) => console.log('Archive task:', id)}
                />
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
                            safeFormat(day, 'yyyy-MM-dd') === safeFormat(new Date(), 'yyyy-MM-dd') && 'bg-primary/10'
                          )}
                        >
                          <div className="font-medium">{safeFormat(day, 'EEE')}</div>
                          <div className="text-muted-foreground">{safeFormat(day, 'dd')}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timeline Rows */}
                  {timelineData.tasks.map((tarefa) => {
                    const startDate = tarefa.start_date ? new Date(tarefa.start_date) : null;
                    const endDate = tarefa.data_vencimento ? new Date(tarefa.data_vencimento) : null;
                    const statusConfig = STATUS_COLORS[tarefa.status] || { dot: 'bg-gray-400' };

                    return (
                      <div
                        key={tarefa.id}
                        className="flex border-b hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleViewTask(tarefa)}
                      >
                        <div className="w-64 p-2 border-r shrink-0">
                          <div className="flex items-center gap-2">
                            <div className={cn('h-2 w-2 rounded-full shrink-0', statusConfig.dot)} />
                            <span className="text-sm truncate">{tarefa.titulo}</span>
                          </div>
                        </div>
                        <div className="flex flex-1 relative">
                          {timelineData.days.map((day, i) => {
                            const dayStr = safeFormat(day, 'yyyy-MM-dd');
                            const isStartValid = startDate && isValid(startDate);
                            const isEndValid = endDate && isValid(endDate);

                            const isInRange = (isStartValid || isEndValid) && (
                              (isStartValid && isEndValid && isWithinInterval(day, { start: startDate, end: endDate })) ||
                              (isStartValid && !isEndValid && dayStr === safeFormat(startDate, 'yyyy-MM-dd')) ||
                              (!isStartValid && isEndValid && dayStr === safeFormat(endDate, 'yyyy-MM-dd'))
                            );

                            const isStart = isStartValid && dayStr === safeFormat(startDate, 'yyyy-MM-dd');
                            const isEnd = isEndValid && dayStr === safeFormat(endDate, 'yyyy-MM-dd');

                            return (
                              <div
                                key={i}
                                className={cn(
                                  'flex-1 min-w-12 h-10 border-r relative',
                                  safeFormat(day, 'yyyy-MM-dd') === safeFormat(new Date(), 'yyyy-MM-dd') && 'bg-primary/5'
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
            <Suspense fallback={<LoadingSkeleton type="card" className="h-[500px] w-full" />}>
              <TaskInsights stats={stats} effectiveTarefas={effectiveTarefas} />
            </Suspense>
          )}
        </div>
      </div>

      {/* Modals */}
      <Suspense fallback={<LoadingSkeleton type="card" className="w-full h-64" />}>
        <LazyTaskQuickCreateModal
          open={quickCreateOpen}
          onOpenChange={setQuickCreateOpen}
          defaultStatus="A_FAZER"
        />
      </Suspense>

      <Suspense fallback={<LoadingSkeleton type="card" className="w-full h-64" />}>
        <LazyTaskDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          tarefa={selectedTarefa}
          teamMembers={teamMembers || []}
        />
      </Suspense>
    </MainLayout>
  );
}
