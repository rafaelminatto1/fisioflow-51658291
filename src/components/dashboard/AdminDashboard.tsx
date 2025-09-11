import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, Users, Activity, Calendar, DollarSign, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Clock, Target, Brain, Zap, BarChart3,
  PieChart, LineChart, ArrowUpRight, ArrowDownRight, Bell
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  AreaChart,
  BarChart,
  PieChart as RechartsPieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  Bar,
  Line,
  Cell,
  Pie
} from 'recharts';
import { AIPredictionsPanel } from '@/components/ai/AIPredictionsPanel';
import { CommunicationCenter } from '@/components/communication/CommunicationCenter';
import { FinancialDashboard } from '@/components/financial/FinancialDashboard';

// Dados simulados para demonstração
const generateMockData = () => {
  const today = new Date();
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toISOString().split('T')[0],
      appointments: Math.floor(Math.random() * 20) + 10,
      revenue: Math.floor(Math.random() * 5000) + 2000,
      noShow: Math.floor(Math.random() * 5) + 1,
      satisfaction: Math.floor(Math.random() * 20) + 80
    };
  });
  return last30Days;
};

const pieData = [
  { name: 'Fisioterapia', value: 45, color: '#8884d8' },
  { name: 'RPG', value: 25, color: '#82ca9d' },
  { name: 'Pilates', value: 20, color: '#ffc658' },
  { name: 'Outros', value: 10, color: '#ff7300' }
];

const aiInsights = [
  {
    type: 'warning',
    title: 'Alto Risco de No-Show',
    description: '3 pacientes com 85% de probabilidade de faltar hoje',
    action: 'Enviar lembretes',
    icon: AlertTriangle
  },
  {
    type: 'success',
    title: 'Meta de Satisfação Atingida',
    description: 'NPS de 92% este mês (+8% vs mês anterior)',
    action: 'Ver detalhes',
    icon: CheckCircle
  },
  {
    type: 'info',
    title: 'Oportunidade de Receita',
    description: 'Horários vagos podem gerar +R$ 2.400 esta semana',
    action: 'Otimizar agenda',
    icon: Target
  }
];

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState(generateMockData());
  const [realTimeData, setRealTimeData] = useState({
    activePatients: 142,
    todayAppointments: 23,
    monthlyRevenue: 45230,
    occupancyRate: 87,
    noShowRate: 12,
    avgSessionDuration: 45,
    patientSatisfaction: 92,
    aiPredictions: 15
  });

  // Simulação de dados em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeData(prev => ({
        ...prev,
        todayAppointments: prev.todayAppointments + (Math.random() > 0.7 ? 1 : 0),
        monthlyRevenue: prev.monthlyRevenue + Math.floor(Math.random() * 200)
      }));
    }, 30000); // Atualiza a cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  const KPICard = ({ title, value, change, icon: Icon, trend, color = "primary" }) => (
    <Card className="bg-gradient-card border-border hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {change && (
              <div className="flex items-center gap-1">
                {trend === 'up' ? (
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  trend === 'up' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {change}
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full bg-${color}/10`}>
            <Icon className={`w-6 h-6 text-${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header com alertas IA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            Dashboard Inteligente
          </h1>
          <p className="text-muted-foreground">Insights em tempo real com IA avançada</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Bell className="w-4 h-4 mr-2" />
            Alertas IA ({aiInsights.length})
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Nova Ação
          </Button>
        </div>
      </div>

      {/* Alertas Inteligentes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {aiInsights.map((insight, index) => {
          const Icon = insight.icon;
          return (
            <Alert key={index} className={`border-l-4 ${
              insight.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50/50' :
              insight.type === 'success' ? 'border-l-green-500 bg-green-50/50' :
              'border-l-blue-500 bg-blue-50/50'
            }`}>
              <Icon className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-semibold">{insight.title}</p>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                  <Button size="sm" variant="link" className="p-0 h-auto">
                    {insight.action} →
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          );
        })}
      </div>

      {/* KPIs Avançados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Pacientes Ativos"
          value={realTimeData.activePatients}
          change="+12%"
          trend="up"
          icon={Users}
        />
        <KPICard
          title="Agendamentos Hoje"
          value={realTimeData.todayAppointments}
          change="+5%"
          trend="up"
          icon={Calendar}
        />
        <KPICard
          title="Receita Mensal"
          value={`R$ ${realTimeData.monthlyRevenue.toLocaleString()}`}
          change="+18%"
          trend="up"
          icon={DollarSign}
        />
        <KPICard
          title="Taxa Ocupação"
          value={`${realTimeData.occupancyRate}%`}
          change="-2%"
          trend="down"
          icon={Target}
        />
      </div>

      {/* KPIs Secundários */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Taxa No-Show"
          value={`${realTimeData.noShowRate}%`}
          change="-3%"
          trend="up"
          icon={AlertTriangle}
          color="yellow"
        />
        <KPICard
          title="Duração Média"
          value={`${realTimeData.avgSessionDuration}min`}
          change="+2min"
          trend="up"
          icon={Clock}
        />
        <KPICard
          title="Satisfação NPS"
          value={`${realTimeData.patientSatisfaction}%`}
          change="+8%"
          trend="up"
          icon={CheckCircle}
          color="green"
        />
        <KPICard
          title="Predições IA"
          value={realTimeData.aiPredictions}
          change="+5"
          trend="up"
          icon={Brain}
          color="purple"
        />
      </div>

      {/* Gráficos Interativos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Receita */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="w-5 h-5" />
              Evolução da Receita (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).getDate().toString()} />
                <YAxis tickFormatter={(value) => `R$ ${value}`} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value) => [`R$ ${value}`, 'Receita']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Agendamentos */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Agendamentos vs No-Show
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).getDate().toString()} />
                <YAxis />
                <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
                <Legend />
                <Bar dataKey="appointments" fill="#82ca9d" name="Agendamentos" />
                <Bar dataKey="noShow" fill="#ff7300" name="No-Show" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição de Especialidades e Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Pizza */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Distribuição por Especialidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Percentual']} />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Métricas de Performance */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle>Performance da Clínica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Taxa de Ocupação</span>
                <span className="font-medium">87%</span>
              </div>
              <Progress value={87} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Satisfação do Cliente</span>
                <span className="font-medium">92%</span>
              </div>
              <Progress value={92} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Eficiência Operacional</span>
                <span className="font-medium">78%</span>
              </div>
              <Progress value={78} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Precisão IA</span>
                <span className="font-medium">85%</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Próximas Ações Recomendadas */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Ações Recomendadas pela IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Contatar pacientes de alto risco</p>
                  <p className="text-xs text-muted-foreground">3 pacientes com 85% chance de no-show</p>
                  <Badge variant="destructive" className="mt-1 text-xs">Alta Prioridade</Badge>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Otimizar horários vagos</p>
                  <p className="text-xs text-muted-foreground">5 slots disponíveis hoje</p>
                  <Badge variant="secondary" className="mt-1 text-xs">Média Prioridade</Badge>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Enviar pesquisa de satisfação</p>
                  <p className="text-xs text-muted-foreground">12 pacientes elegíveis</p>
                  <Badge variant="outline" className="mt-1 text-xs">Baixa Prioridade</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline de Atividades Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle>Agendamentos de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { time: '08:00', patient: 'Maria Silva', type: 'Fisioterapia', status: 'confirmed' },
                { time: '09:00', patient: 'João Santos', type: 'RPG', status: 'risk' },
                { time: '10:00', patient: 'Ana Costa', type: 'Pilates', status: 'confirmed' },
                { time: '11:00', patient: 'Pedro Lima', type: 'Fisioterapia', status: 'completed' }
              ].map((appointment, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono text-muted-foreground">{appointment.time}</div>
                    <div>
                      <p className="font-medium">{appointment.patient}</p>
                      <p className="text-sm text-muted-foreground">{appointment.type}</p>
                    </div>
                  </div>
                  <Badge variant={
                    appointment.status === 'completed' ? 'default' :
                    appointment.status === 'risk' ? 'destructive' : 'secondary'
                  }>
                    {appointment.status === 'completed' ? 'Concluído' :
                     appointment.status === 'risk' ? 'Risco' : 'Confirmado'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle>Atividades do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: 'IA detectou risco de no-show', time: '5 min atrás', type: 'ai' },
                { action: 'Novo paciente cadastrado', time: '15 min atrás', type: 'patient' },
                { action: 'Pagamento processado', time: '1 hora atrás', type: 'payment' },
                { action: 'Relatório mensal gerado', time: '2 horas atrás', type: 'report' }
              ].map((activity, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'ai' ? 'bg-purple-500' :
                    activity.type === 'patient' ? 'bg-blue-500' :
                    activity.type === 'payment' ? 'bg-green-500' : 'bg-orange-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Predições de IA */}
      <div className="mt-8">
        <AIPredictionsPanel />
      </div>

      {/* Centro de Comunicação Omnichannel */}
      <div className="mt-8">
        <CommunicationCenter />
      </div>

      {/* Módulo Financeiro Completo */}
      <div className="mt-8">
        <FinancialDashboard />
      </div>
    </div>
  );
};