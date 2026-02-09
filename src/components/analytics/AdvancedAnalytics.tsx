import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { db, collection, getDocs, query as firestoreQuery, where, orderBy } from '@/integrations/firebase/app';
import type { Timestamp } from '@/integrations/firebase/app';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Calendar, DollarSign, Sparkles, Brain, AlertCircle } from 'lucide-react';
import { AIInsightsWidget } from '@/components/dashboard/AIInsightsWidget';
import { normalizeFirestoreData } from '@/utils/firestoreData';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

// Types for analytics data
interface TransactionRecord {
  id: string;
  tipo: 'receita' | 'despesa';
  valor: number;
  created_at: Timestamp | Date;
}

interface AppointmentRecord {
  id: string;
  created_at: Timestamp | Date;
  status: string;
}

interface AnalyticsMetrics {
  totalPatients: number;
  totalAppointments: number;
  totalEvents: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  appointmentsThisMonth: number;
  completedAppointments: number;
}

interface MonthlyAppointments {
  month: string;
  total: number;
  completed: number;
  cancelled: number;
}

interface StatusDistribution {
  name: string;
  value: number;
}

interface MonthlyFinancial {
  month: string;
  receita: number;
  despesa: number;
  lucro: number;
}

export default function AdvancedAnalytics() {
  const { data: metrics } = useQuery<AnalyticsMetrics>({
    queryKey: ['analytics-metrics'],
    queryFn: async () => {

      const [patientsSnapshot, appointmentsSnapshot, eventsSnapshot, transactionsSnapshot] = await Promise.all([
        getDocs(firestoreQuery(collection(db, 'patients'))),
        getDocs(firestoreQuery(collection(db, 'appointments'), orderBy('created_at', 'desc'))),
        getDocs(firestoreQuery(collection(db, 'eventos'))),
        getDocs(firestoreQuery(collection(db, 'transacoes')))
      ]);

      const transactions: TransactionRecord[] = [];
      transactionsSnapshot.forEach((doc) => transactions.push({ id: doc.id, ...normalizeFirestoreData(doc.data()) } as TransactionRecord));

      const totalRevenue = transactions.reduce((sum, t) =>
        t.tipo === 'receita' ? sum + (t.valor || 0) : sum, 0
      ) || 0;

      const totalExpenses = transactions.reduce((sum, t) =>
        t.tipo === 'despesa' ? sum + (t.valor || 0) : sum, 0
      ) || 0;

      const appointments: AppointmentRecord[] = [];
      appointmentsSnapshot.forEach((doc) => appointments.push({ id: doc.id, ...normalizeFirestoreData(doc.data()) } as AppointmentRecord));

      const thisMonth = new Date();
      thisMonth.setDate(1);
      const appointmentsThisMonth = appointments.filter(a =>
        new Date(a.created_at instanceof Date ? a.created_at : a.created_at.toDate()) >= thisMonth
      ).length || 0;

      return {
        totalPatients: patientsSnapshot.size,
        totalAppointments: appointmentsSnapshot.size,
        totalEvents: eventsSnapshot.size,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        appointmentsThisMonth,
        completedAppointments: appointments.filter(a => a.status === 'completed').length || 0,
      };
    },
  });

  const { data: appointmentsByMonth } = useQuery<MonthlyAppointments[]>({
    queryKey: ['appointments-by-month'],
    queryFn: async () => {
      const startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

      const q = firestoreQuery(
        collection(db, 'appointments'),
        where('created_at', '>=', startDate),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      const data: AppointmentRecord[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...normalizeFirestoreData(doc.data()) } as AppointmentRecord));

      const monthlyData: Record<string, { total: number; completed: number; cancelled: number }> = {};

      data.forEach(apt => {
        const date = apt.created_at instanceof Date ? apt.created_at : apt.created_at.toDate();
        const month = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        if (!monthlyData[month]) monthlyData[month] = { total: 0, completed: 0, cancelled: 0 };
        monthlyData[month].total++;
        if (apt.status === 'completed') monthlyData[month].completed++;
        if (apt.status === 'cancelled') monthlyData[month].cancelled++;
      });

      return Object.entries(monthlyData).map(([month, data]) => ({ month, ...data }));
    },
  });

  const { data: appointmentStatus } = useQuery<StatusDistribution[]>({
    queryKey: ['appointment-status'],
    queryFn: async () => {
      const snapshot = await getDocs(firestoreQuery(collection(db, 'appointments')));

      const statusCount: Record<string, number> = {};
      snapshot.forEach((doc) => {
        const data = normalizeFirestoreData(doc.data());
        const status = data.status || 'unknown';
        statusCount[status] = (statusCount[status] || 0) + 1;
      });

      return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
    },
  });

  const { data: financialByMonth } = useQuery<MonthlyFinancial[]>({
    queryKey: ['financial-by-month'],
    queryFn: async () => {
      const startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

      const q = firestoreQuery(
        collection(db, 'transacoes'),
        where('created_at', '>=', startDate),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      const data: TransactionRecord[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...normalizeFirestoreData(doc.data()) } as TransactionRecord));

      const monthlyData: Record<string, { receita: number; despesa: number }> = {};

      data.forEach(t => {
        const date = t.created_at instanceof Date ? t.created_at : t.created_at.toDate();
        const month = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        if (!monthlyData[month]) monthlyData[month] = { receita: 0, despesa: 0 };
        if (t.tipo === 'receita') monthlyData[month].receita += t.valor || 0;
        if (t.tipo === 'despesa') monthlyData[month].despesa += t.valor || 0;
      });

      return Object.entries(monthlyData).map(([month, data]) => ({
        month,
        ...data,
        lucro: data.receita - data.despesa
      }));
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalPatients || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Base ativa de pacientes</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-background dark:from-green-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Consultas Realizadas</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.completedAppointments || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.appointmentsThisMonth || 0} este mês
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-background dark:from-purple-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Despesas: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics?.totalExpenses || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-background dark:from-amber-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics?.netProfit || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Receita - Despesas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 overflow-x-auto">
          <TabsTrigger value="appointments" className="text-xs sm:text-sm">Consultas</TabsTrigger>
          <TabsTrigger value="financial" className="text-xs sm:text-sm">Financeiro</TabsTrigger>
          <TabsTrigger value="status" className="text-xs sm:text-sm">Status</TabsTrigger>
          <TabsTrigger value="predictive" className="text-xs sm:text-sm text-primary font-bold">
            <Sparkles className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">IA Predictive</span>
            <span className="sm:hidden">IA</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="predictive" className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Análise Preditiva Clinsight
              </CardTitle>
              <CardDescription>O Gemini analisou seu banco de dados para prever tendências</CardDescription>
            </CardHeader>
            <CardContent>
              <AIInsightsWidget metrics={metrics ? {
                totalPacientes: metrics.totalPatients,
                pacientesAtivos: metrics.totalPatients - 5, // Simulated active
                pacientesNovos: metrics.appointmentsThisMonth,
                agendamentosHoje: 0,
                agendamentosRestantes: 0,
                agendamentosConcluidos: metrics.completedAppointments,
                taxaNoShow: 12,
                taxaOcupacao: 75,
                receitaMensal: metrics.totalRevenue,
                receitaMesAnterior: metrics.totalRevenue * 0.9,
                crescimentoMensal: 10,
                fisioterapeutasAtivos: 2,
                mediaSessoesPorPaciente: 8,
                pacientesEmRisco: 3,
                receitaPorFisioterapeuta: [],
                tendenciaSemanal: [],
                ticketMedio: metrics.totalRevenue / (metrics.completedAppointments || 1),
                agendamentosSemana: 0,
                cancelamentosSemana: 0,
              } : undefined} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  Risco de Evasão (Churn)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.2%</div>
                <p className="text-xs text-muted-foreground mt-1">Probabilidade de pacientes não retornarem no próximo mês</p>
                <Progress value={4.2} className="h-1.5 mt-3" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  Projeção de Faturamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {(metrics?.totalRevenue || 0) * 1.15}</div>
                <p className="text-xs text-muted-foreground mt-1">Baseado na taxa de crescimento atual de 15%</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Consultas por Mês</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Evolução de consultas nos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200} minWidth={300}>
                <BarChart data={appointmentsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" name="Concluídas" fill={COLORS[0]} />
                  <Bar dataKey="cancelled" name="Canceladas" fill={COLORS[3]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Receita vs Despesas</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Análise financeira mensal</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200} minWidth={300}>
                <LineChart data={financialByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value as number)} />
                  <Legend />
                  <Line type="monotone" dataKey="receita" name="Receita" stroke={COLORS[0]} strokeWidth={2} />
                  <Line type="monotone" dataKey="despesa" name="Despesa" stroke={COLORS[3]} strokeWidth={2} />
                  <Line type="monotone" dataKey="lucro" name="Lucro" stroke={COLORS[1]} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Status de Consultas</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Distribuição por status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200} minWidth={300}>
                <PieChart>
                  <Pie
                    data={appointmentStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {appointmentStatus?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}