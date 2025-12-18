import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, TrendingUp, AlertTriangle, Users, DollarSign, 
  Calendar, Target, Zap, BarChart3, Clock, CheckCircle,
  XCircle, MessageSquare, Sparkles, Trophy, Package
} from 'lucide-react';
import { useAppointmentPredictions, useRevenueForecasts, useStaffPerformance, useInventory } from '@/hooks/useInnovations';
import { useAppointments } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function SmartDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data: predictions = [] } = useAppointmentPredictions();
  const { data: forecasts = [] } = useRevenueForecasts();
  const { data: staffPerformance = [] } = useStaffPerformance();
  const { data: inventory = [] } = useInventory();
  const { data: appointments = [] } = useAppointments();
  const { data: patients = [] } = usePatients();
  
  // Calculate today's stats
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayAppointments = appointments.filter(a => (a as any).appointment_date === today);
  const completedToday = todayAppointments.filter(a => a.status === 'concluido').length;
  const pendingToday = todayAppointments.filter(a => a.status === 'agendado').length;
  
  // High-risk appointments (no-show probability > 30%)
  const highRiskAppointments = predictions.filter(p => p.no_show_probability > 0.3);
  
  // Low stock items
  const lowStockItems = inventory.filter(i => i.current_quantity <= i.minimum_quantity);
  
  // Revenue forecast data
  const revenueChartData = forecasts.slice(-30).map(f => ({
    date: format(new Date(f.forecast_date), 'dd/MM'),
    previsao: f.predicted_revenue,
    real: f.actual_revenue || 0,
  }));
  
  // Active patients stats
  const activePatients = patients.filter(p => p.status === 'Em Tratamento').length;
  const newPatientsThisMonth = patients.filter(p => {
    const createdAt = new Date(p.createdAt);
    const now = new Date();
    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
  }).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              Dashboard Inteligente
            </h1>
            <p className="text-muted-foreground mt-1">
              Análises preditivas e insights em tempo real
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            <Sparkles className="h-3 w-3 mr-1" />
            Powered by AI
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Hoje</span>
              </div>
              <p className="text-2xl font-bold mt-1">{todayAppointments.length}</p>
              <p className="text-xs text-muted-foreground">agendamentos</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Realizados</span>
              </div>
              <p className="text-2xl font-bold mt-1">{completedToday}</p>
              <p className="text-xs text-muted-foreground">de {todayAppointments.length}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Risco Alto</span>
              </div>
              <p className="text-2xl font-bold mt-1">{highRiskAppointments.length}</p>
              <p className="text-xs text-muted-foreground">possíveis faltas</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Pacientes</span>
              </div>
              <p className="text-2xl font-bold mt-1">{activePatients}</p>
              <p className="text-xs text-muted-foreground">ativos</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-rose-500" />
                <span className="text-xs text-muted-foreground">Estoque</span>
              </div>
              <p className="text-2xl font-bold mt-1">{lowStockItems.length}</p>
              <p className="text-xs text-muted-foreground">itens baixos</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-500" />
                <span className="text-xs text-muted-foreground">Novos</span>
              </div>
              <p className="text-2xl font-bold mt-1">{newPatientsThisMonth}</p>
              <p className="text-xs text-muted-foreground">este mês</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="predictions">Previsões</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="inventory">Estoque</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Revenue Forecast Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Previsão de Receita
                  </CardTitle>
                  <CardDescription>Comparação entre previsão e receita real</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Line type="monotone" dataKey="previsao" stroke="#3B82F6" strokeWidth={2} dot={false} name="Previsão" />
                        <Line type="monotone" dataKey="real" stroke="#10B981" strokeWidth={2} dot={false} name="Real" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* AI Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Insights da IA
                  </CardTitle>
                  <CardDescription>Recomendações baseadas em dados</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                      {highRiskAppointments.length > 0 && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-amber-600 dark:text-amber-400">Atenção: Risco de Faltas</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {highRiskAppointments.length} agendamentos têm mais de 30% de chance de não comparecimento. 
                                Considere enviar lembretes extras ou ligar para confirmar.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {lowStockItems.length > 0 && (
                        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                          <div className="flex items-start gap-2">
                            <Package className="h-5 w-5 text-rose-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-rose-600 dark:text-rose-400">Estoque Baixo</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {lowStockItems.length} itens estão abaixo do mínimo: {lowStockItems.slice(0, 3).map(i => i.item_name).join(', ')}
                                {lowStockItems.length > 3 && ` e mais ${lowStockItems.length - 3}...`}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-start gap-2">
                          <TrendingUp className="h-5 w-5 text-emerald-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-emerald-600 dark:text-emerald-400">Tendência Positiva</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Você teve {newPatientsThisMonth} novos pacientes este mês. Continue investindo em marketing digital para manter o crescimento.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-5 w-5 text-blue-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-blue-600 dark:text-blue-400">Engajamento WhatsApp</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Pacientes que recebem exercícios via WhatsApp têm 40% mais adesão ao tratamento. Configure o envio automático de protocolos.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <div className="flex items-start gap-2">
                          <Trophy className="h-5 w-5 text-purple-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-purple-600 dark:text-purple-400">Gamificação</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Ative o sistema de gamificação para aumentar a retenção de pacientes em até 25%.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* No-Show Predictions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Previsão de Faltas
                  </CardTitle>
                  <CardDescription>Agendamentos com maior risco de não comparecimento</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {predictions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Ainda não há previsões disponíveis. O sistema aprende com o histórico de agendamentos.
                        </p>
                      ) : (
                        predictions.slice(0, 10).map((prediction) => (
                          <div 
                            key={prediction.id}
                            className={`p-3 rounded-lg border ${
                              prediction.no_show_probability > 0.5 
                                ? 'bg-rose-500/10 border-rose-500/20'
                                : prediction.no_show_probability > 0.3
                                ? 'bg-amber-500/10 border-amber-500/20'
                                : 'bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Paciente #{prediction.patient_id.slice(0, 8)}</span>
                              <Badge variant={prediction.no_show_probability > 0.5 ? 'destructive' : 'secondary'}>
                                {Math.round(prediction.no_show_probability * 100)}% risco
                              </Badge>
                            </div>
                            {prediction.risk_factors && prediction.risk_factors.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {prediction.risk_factors.slice(0, 3).map((factor, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {factor}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {prediction.recommended_actions && prediction.recommended_actions.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-2">
                                💡 {prediction.recommended_actions[0]}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Revenue Predictions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Previsão de Receita
                  </CardTitle>
                  <CardDescription>Próximos 7 dias</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...Array(7)].map((_, i) => {
                      const date = addDays(new Date(), i);
                      const forecast = forecasts.find(f => f.forecast_date === format(date, 'yyyy-MM-dd'));
                      const predictedRevenue = forecast?.predicted_revenue || 0;
                      const maxRevenue = 5000;
                      
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className={i === 0 ? 'font-medium' : 'text-muted-foreground'}>
                              {i === 0 ? 'Hoje' : format(date, 'EEEE', { locale: ptBR })}
                            </span>
                            <span className="font-medium">
                              R$ {predictedRevenue.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <Progress value={(predictedRevenue / maxRevenue) * 100} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance da Equipe
                </CardTitle>
                <CardDescription>Métricas de desempenho dos profissionais</CardDescription>
              </CardHeader>
              <CardContent>
                {staffPerformance.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Ainda não há dados de performance. As métricas são calculadas automaticamente ao final de cada dia.
                  </p>
                ) : (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={staffPerformance.slice(0, 30)}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="metric_date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Bar dataKey="completed_appointments" fill="#10B981" name="Realizados" />
                        <Bar dataKey="cancelled_appointments" fill="#F59E0B" name="Cancelados" />
                        <Bar dataKey="no_show_appointments" fill="#EF4444" name="Faltas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Controle de Estoque
                </CardTitle>
                <CardDescription>Itens que precisam de reposição</CardDescription>
              </CardHeader>
              <CardContent>
                {inventory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum item cadastrado no estoque. Acesse a página de Estoque para adicionar itens.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {inventory.map((item) => {
                      const percentage = (item.current_quantity / Math.max(item.minimum_quantity * 2, 1)) * 100;
                      const isLow = item.current_quantity <= item.minimum_quantity;
                      
                      return (
                        <div key={item.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className={isLow ? 'font-medium text-rose-500' : ''}>
                                {item.item_name}
                              </span>
                              {isLow && (
                                <Badge variant="destructive" className="text-xs">Baixo</Badge>
                              )}
                            </div>
                            <span className="text-muted-foreground">
                              {item.current_quantity} / {item.minimum_quantity * 2} {item.unit}
                            </span>
                          </div>
                          <Progress 
                            value={Math.min(percentage, 100)} 
                            className={`h-2 ${isLow ? '[&>div]:bg-rose-500' : ''}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
