import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, Calendar, Users } from 'lucide-react';

interface PatientAnalyticsProps {
  totalPatients: number;
  classificationStats: {
    active: number;
    inactive7: number;
    inactive30: number;
    inactive60: number;
    noShowRisk: number;
    hasUnpaid: number;
    newPatients: number;
    completed: number;
  };
}

const chartConfig = {
  active: {
    label: 'Ativos',
    color: '#10b981',
  },
  inactive7: {
    label: 'Inativos 7d',
    color: '#f59e0b',
  },
  inactive30: {
    label: 'Inativos 30d',
    color: '#ef4444',
  },
  inactive60: {
    label: 'Inativos 60d+',
    color: '#6b7280',
  },
  noShowRisk: {
    label: 'Risco No-Show',
    color: '#f97316',
  },
  hasUnpaid: {
    label: 'Com Pendências',
    color: '#eab308',
  },
  newPatients: {
    label: 'Novos',
    color: '#3b82f6',
  },
  completed: {
    label: 'Concluídos',
    color: '#22c55e',
  },
};

export function PatientAnalytics({ totalPatients, classificationStats }: PatientAnalyticsProps) {
  // Dados para o gráfico de barras - Distribuição de Classificações
  const classificationData = [
    { name: 'Ativos', value: classificationStats.active, fill: chartConfig.active.color },
    { name: 'Inativos 7d', value: classificationStats.inactive7, fill: chartConfig.inactive7.color },
    { name: 'Inativos 30d', value: classificationStats.inactive30, fill: chartConfig.inactive30.color },
    { name: 'Inativos 60d+', value: classificationStats.inactive60, fill: chartConfig.inactive60.color },
    { name: 'Risco No-Show', value: classificationStats.noShowRisk, fill: chartConfig.noShowRisk.color },
    { name: 'Com Pendências', value: classificationStats.hasUnpaid, fill: chartConfig.hasUnpaid.color },
    { name: 'Novos', value: classificationStats.newPatients, fill: chartConfig.newPatients.color },
  ];

  // Dados para o gráfico de pizza - Visão Geral
  const overviewData = [
    { name: 'Ativos', value: classificationStats.active, color: chartConfig.active.color },
    { name: 'Inativos', value: classificationStats.inactive7 + classificationStats.inactive30 + classificationStats.inactive60, color: chartConfig.inactive30.color },
    { name: 'Concluídos', value: classificationStats.completed, color: chartConfig.completed.color },
    { name: 'Novos', value: classificationStats.newPatients, color: chartConfig.newPatients.color },
  ];

  // Dados para o gráfico de linha - Tendência de Inatividade
  const inactivityData = [
    { periodo: '7 dias', quantidade: classificationStats.inactive7 },
    { periodo: '30 dias', quantidade: classificationStats.inactive30 },
    { periodo: '60 dias+', quantidade: classificationStats.inactive60 },
  ];

  // Calcular porcentagens
  const activePercentage = totalPatients > 0 ? ((classificationStats.active / totalPatients) * 100).toFixed(1) : '0';
  const riskPercentage = totalPatients > 0 ? (((classificationStats.noShowRisk + classificationStats.hasUnpaid) / totalPatients) * 100).toFixed(1) : '0';
  const newPatientsPercentage = totalPatients > 0 ? ((classificationStats.newPatients / totalPatients) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Atividade</p>
                <p className="text-2xl font-bold">{activePercentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Risco de Perda</p>
                <p className="text-2xl font-bold">{riskPercentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Novos Pacientes</p>
                <p className="text-2xl font-bold">{newPatientsPercentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico de Barras - Distribuição por Classificação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Distribuição por Classificação</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <BarChart data={classificationData}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Visão Geral */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Visão Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overviewData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {overviewData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Linha - Tendência de Inatividade */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Tendência de Inatividade</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <LineChart data={inactivityData}>
                <XAxis
                  dataKey="periodo"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="quantidade"
                  stroke={chartConfig.inactive30.color}
                  strokeWidth={2}
                  dot={{ fill: chartConfig.inactive30.color, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights e Recomendações */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Insights e Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {classificationStats.noShowRisk > 0 && (
            <div className="flex items-start gap-2 p-2 bg-orange-100 dark:bg-orange-900/20 rounded-md">
              <span className="text-orange-600 dark:text-orange-400">⚠️</span>
              <p>
                <strong>Ação Recomendada:</strong> Entre em contato com os {classificationStats.noShowRisk} pacientes com risco de no-show para reagendar sessões.
              </p>
            </div>
          )}

          {classificationStats.hasUnpaid > 0 && (
            <div className="flex items-start gap-2 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-md">
              <span className="text-yellow-600 dark:text-yellow-400">💰</span>
              <p>
                <strong>Atenção:</strong> {classificationStats.hasUnpaid} pacientes possuem sessões pagas e não compareceram. Considere entrar em contato.
              </p>
            </div>
          )}

          {classificationStats.inactive30 > 0 && (
            <div className="flex items-start gap-2 p-2 bg-red-100 dark:bg-red-900/20 rounded-md">
              <span className="text-red-600 dark:text-red-400">🔴</span>
              <p>
                <strong>Alerta:</strong> {classificationStats.inactive30} pacientes estão inativos há 30 dias ou mais. Considere fazer follow-up.
              </p>
            </div>
          )}

          {classificationStats.newPatients > 0 && classificationStats.newPatients <= 3 && (
            <div className="flex items-start gap-2 p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
              <span className="text-blue-600 dark:text-blue-400">📊</span>
              <p>
                <strong>Oportunidade:</strong> Há {classificationStats.newPatients} novos pacientes. Garanta um bom onboarding para melhorar a retenção.
              </p>
            </div>
          )}

          {parseFloat(activePercentage) > 70 && (
            <div className="flex items-start gap-2 p-2 bg-green-100 dark:bg-green-900/20 rounded-md">
              <span className="text-green-600 dark:text-green-400">✅</span>
              <p>
                <strong>Excelente!</strong> {activePercentage}% dos pacientes estão ativos. Continue mantendo o engajamento!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
