import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { 
  useRetentionMetrics, 
  usePatientsAtRisk, 
  useCohortAnalysis, 
  useChurnTrends,
  useSendReactivationCampaign,
  PatientAtRisk 
} from '@/hooks/usePatientRetention';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingDown,
  Users, 
  AlertTriangle, 
  DollarSign,
  Target,
  Send,
  MessageSquare,
  Mail,
  Phone,
  Calendar,
  RefreshCw,
  UserMinus,
  UserCheck,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PatientHelpers } from '@/types';

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  trendUp,
  variant = 'default' 
}: { 
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantStyles = {
    default: 'bg-card border-border',
    success: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    danger: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
  };

  const iconStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600',
    warning: 'bg-amber-500/10 text-amber-600',
    danger: 'bg-red-500/10 text-red-600',
  };

  return (
    <Card className={`${variantStyles[variant]} transition-all hover:shadow-md`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-1 text-xs ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
                {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {trend}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${iconStyles[variant]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Risk Badge Component
function RiskBadge({ score }: { score: number }) {
  if (score >= 70) {
    return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Alto Risco</Badge>;
  }
  if (score >= 50) {
    return <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Médio Risco</Badge>;
  }
  return <Badge variant="secondary">Baixo Risco</Badge>;
}

// Cohort Heatmap Component
function CohortHeatmap({ data }: { data: { cohortMonth: string; totalPatients: number; retention: number[] }[] }) {
  const getColor = (value: number) => {
    if (value >= 80) return 'bg-emerald-500 text-white';
    if (value >= 60) return 'bg-emerald-400 text-white';
    if (value >= 40) return 'bg-amber-400 text-white';
    if (value >= 20) return 'bg-orange-400 text-white';
    if (value > 0) return 'bg-red-400 text-white';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left p-2 font-medium text-muted-foreground">Coorte</th>
            <th className="text-center p-2 font-medium text-muted-foreground">Pacientes</th>
            {[...Array(12)].map((_, i) => (
              <th key={i} className="text-center p-2 font-medium text-muted-foreground">
                M{i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((cohort) => (
            <tr key={cohort.cohortMonth} className="border-t border-border">
              <td className="p-2 font-medium">
                {format(new Date(cohort.cohortMonth + '-01'), 'MMM/yy', { locale: ptBR })}
              </td>
              <td className="text-center p-2">{cohort.totalPatients}</td>
              {[...Array(12)].map((_, i) => (
                <td key={i} className="p-1">
                  {cohort.retention[i] !== undefined ? (
                    <div className={`rounded p-2 text-center text-xs font-medium ${getColor(cohort.retention[i])}`}>
                      {cohort.retention[i]}%
                    </div>
                  ) : (
                    <div className="rounded p-2 text-center text-xs text-muted-foreground">-</div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Patient At Risk Row Component
function PatientAtRiskRow({ 
  patient, 
  selected, 
  onSelect 
}: { 
  patient: PatientAtRisk;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={`flex items-center gap-4 p-4 border rounded-lg transition-all ${
      selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
    }`}>
      <Checkbox 
        checked={selected} 
        onCheckedChange={() => onSelect(patient.id)}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{PatientHelpers.getName(patient)}</p>
          <RiskBadge score={patient.riskScore} />
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          {patient.lastAppointmentDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Última sessão: {format(new Date(patient.lastAppointmentDate), 'dd/MM/yyyy')}
            </span>
          )}
          <span>{patient.daysSinceLastSession} dias sem sessão</span>
          <span>{patient.totalSessions} sessões totais</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {patient.riskFactors.map((factor, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {factor}
            </Badge>
          ))}
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold text-red-600">{patient.riskScore}</p>
        <p className="text-xs text-muted-foreground">Score</p>
      </div>
      <div className="text-right">
        <Progress value={patient.riskScore} className="w-20 h-2" />
      </div>
    </div>
  );
}

// Reactivation Campaign Dialog
function ReactivationCampaignDialog({ 
  selectedPatients,
  onSuccess 
}: { 
  selectedPatients: PatientAtRisk[];
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'sms'>('whatsapp');
  const [message, setMessage] = useState(
    'Olá {nome}! 👋\n\nSentimos sua falta! Já faz um tempo desde sua última sessão conosco.\n\nQue tal agendar um horário? Estamos com disponibilidade e adoraríamos continuar seu tratamento.\n\nEntre em contato para agendarmos!'
  );
  
  const sendCampaign = useSendReactivationCampaign();

  const handleSend = async () => {
    try {
      await sendCampaign.mutateAsync({
        patientIds: selectedPatients.map(p => p.id),
        message,
        channel,
      });
      
      toast({
        title: 'Campanha enviada!',
        description: `Mensagem enviada para ${selectedPatients.length} pacientes.`,
      });
      
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar campanha',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={selectedPatients.length === 0} className="gap-2">
          <Send className="h-4 w-4" />
          Criar Campanha ({selectedPatients.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Campanha de Reativação</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Canal de Envio</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp
                  </div>
                </SelectItem>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    E-mail
                  </div>
                </SelectItem>
                <SelectItem value="sms">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    SMS
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Digite a mensagem..."
            />
            <p className="text-xs text-muted-foreground">
              Use {'{nome}'} para personalizar com o nome do paciente.
            </p>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium mb-2">Destinatários ({selectedPatients.length})</p>
            <div className="flex flex-wrap gap-1">
              {selectedPatients.slice(0, 5).map(p => (
                <Badge key={p.id} variant="secondary">{p.name}</Badge>
              ))}
              {selectedPatients.length > 5 && (
                <Badge variant="outline">+{selectedPatients.length - 5} mais</Badge>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={sendCampaign.isPending}
            className="gap-2"
          >
            {sendCampaign.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar Campanha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export function PatientRetention() {
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: metrics, isLoading: loadingMetrics } = useRetentionMetrics();
  const { data: patientsAtRisk, isLoading: loadingPatients, refetch: refetchPatients } = usePatientsAtRisk(30);
  const { data: cohortData, isLoading: loadingCohort } = useCohortAnalysis(12);
  const { data: churnTrends, isLoading: loadingTrends } = useChurnTrends(12);

  const filteredPatients = useMemo(() => {
    if (!patientsAtRisk) return [];
    
    return patientsAtRisk.filter(patient => {
      // Risk filter
      if (riskFilter === 'high' && patient.riskScore < 70) return false;
      if (riskFilter === 'medium' && (patient.riskScore < 50 || patient.riskScore >= 70)) return false;
      if (riskFilter === 'low' && patient.riskScore >= 50) return false;

      // Search filter
      if (searchTerm && !PatientHelpers.getName(patient).toLowerCase().includes(searchTerm.toLowerCase())) return false;

      return true;
    });
  }, [patientsAtRisk, riskFilter, searchTerm]);

  const selectedPatientsList = useMemo(() => {
    return patientsAtRisk?.filter(p => selectedPatients.has(p.id)) || [];
  }, [patientsAtRisk, selectedPatients]);

  const handleSelectPatient = (id: string) => {
    const newSelected = new Set(selectedPatients);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPatients(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPatients.size === filteredPatients.length) {
      setSelectedPatients(new Set());
    } else {
      setSelectedPatients(new Set(filteredPatients.map(p => p.id)));
    }
  };

  const insights = useMemo(() => {
    if (!metrics || !churnTrends) return [];
    
    const insights: string[] = [];
    
    if (metrics.churnRate > 30) {
      insights.push('Taxa de churn crítica! Mais de 30% dos pacientes estão inativos.');
    }
    
    if (metrics.atRiskCount > 10) {
      insights.push(`${metrics.atRiskCount} pacientes em risco de abandono identificados.`);
    }
    
    if (metrics.projectedRevenueLoss > 1000) {
      insights.push(`Projeção de perda de receita: R$ ${metrics.projectedRevenueLoss.toLocaleString('pt-BR')}`);
    }

    // Trend analysis
    if (churnTrends.length >= 2) {
      const lastMonth = churnTrends[churnTrends.length - 1];
      const prevMonth = churnTrends[churnTrends.length - 2];
      if (lastMonth.churnRate > prevMonth.churnRate) {
        insights.push('Churn aumentou em relação ao mês anterior. Ação necessária!');
      }
    }

    return insights;
  }, [metrics, churnTrends]);

  if (loadingMetrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Retenção de Pacientes</h2>
          <p className="text-muted-foreground">Análise de churn, retenção e campanhas de reativação</p>
        </div>
        <Button variant="outline" onClick={() => refetchPatients()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Insights Alert */}
      {insights.length > 0 && (
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-amber-800 dark:text-amber-200">Insights Automáticos</p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                  {insights.map((insight, i) => (
                    <li key={i}>• {insight}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Taxa de Retenção"
          value={`${metrics?.retentionRate || 0}%`}
          subtitle="Pacientes ativos"
          icon={UserCheck}
          variant="success"
          trend="+2.3% vs mês anterior"
          trendUp
        />
        <MetricCard
          title="Taxa de Churn"
          value={`${metrics?.churnRate || 0}%`}
          subtitle="Pacientes perdidos"
          icon={UserMinus}
          variant={metrics?.churnRate && metrics.churnRate > 20 ? 'danger' : 'warning'}
          trend="-1.5% vs mês anterior"
          trendUp
        />
        <MetricCard
          title="LTV Médio"
          value={`R$ ${(metrics?.averageLTV || 0).toLocaleString('pt-BR')}`}
          subtitle="Valor por paciente"
          icon={DollarSign}
          variant="default"
        />
        <MetricCard
          title="Pacientes em Risco"
          value={metrics?.atRiskCount || 0}
          subtitle="Necessitam atenção"
          icon={AlertTriangle}
          variant={metrics?.atRiskCount && metrics.atRiskCount > 5 ? 'danger' : 'warning'}
        />
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{metrics?.totalPatients || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-emerald-600">{metrics?.activePatients || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inativos</p>
                <p className="text-2xl font-bold text-amber-600">{metrics?.inactivePatients || 0}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dormentes</p>
                <p className="text-2xl font-bold text-red-600">{metrics?.dormantPatients || 0}</p>
              </div>
              <UserMinus className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="at-risk" className="space-y-4">
        <TabsList>
          <TabsTrigger value="at-risk" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Pacientes em Risco
          </TabsTrigger>
          <TabsTrigger value="cohort" className="gap-2">
            <Target className="h-4 w-4" />
            Análise de Coortes
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <TrendingDown className="h-4 w-4" />
            Evolução do Churn
          </TabsTrigger>
        </TabsList>

        {/* Patients at Risk Tab */}
        <TabsContent value="at-risk" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pacientes em Risco de Abandono</CardTitle>
                  <CardDescription>
                    Score baseado em: dias sem sessão, taxa de cancelamento e número de sessões
                  </CardDescription>
                </div>
                <ReactivationCampaignDialog 
                  selectedPatients={selectedPatientsList}
                  onSuccess={() => setSelectedPatients(new Set())}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4">
                <Input
                  placeholder="Buscar paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs"
                />
                <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as any)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filtrar risco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="high">Alto Risco (70+)</SelectItem>
                    <SelectItem value="medium">Médio Risco (50-69)</SelectItem>
                    <SelectItem value="low">Baixo Risco (&lt;50)</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedPatients.size === filteredPatients.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </Button>
                <Badge variant="outline">
                  {filteredPatients.length} pacientes
                </Badge>
              </div>

              {/* Patient List */}
              {loadingPatients ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum paciente em risco encontrado!</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredPatients.map(patient => (
                      <PatientAtRiskRow
                        key={patient.id}
                        patient={patient}
                        selected={selectedPatients.has(patient.id)}
                        onSelect={handleSelectPatient}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cohort Analysis Tab */}
        <TabsContent value="cohort">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Coortes</CardTitle>
              <CardDescription>
                Retenção de pacientes agrupados por mês de primeira sessão
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCohort ? (
                <Skeleton className="h-80" />
              ) : cohortData && cohortData.length > 0 ? (
                <CohortHeatmap data={cohortData} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Dados insuficientes para análise de coortes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Churn Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolução do Churn</CardTitle>
              <CardDescription>
                Taxa de churn mensal nos últimos 12 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTrends ? (
                <Skeleton className="h-80" />
              ) : churnTrends && churnTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={churnTrends}>
                    <defs>
                      <linearGradient id="churnGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Taxa de Churn']}
                    />
                    <Area
                      type="monotone"
                      dataKey="churnRate"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      fill="url(#churnGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingDown className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Dados insuficientes para análise de tendências</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projected Revenue Loss */}
          <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-red-500/10 rounded-xl">
                  <DollarSign className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Projeção de Receita Perdida
                  </p>
                  <p className="text-3xl font-bold text-red-600">
                    R$ {(metrics?.projectedRevenueLoss || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    Se os pacientes em risco não forem reativados nos próximos 3 meses
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PatientRetention;
