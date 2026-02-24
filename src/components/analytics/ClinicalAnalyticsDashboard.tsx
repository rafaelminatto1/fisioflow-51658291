/**
 * Clinical Analytics Dashboard
 *
 * Displays high-level clinical insights from BigQuery.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useClinicalAnalytics } from '@/hooks/useClinicalAnalytics';
import { 
  Users, 
  Activity, 
  BarChart3, 
  TrendingUp, 
  AlertCircle,
  Dumbbell,
  Clock,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function ClinicalAnalyticsDashboard() {
  const { dashboard, topExercises, painMap, isLoading, error, refetch } = useClinicalAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center border-2 border-dashed rounded-xl">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <h3 className="text-lg font-semibold">Erro ao carregar Analytics</h3>
        <p className="text-muted-foreground mb-4">Verifique se o BigQuery está configurado no projeto.</p>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Clínico</h2>
          <p className="text-muted-foreground">Insights de performance e desfechos clínicos (via BigQuery)</p>
        </div>
        <Button onClick={refetch} variant="ghost" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total Pacientes" 
          value={dashboard?.totalPatients || 0} 
          icon={<Users className="h-5 w-5" />} 
          description="Total na base clínica"
        />
        <KPICard 
          title="Sessões Realizadas" 
          value={dashboard?.completedAppointments || 0} 
          icon={<Activity className="h-5 w-5" />} 
          description="Sessões concluídas"
        />
        <KPICard 
          title="Engajamento" 
          value={`${dashboard?.engagementScore || 0}%`} 
          icon={<TrendingUp className="h-5 w-5" />} 
          description="Taxa de adesão aos exercícios"
        />
        <KPICard 
          title="Tempo Médio" 
          value={`${dashboard?.avgSessionDuration || 0} min`} 
          icon={<Clock className="h-5 w-5" />} 
          description="Duração média da sessão"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Exercises */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Exercícios Mais Prescritos
            </CardTitle>
            <CardDescription>Frequência de uso por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topExercises}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {topExercises?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pain Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-red-500" />
              Distribuição de Regiões de Dor
            </CardTitle>
            <CardDescription>Principais queixas por região corporal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboard?.topPainRegions || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label
                  >
                    {(dashboard?.topPainRegions || []).map((entry: any, index: number) => (
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
}

function KPICard({ title, value, icon, description }: { title: string, value: string | number, icon: React.ReactNode, description: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium">{title}</p>
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
