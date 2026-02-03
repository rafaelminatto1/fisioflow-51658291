import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { useClinicalInsights } from '@/hooks/useClinicalInsights';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, TrendingDown, Target, Activity } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const ClinicalInsightsDashboard = () => {
  const { data, isLoading, error } = useClinicalInsights();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive font-medium">Erro ao carregar insights clínicos.</p>
        </CardContent>
      </Card>
    );
  }

  const { goals, pathologies, painTrend } = data;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Resumo Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-500 rounded-lg text-white">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Média para Metas</p>
                <h3 className="text-2xl font-bold">
                  {goals.find(g => g.status === 'concluido')?.avg_days_to_achieve || 'N/A'} dias
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-500 rounded-lg text-white">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Patologias Ativas</p>
                <h3 className="text-2xl font-bold">
                  {pathologies.reduce((acc, curr) => acc + parseInt(acc + curr.patient_count), 0)}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-500 rounded-lg text-white">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Conclusão de Metas</p>
                <h3 className="text-2xl font-bold">
                  {Math.round((parseInt(goals.find(g => g.status === 'concluido')?.count || '0') / 
                    goals.reduce((acc, curr) => acc + parseInt(curr.count), 0)) * 100) || 0}%
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Patologias */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Principais Diagnósticos</CardTitle>
            <CardDescription>Distribuição de patologias ativas na clínica</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pathologies} layout="vertical" margin={{ left: 40, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 12 }} 
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px' }}
                  />
                  <Bar dataKey="patient_count" name="Pacientes" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Dor por Patologia */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              Severidade de Dor por Patologia
            </CardTitle>
            <CardDescription>Nível médio de dor relatado (EVA)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={painTrend}
                    dataKey="avg_pain_level"
                    nameKey="pathology"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ pathology, avg_pain_level }) => `${pathology}: ${avg_pain_level}`}
                  >
                    {painTrend.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
