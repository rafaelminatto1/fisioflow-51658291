import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select';
import { Badge } from '@/components/shared/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/ui/avatar';
import { Progress } from '@/components/shared/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  Cell
} from 'recharts';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Download
} from 'lucide-react';
import { useTherapistOccupancy } from '@/hooks/useTherapistOccupancy';
import { cn } from '@/lib/utils';
import { exportOccupancyReport } from '@/lib/export/excelExport';
import { useToast } from '@/hooks/use-toast';

type PeriodFilter = 'today' | 'week' | 'month';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const getOccupancyColor = (rate: number) => {
  if (rate >= 80) return 'hsl(142, 76%, 36%)'; // Green
  if (rate >= 50) return 'hsl(45, 93%, 47%)';  // Yellow
  return 'hsl(0, 84%, 60%)';                    // Red
};

const getStatusBadge = (status: 'otimo' | 'bom' | 'baixo') => {
  switch (status) {
    case 'otimo':
      return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Ótimo</Badge>;
    case 'bom':
      return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Bom</Badge>;
    case 'baixo':
      return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Baixo</Badge>;
  }
};

export default function TherapistOccupancyPage() {
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [isExporting, setIsExporting] = useState(false);
  const { data, isLoading, refetch, isFetching } = useTherapistOccupancy({ period });
  const { toast } = useToast();

  const handleExport = async () => {
    if (!data) return;
    
    setIsExporting(true);
    try {
      await exportOccupancyReport({
        ocupacaoMedia: data.ocupacaoMedia,
        totalConsultasHoje: data.totalConsultasHoje,
        totalHorasTrabalhadas: data.totalHorasTrabalhadas,
        fisioterapeutasAtivos: data.fisioterapeutasAtivos,
        therapists: data.therapists
      });
      toast({
        title: 'Exportação concluída',
        description: 'O arquivo Excel foi gerado com sucesso.'
      });
    } catch {
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível gerar o arquivo.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    subtitle,
    trend,
    gradient 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ElementType;
    subtitle?: string;
    trend?: { value: number; positive: boolean };
    gradient: string;
  }) => (
    <Card className={cn("relative overflow-hidden", gradient)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-20" /> : value}</p>
              {trend && (
                <span className={cn(
                  "flex items-center text-xs font-medium",
                  trend.positive ? "text-green-600" : "text-red-600"
                )}>
                  {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {trend.value}%
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="p-3 rounded-full bg-background/50">
            <Icon className="h-6 w-6 text-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Preparar dados para gráfico de barras horizontais
  const barChartData = data?.therapists.map(t => ({
    name: t.name.split(' ')[0], // Primeiro nome apenas
    fullName: t.name,
    ocupacao: t.taxaOcupacao,
    fill: getOccupancyColor(t.taxaOcupacao)
  })) || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Ocupação dos Fisioterapeutas</h1>
            <p className="text-muted-foreground mt-1">Acompanhe a taxa de ocupação e produtividade da equipe</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline"
              onClick={handleExport}
              disabled={isExporting || isLoading || !data}
            >
              <Download className={cn("h-4 w-4 mr-2", isExporting && "animate-pulse")} />
              Exportar Excel
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Ocupação Média"
            value={`${data?.ocupacaoMedia || 0}%`}
            icon={TrendingUp}
            subtitle="Taxa geral da equipe"
            gradient="bg-gradient-to-br from-primary/10 to-primary/5"
          />
          <StatCard
            title="Consultas Hoje"
            value={data?.totalConsultasHoje || 0}
            icon={Calendar}
            subtitle="Total de atendimentos"
            gradient="bg-gradient-to-br from-blue-500/10 to-blue-500/5"
          />
          <StatCard
            title="Horas Trabalhadas"
            value={`${data?.totalHorasTrabalhadas || 0}h`}
            icon={Clock}
            subtitle={period === 'today' ? 'Hoje' : period === 'week' ? 'Esta semana' : 'Este mês'}
            gradient="bg-gradient-to-br from-green-500/10 to-green-500/5"
          />
          <StatCard
            title="Fisioterapeutas Ativos"
            value={data?.fisioterapeutasAtivos || 0}
            icon={Users}
            subtitle="Profissionais disponíveis"
            gradient="bg-gradient-to-br from-purple-500/10 to-purple-500/5"
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Horizontal Bar Chart - Ocupação por Fisioterapeuta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Taxa de Ocupação por Profissional
              </CardTitle>
              <CardDescription>Comparativo entre fisioterapeutas</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : barChartData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhum dado disponível
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={barChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={60} />
                    <Tooltip 
                      formatter={(value: number) => [`${value}%`, 'Ocupação']}
                      labelFormatter={(label) => {
                        const item = barChartData.find(d => d.name === label);
                        return item?.fullName || label;
                      }}
                    />
                    <Bar dataKey="ocupacao" radius={[0, 4, 4, 0]}>
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Line Chart - Evolução ao Longo do Dia */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Atendimentos por Hora (Hoje)
              </CardTitle>
              <CardDescription>Distribuição de consultas ao longo do dia</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (data?.hourlyData?.length || 0) === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhum dado disponível
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data?.hourlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    {data?.therapists.slice(0, 5).map((therapist, index) => (
                      <Line
                        key={therapist.id}
                        type="monotone"
                        dataKey={therapist.name}
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail Table and Suggestions */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Detail Table */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Detalhamento por Fisioterapeuta
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Fisioterapeuta</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Consultas</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Horas</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Capacidade</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Ocupação</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.therapists.map((therapist) => (
                        <tr key={therapist.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={therapist.avatarUrl} />
                                <AvatarFallback className="text-xs">
                                  {therapist.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">{therapist.name}</span>
                            </div>
                          </td>
                          <td className="text-center py-3 px-2 text-sm">{therapist.consultasHoje}</td>
                          <td className="text-center py-3 px-2 text-sm">{therapist.horasTrabalhadas}h</td>
                          <td className="text-center py-3 px-2 text-sm">{therapist.capacidadeHoras}h</td>
                          <td className="py-3 px-2">
                            <div className="flex items-center justify-center gap-2">
                              <Progress 
                                value={therapist.taxaOcupacao} 
                                className="w-20 h-2"
                              />
                              <span className="text-sm font-medium w-10">{therapist.taxaOcupacao}%</span>
                            </div>
                          </td>
                          <td className="text-center py-3 px-2">
                            {getStatusBadge(therapist.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!data?.therapists || data.therapists.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum fisioterapeuta encontrado
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Suggestions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Sugestões de Otimização
              </CardTitle>
              <CardDescription>Insights automáticos para melhorar a produtividade</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : data?.suggestions && data.suggestions.length > 0 ? (
                <div className="space-y-3">
                  {data.suggestions.map((suggestion, index) => (
                    <div 
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border flex items-start gap-3",
                        suggestion.type === 'success' && "bg-green-500/10 border-green-500/20",
                        suggestion.type === 'warning' && "bg-yellow-500/10 border-yellow-500/20",
                        suggestion.type === 'info' && "bg-blue-500/10 border-blue-500/20"
                      )}
                    >
                      {suggestion.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />}
                      {suggestion.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />}
                      {suggestion.type === 'info' && <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />}
                      <p className="text-sm">{suggestion.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p className="text-sm">Tudo está equilibrado!</p>
                  <p className="text-xs mt-1">Nenhuma sugestão no momento</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
