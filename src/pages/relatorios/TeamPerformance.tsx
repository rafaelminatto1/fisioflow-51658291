import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select';
import { Badge } from '@/components/shared/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/ui/avatar';
import { Progress } from '@/components/shared/ui/progress';
import { Skeleton } from '@/components/shared/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shared/ui/popover';
import { Calendar } from '@/components/web/ui/calendar';
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  Crown,
  DollarSign,
  Users, 
  TrendingUp,
  RefreshCw,
  Download,
  Calendar as CalendarIcon,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Award,
  Target
} from 'lucide-react';
import { 
  useTeamPerformance, 
  type PerformancePeriod,
  type TherapistPerformance 
} from '@/hooks/useTeamPerformance';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { exportTeamPerformance } from '@/lib/export/excelExport';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const MEDAL_COLORS = {
  gold: 'from-yellow-400 to-yellow-600',
  silver: 'from-gray-300 to-gray-500',
  bronze: 'from-orange-400 to-orange-600'
};

export default function TeamPerformance() {
  const [period, setPeriod] = useState<PerformancePeriod>('month');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const { data, isLoading, refetch, isFetching } = useTeamPerformance({
    period,
    startDate,
    endDate
  });

  const handleExport = async () => {
    if (!data) return;
    
    setIsExporting(true);
    try {
      await exportTeamPerformance({
        totalRevenue: data.totalRevenue,
        averageTicket: data.averageTicket,
        retentionRate: data.retentionRate,
        averageNps: data.averageNps,
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
    change,
    changePositive,
    gradient 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ElementType;
    change?: number;
    changePositive?: boolean;
    gradient: string;
  }) => (
    <Card className={cn("relative overflow-hidden", gradient)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">
                {isLoading ? <Skeleton className="h-9 w-24" /> : value}
              </p>
              {change !== undefined && (
                <span className={cn(
                  "flex items-center text-xs font-medium",
                  changePositive ? "text-green-600" : "text-red-600"
                )}>
                  {changePositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(change)}%
                </span>
              )}
            </div>
          </div>
          <div className="p-3 rounded-full bg-background/50">
            <Icon className="h-6 w-6 text-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const TopPerformerCard = ({ 
    therapist, 
    position 
  }: { 
    therapist: TherapistPerformance; 
    position: 1 | 2 | 3 
  }) => {
    const medalColor = position === 1 ? MEDAL_COLORS.gold : position === 2 ? MEDAL_COLORS.silver : MEDAL_COLORS.bronze;
    const size = position === 1 ? 'h-20 w-20' : 'h-16 w-16';
    const crownSize = position === 1 ? 'h-8 w-8' : 'h-6 w-6';
    
    return (
      <div className={cn(
        "flex flex-col items-center p-4 rounded-xl border bg-gradient-to-br",
        position === 1 ? "from-yellow-500/10 to-yellow-500/5 border-yellow-500/30" :
        position === 2 ? "from-gray-400/10 to-gray-400/5 border-gray-400/30" :
        "from-orange-500/10 to-orange-500/5 border-orange-500/30"
      )}>
        <div className="relative">
          <div className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 p-1 rounded-full bg-gradient-to-br",
            medalColor
          )}>
            <Crown className={cn(crownSize, "text-white")} />
          </div>
          <Avatar className={cn(size, "mt-4 border-4", 
            position === 1 ? "border-yellow-500" : 
            position === 2 ? "border-gray-400" : 
            "border-orange-500"
          )}>
            <AvatarImage src={therapist.avatarUrl} />
            <AvatarFallback className="text-lg font-bold">
              {therapist.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="mt-3 text-center">
          <p className="font-semibold text-lg">{therapist.name.split(' ')[0]}</p>
          <p className="text-2xl font-bold text-primary">
            R$ {therapist.revenue.toLocaleString('pt-BR')}
          </p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm text-muted-foreground">Score: {therapist.score}</span>
          </div>
        </div>
      </div>
    );
  };

  const top3 = data?.therapists.slice(0, 3) || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Performance da Equipe</h1>
            <p className="text-muted-foreground mt-1">Análise de produtividade e resultados dos fisioterapeutas</p>
          </div>
          <div className="flex items-center gap-3">
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

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[150px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Período</label>
                <Select value={period} onValueChange={(v) => setPeriod(v as PerformancePeriod)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Este Mês</SelectItem>
                    <SelectItem value="3months">Últimos 3 Meses</SelectItem>
                    <SelectItem value="6months">Últimos 6 Meses</SelectItem>
                    <SelectItem value="year">Este Ano</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {period === 'custom' && (
                <>
                  <div className="min-w-[150px]">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Data Início</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, 'dd/MM/yyyy') : 'Selecionar'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} locale={ptBR} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="min-w-[150px]">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Data Fim</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, 'dd/MM/yyyy') : 'Selecionar'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} locale={ptBR} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Receita Total"
            value={`R$ ${(data?.totalRevenue || 0).toLocaleString('pt-BR')}`}
            icon={DollarSign}
            change={data?.previousPeriodComparison.revenueChange}
            changePositive={(data?.previousPeriodComparison.revenueChange || 0) > 0}
            gradient="bg-gradient-to-br from-green-500/10 to-green-500/5"
          />
          <StatCard
            title="Ticket Médio"
            value={`R$ ${(data?.averageTicket || 0).toLocaleString('pt-BR')}`}
            icon={Target}
            gradient="bg-gradient-to-br from-blue-500/10 to-blue-500/5"
          />
          <StatCard
            title="Taxa de Retenção"
            value={`${data?.retentionRate || 0}%`}
            icon={Users}
            change={data?.previousPeriodComparison.retentionChange}
            changePositive={(data?.previousPeriodComparison.retentionChange || 0) > 0}
            gradient="bg-gradient-to-br from-purple-500/10 to-purple-500/5"
          />
          <StatCard
            title="NPS Médio"
            value={data?.averageNps || 0}
            icon={Award}
            gradient="bg-gradient-to-br from-orange-500/10 to-orange-500/5"
          />
        </div>

        {/* Top 3 Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              Ranking de Fisioterapeutas
            </CardTitle>
            <CardDescription>Top performers do período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
              </div>
            ) : top3.length >= 3 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="order-2 md:order-1">
                  <TopPerformerCard therapist={top3[1]} position={2} />
                </div>
                <div className="order-1 md:order-2 md:-mb-4">
                  <TopPerformerCard therapist={top3[0]} position={1} />
                </div>
                <div className="order-3">
                  <TopPerformerCard therapist={top3[2]} position={3} />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Dados insuficientes para exibir ranking
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue by Therapist Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Receita por Fisioterapeuta
              </CardTitle>
              <CardDescription>Comparativo de receita no período</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={data?.therapists.slice(0, 6)} 
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Monthly Evolution Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Evolução de Receita
              </CardTitle>
              <CardDescription>Receita mensal por fisioterapeuta</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data?.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']} />
                    <Legend />
                    {data?.therapists.slice(0, 5).map((therapist, index) => (
                      <Line
                        key={therapist.id}
                        type="monotone"
                        dataKey={therapist.name}
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Radar Chart & Retention Heatmap */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comparação Multidimensional</CardTitle>
              <CardDescription>Sessões, receita, retenção e satisfação</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={data?.radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    {data?.therapists.slice(0, 4).map((therapist, index) => (
                      <Radar
                        key={therapist.id}
                        name={therapist.name}
                        dataKey={therapist.name}
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        fillOpacity={0.2}
                      />
                    ))}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Retention Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Taxa de Retenção por Categoria</CardTitle>
              <CardDescription>Análise por tipo de tratamento</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <div className="space-y-4">
                  {data?.retentionByCategory.map((category) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{category.category}</span>
                        <span className="text-muted-foreground">
                          {category.rate}% ({category.total} pacientes)
                        </span>
                      </div>
                      <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
                        <div 
                          className={cn(
                            "absolute inset-y-0 left-0 rounded-lg transition-all",
                            category.rate >= 80 ? "bg-green-500" :
                            category.rate >= 60 ? "bg-yellow-500" :
                            "bg-red-500"
                          )}
                          style={{ width: `${category.rate}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                          {category.rate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Full Ranking Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Ranking Completo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground w-16">#</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Fisioterapeuta</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Receita</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Sessões</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Retenção</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.therapists.map((therapist) => (
                      <tr key={therapist.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2">
                          {therapist.rank <= 3 ? (
                            <Badge className={cn(
                              "font-bold",
                              therapist.rank === 1 ? "bg-yellow-500 text-white" :
                              therapist.rank === 2 ? "bg-gray-400 text-white" :
                              "bg-orange-500 text-white"
                            )}>
                              {therapist.rank}º
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground font-medium">{therapist.rank}º</span>
                          )}
                        </td>
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
                        <td className="text-right py-3 px-2 font-medium text-green-600">
                          R$ {therapist.revenue.toLocaleString('pt-BR')}
                        </td>
                        <td className="text-center py-3 px-2 text-sm">{therapist.sessions}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-2">
                            <Progress value={therapist.retentionRate} className="w-16 h-2" />
                            <span className="text-sm w-10">{therapist.retentionRate}%</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-2">
                          <Badge variant="outline" className="font-bold">
                            {therapist.score}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!data?.therapists || data.therapists.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
