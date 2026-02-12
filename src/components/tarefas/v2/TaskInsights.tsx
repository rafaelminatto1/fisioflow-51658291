
import { useMemo } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area
} from 'recharts';
import {
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    AlertCircle,
    Zap,
    CheckCircle2,
    Target
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { cn, safeFormat } from '@/lib/utils';
import { subDays } from 'date-fns';
import {
    Tarefa,
    TarefaStatus,
    TarefaPrioridade,
    STATUS_LABELS,
    STATUS_COLORS,
    PRIORIDADE_LABELS,
    TaskStats
} from '@/types/tarefas';

interface TaskInsightsProps {
    stats: TaskStats;
    effectiveTarefas: Tarefa[];
}

export default function TaskInsights({ stats, effectiveTarefas }: TaskInsightsProps) {
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

        // Pre-filter tasks by date range for better performance
        const tasksByDate = effectiveTarefas?.reduce((acc, t) => {
            if (t && t.created_at) {
                const dateKey = t.created_at.split('T')[0];
                acc.created[dateKey] = (acc.created[dateKey] || 0) + 1;
            }
            if (t && t.completed_at) {
                const dateKey = t.completed_at.split('T')[0];
                acc.completed[dateKey] = (acc.completed[dateKey] || 0) + 1;
            }
            return acc;
        }, { created: {} as Record<string, number>, completed: {} as Record<string, number> }) || { created: {}, completed: {} };

        for (let i = 6; i >= 0; i--) {
            const date = subDays(today, i);
            const dateStr = safeFormat(date, 'yyyy-MM-dd');

            const created = tasksByDate.created[dateStr] || 0;
            const completed = tasksByDate.completed[dateStr] || 0;

            weeklyData.push({
                date: safeFormat(date, 'EEE'),
                criadas: created,
                concluidas: completed
            });
        }

        return { status: statusData, priority: priorityData, weekly: weeklyData };
    }, [stats, effectiveTarefas]);

    return (
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
                                <span className={cn('font-medium', stats.overdue > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300')}>
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
    );
}
