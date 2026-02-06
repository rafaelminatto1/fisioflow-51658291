import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {

  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  Calendar as CalendarIcon,
  Users, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Lightbulb,
  Info,
  ChevronDown,
  Phone,
  Clock,
  Download
} from 'lucide-react';
import { useAttendanceReport, useTherapists, type PeriodFilter, type StatusFilter } from '@/hooks/useAttendanceReport';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportAttendanceReport } from '@/lib/export/excelExport';
import { useToast } from '@/hooks/use-toast';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'concluido':
      return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Realizado</Badge>;
    case 'faltou':
      return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Faltou</Badge>;
    case 'cancelado':
      return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Cancelado</Badge>;
    case 'agendado':
      return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">Agendado</Badge>;
    case 'confirmado':
      return <Badge className="bg-cyan-500/20 text-cyan-700 border-cyan-500/30">Confirmado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function AttendanceReport() {
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [therapistId, setTherapistId] = useState<string>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const { data, isLoading, refetch, isFetching } = useAttendanceReport({
    period,
    therapistId: therapistId !== 'all' ? therapistId : undefined,
    status: status !== 'all' ? status : undefined,
    startDate,
    endDate
  });

  const { data: therapists } = useTherapists();

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedRows(newSet);
  };

  const handleExport = async () => {
    if (!data) return;
    
    setIsExporting(true);
    try {
      await exportAttendanceReport({
        totalAppointments: data.totalAppointments,
        attended: data.attended,
        noShow: data.noShow,
        cancelled: data.cancelled,
        attendanceRate: data.attendanceRate,
        cancellationRate: data.cancellationRate,
        therapistData: data.therapistData.map(t => ({
          name: t.name,
          total: t.total,
          attended: t.attended,
          noShow: t.noShow,
          cancelled: t.cancelled,
          attendanceRate: t.rate
        })),
        appointments: data.appointments
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
    gradient,
    valueColor
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ElementType;
    subtitle?: string;
    gradient: string;
    valueColor?: string;
  }) => (
    <Card className={cn("relative overflow-hidden", gradient)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className={cn("text-3xl font-bold", valueColor)}>
              {isLoading ? <Skeleton className="h-9 w-20" /> : value}
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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Taxa de Comparecimento</h1>
            <p className="text-muted-foreground mt-1">Análise detalhada de comparecimentos e faltas</p>
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
                <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Esta Semana</SelectItem>
                    <SelectItem value="month">Este Mês</SelectItem>
                    <SelectItem value="quarter">Este Trimestre</SelectItem>
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

              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Fisioterapeuta</label>
                <Select value={therapistId} onValueChange={setTherapistId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {therapists?.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Status</label>
                <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="concluido">Realizado</SelectItem>
                    <SelectItem value="faltou">Faltou</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total de Agendamentos"
            value={data?.totalAppointments || 0}
            icon={CalendarIcon}
            gradient="bg-gradient-to-br from-primary/10 to-primary/5"
          />
          <StatCard
            title="Comparecimentos"
            value={data?.attended || 0}
            icon={CheckCircle2}
            gradient="bg-gradient-to-br from-green-500/10 to-green-500/5"
            valueColor="text-green-600"
          />
          <StatCard
            title="Faltas"
            value={data?.noShow || 0}
            icon={XCircle}
            gradient="bg-gradient-to-br from-red-500/10 to-red-500/5"
            valueColor="text-red-600"
          />
          <StatCard
            title="Taxa de Comparecimento"
            value={`${data?.attendanceRate || 0}%`}
            icon={TrendingUp}
            gradient="bg-gradient-to-br from-blue-500/10 to-blue-500/5"
            valueColor="text-blue-600"
          />
          <StatCard
            title="Taxa de Cancelamento"
            value={`${data?.cancellationRate || 0}%`}
            icon={AlertTriangle}
            gradient="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5"
            valueColor="text-yellow-600"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição de Status</CardTitle>
              <CardDescription>Realizado vs Faltou vs Cancelado</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (data?.pieChartData?.length || 0) === 0 ? (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  Nenhum dado disponível
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data?.pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data?.pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Bar Chart - Day of Week */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Taxa por Dia da Semana</CardTitle>
              <CardDescription>Comparecimento e faltas por dia</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (data?.dayOfWeekData?.length || 0) === 0 ? (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  Nenhum dado disponível
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data?.dayOfWeekData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value: number) => [`${value}%`, '']} />
                    <Legend />
                    <Bar dataKey="attendanceRate" name="Comparecimento" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="noShowRate" name="Falta" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Line Chart - Monthly Evolution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evolução Mensal</CardTitle>
              <CardDescription>Taxa de comparecimento nos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data?.monthlyEvolution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value: number) => [`${value}%`, 'Taxa']} />
                    <Line 
                      type="monotone" 
                      dataKey="attendanceRate" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Insights Automáticos
              </CardTitle>
              <CardDescription>Análises e recomendações baseadas nos dados</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : data?.insights && data.insights.length > 0 ? (
                <div className="space-y-3">
                  {data.insights.map((insight, index) => (
                    <div 
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border flex items-start gap-3",
                        insight.type === 'success' && "bg-green-500/10 border-green-500/20",
                        insight.type === 'warning' && "bg-yellow-500/10 border-yellow-500/20",
                        insight.type === 'info' && "bg-blue-500/10 border-blue-500/20"
                      )}
                    >
                      {insight.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />}
                      {insight.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />}
                      {insight.type === 'info' && <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />}
                      <p className="text-sm">{insight.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum insight disponível</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Therapist Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Comparecimento por Fisioterapeuta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Fisioterapeuta</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Total</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Realizados</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Faltas</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Cancelados</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Taxa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.therapistData.map((therapist) => (
                      <tr key={therapist.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2 font-medium text-sm">{therapist.name}</td>
                        <td className="text-center py-3 px-2 text-sm">{therapist.total}</td>
                        <td className="text-center py-3 px-2 text-sm text-green-600">{therapist.attended}</td>
                        <td className="text-center py-3 px-2 text-sm text-red-600">{therapist.noShow}</td>
                        <td className="text-center py-3 px-2 text-sm text-yellow-600">{therapist.cancelled}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-2">
                            <Progress value={therapist.rate} className="w-16 h-2" />
                            <span className="text-sm font-medium w-10">{therapist.rate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!data?.therapistData || data.therapistData.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Appointments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Análise Detalhada
            </CardTitle>
            <CardDescription>Clique em uma linha para ver mais detalhes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {data?.appointments.slice(0, 20).map((apt) => (
                  <Collapsible key={apt.id} open={expandedRows.has(apt.id)} onOpenChange={() => toggleRow(apt.id)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{apt.patientName}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(apt.date), 'dd/MM/yyyy', { locale: ptBR })} às {apt.time.slice(0, 5)}
                            </p>
                          </div>
                          <div className="hidden sm:block text-sm text-muted-foreground">
                            {apt.therapistName}
                          </div>
                          <div>{getStatusBadge(apt.status)}</div>
                        </div>
                        <ChevronDown className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform ml-2",
                          expandedRows.has(apt.id) && "rotate-180"
                        )} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 bg-muted/30 rounded-b-lg border-x border-b space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Paciente</p>
                            <p className="font-medium">{apt.patientName}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Telefone</p>
                            <p className="font-medium flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {apt.patientPhone || 'Não informado'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Horário</p>
                            <p className="font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {apt.time.slice(0, 5)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Fisioterapeuta</p>
                            <p className="font-medium">{apt.therapistName}</p>
                          </div>
                        </div>
                        {apt.notes && (
                          <div>
                            <p className="text-muted-foreground text-sm">Observações</p>
                            <p className="text-sm bg-background p-2 rounded border mt-1">{apt.notes}</p>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
                {(!data?.appointments || data.appointments.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum agendamento encontrado no período selecionado
                  </div>
                )}
                {(data?.appointments?.length || 0) > 20 && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    Mostrando 20 de {data?.appointments.length} registros
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
