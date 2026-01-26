import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { getFirebaseDb } from '@/integrations/firebase/app';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function AdvancedAnalytics() {
  const { data: metrics } = useQuery({
    queryKey: ['analytics-metrics'],
    queryFn: async () => {
      const db = getFirebaseDb();

      const [patientsSnapshot, appointmentsSnapshot, eventsSnapshot, transactionsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'patients'))),
        getDocs(query(collection(db, 'appointments'), orderBy('created_at', 'desc'))),
        getDocs(query(collection(db, 'eventos'))),
        getDocs(query(collection(db, 'transacoes')))
      ]);

      const transactions: any[] = [];
      transactionsSnapshot.forEach((doc) => transactions.push({ id: doc.id, ...doc.data() }));

      const totalRevenue = transactions.reduce((sum, t) =>
        t.tipo === 'receita' ? sum + (t.valor || 0) : sum, 0
      ) || 0;

      const totalExpenses = transactions.reduce((sum, t) =>
        t.tipo === 'despesa' ? sum + (t.valor || 0) : sum, 0
      ) || 0;

      const appointments: any[] = [];
      appointmentsSnapshot.forEach((doc) => appointments.push({ id: doc.id, ...doc.data() }));

      const thisMonth = new Date();
      thisMonth.setDate(1);
      const appointmentsThisMonth = appointments.filter(a =>
        new Date(a.created_at?.toDate ? a.created_at.toDate() : a.created_at) >= thisMonth
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

  const { data: appointmentsByMonth } = useQuery({
    queryKey: ['appointments-by-month'],
    queryFn: async () => {
      const db = getFirebaseDb();
      const startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

      const q = query(
        collection(db, 'appointments'),
        where('created_at', '>=', startDate),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      const data: any[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));

      const monthlyData: Record<string, { total: number; completed: number; cancelled: number }> = {};

      data.forEach(apt => {
        const date = apt.created_at?.toDate ? apt.created_at.toDate() : new Date(apt.created_at);
        const month = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        if (!monthlyData[month]) monthlyData[month] = { total: 0, completed: 0, cancelled: 0 };
        monthlyData[month].total++;
        if (apt.status === 'completed') monthlyData[month].completed++;
        if (apt.status === 'cancelled') monthlyData[month].cancelled++;
      });

      return Object.entries(monthlyData).map(([month, data]) => ({ month, ...data }));
    },
  });

  const { data: appointmentStatus } = useQuery({
    queryKey: ['appointment-status'],
    queryFn: async () => {
      const db = getFirebaseDb();
      const snapshot = await getDocs(query(collection(db, 'appointments')));

      const statusCount: Record<string, number> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const status = data.status || 'unknown';
        statusCount[status] = (statusCount[status] || 0) + 1;
      });

      return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
    },
  });

  const { data: financialByMonth } = useQuery({
    queryKey: ['financial-by-month'],
    queryFn: async () => {
      const db = getFirebaseDb();
      const startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

      const q = query(
        collection(db, 'transacoes'),
        where('created_at', '>=', startDate),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      const data: any[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));

      const monthlyData: Record<string, { receita: number; despesa: number }> = {};

      data.forEach(t => {
        const date = t.created_at?.toDate ? t.created_at.toDate() : new Date(t.created_at);
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="appointments">Consultas</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Consultas por Mês</CardTitle>
              <CardDescription>Evolução de consultas nos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
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
            <CardHeader>
              <CardTitle>Receita vs Despesas</CardTitle>
              <CardDescription>Análise financeira mensal</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
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
            <CardHeader>
              <CardTitle>Status de Consultas</CardTitle>
              <CardDescription>Distribuição por status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
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
