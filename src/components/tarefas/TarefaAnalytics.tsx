import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Clock, CheckCircle2, AlertCircle, Users, Target } from 'lucide-react';
import { Tarefa, TarefaStatus, PRIORIDADE_LABELS, TarefaPrioridade } from '@/hooks/useTarefas';
import { useMemo } from 'react';

const _COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

interface TarefaAnalyticsProps {
  tarefas: Tarefa[];
}

export function TarefaAnalytics({ tarefas }: TarefaAnalyticsProps) {
  // Calcular estatísticas
  const stats = useMemo(() => {
    const total = tarefas.length;
    const porStatus: Record<TarefaStatus, number> = {
      A_FAZER: 0,
      EM_PROGRESSO: 0,
      REVISAO: 0,
      CONCLUIDO: 0,
    };
    const porPrioridade: Record<TarefaPrioridade, number> = {
      BAIXA: 0,
      MEDIA: 0,
      ALTA: 0,
      URGENTE: 0,
    };
    const porResponsavel: Record<string, number> = {};
    const atrasadas = [];
    const hoje = new Date();

    tarefas.forEach(t => {
      porStatus[t.status]++;
      porPrioridade[t.prioridade]++;

      if (t.responsavel_id) {
        porResponsavel[t.responsavel_id] = (porResponsavel[t.responsavel_id] || 0) + 1;
      }

      // Verificar tarefas atrasadas
      if (t.data_vencimento && t.status !== 'CONCLUIDO') {
        const vencimento = new Date(t.data_vencimento);
        if (vencimento < hoje) {
          atrasadas.push(t);
        }
      }
    });

    const concluidas = porStatus.CONCLUIDO;
    const taxaConclusao = total > 0 ? (concluidas / total) * 100 : 0;

    return {
      total,
      porStatus,
      porPrioridade,
      porResponsavel,
      atrasadas: atrasadas.length,
      taxaConclusao,
    };
  }, [tarefas]);

  // Dados para gráficos
  const statusData = Object.entries(stats.porStatus).map(([status, count]) => ({
    name: status === 'A_FAZER' ? 'A Fazer' : status === 'EM_PROGRESSO' ? 'Em Progresso' : status === 'REVISAO' ? 'Revisão' : 'Concluído',
    value: count,
    color: status === 'CONCLUIDO' ? '#22c55e' : status === 'A_FAZER' ? '#6b7280' : status === 'EM_PROGRESSO' ? '#3b82f6' : '#f59e0b',
  }));

  const prioridadeData = Object.entries(stats.porPrioridade).map(([prioridade, count]) => ({
    name: PRIORIDADE_LABELS[prioridade as TarefaPrioridade],
    value: count,
  }));

  // Dados de evolução temporal (últimos 7 dias)
  const evolucaoData = useMemo(() => {
    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    return dias.map(dia => {
      const diaStr = dia.toISOString().split('T')[0];
      const criadasNesseDia = tarefas.filter(t => t.created_at?.startsWith(diaStr)).length;
      return {
        dia: dia.toLocaleDateString('pt-BR', { weekday: 'short' }),
        criadas: criadasNesseDia,
      };
    });
  }, [tarefas]);

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Total de Tarefas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.porStatus.CONCLUIDO}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.taxaConclusao.toFixed(1)}% do total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Em Progresso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.porStatus.EM_PROGRESSO}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.porStatus.REVISAO} em revisão</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.atrasadas > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
              {stats.atrasadas}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Fora do prazo</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tarefas por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Por Prioridade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tarefas por Prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={prioridadeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Evolução Semanal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={evolucaoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="criadas" name="Tarefas Criadas" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Progresso por Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progresso do Fluxo de Trabalho</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(stats.porStatus).map(([status, count]) => {
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
            const labels: Record<string, { name: string; color: string }> = {
              A_FAZER: { name: 'A Fazer', color: 'bg-muted' },
              EM_PROGRESSO: { name: 'Em Progresso', color: 'bg-blue-500' },
              REVISAO: { name: 'Revisão', color: 'bg-yellow-500' },
              CONCLUIDO: { name: 'Concluído', color: 'bg-green-500' },
            };
            const { name, color } = labels[status];

            return (
              <div key={status} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{name}</span>
                  <span className="text-muted-foreground">{count} tarefas</span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Insights de Produtividade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {stats.taxaConclusao >= 70 && (
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">Ótima taxa de conclusão!</p>
                <p className="text-green-600/70 dark:text-green-400/70">
                  Sua equipe está concluindo {stats.taxaConclusao.toFixed(0)}% das tarefas.
                </p>
              </div>
            </div>
          )}

          {stats.atrasadas > 0 && (
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">{stats.atrasadas} tarefas atrasadas</p>
                <p className="text-red-600/70 dark:text-red-400/70">
                  Considere repriorizar ou delegar essas tarefas.
                </p>
              </div>
            </div>
          )}

          {stats.porStatus.EM_PROGRESSO > stats.porStatus.CONCLUIDO && (
            <div className="flex items-start gap-2">
              <Clock className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-400">Muitas tarefas em andamento</p>
                <p className="text-yellow-600/70 dark:text-yellow-400/70">
                  Considere focar em concluir tarefas antes de iniciar novas.
                </p>
              </div>
            </div>
          )}

          {stats.total === 0 && (
            <div className="flex items-start gap-2">
              <Users className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-700 dark:text-blue-400">Comece organizando o trabalho</p>
                <p className="text-blue-600/70 dark:text-blue-400/70">
                  Crie tarefas para sua equipe e acompanhe o progresso aqui.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TarefaAnalytics;
