import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain, TrendingUp, AlertTriangle, Users, DollarSign,
  Calendar, BarChart3, CheckCircle,
  MessageSquare, Sparkles, Trophy, Package
} from 'lucide-react';
import { useAppointmentPredictions, useRevenueForecasts, useStaffPerformance, useInventory } from '@/hooks/useInnovations';
import { useAppointments } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

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
    <MainLayout maxWidth="xl">
      <div className="space-y-4 sm:space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                Dashboard Inteligente
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block mt-1">
                Análises preditivas e insights em tempo real
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] sm:text-xs w-fit">
            <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
            AI
          </Badge>
        </div>

        {/* Quick Stats - Mobile Optimized */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">Hoje</span>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1">{todayAppointments.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">agendamentos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">Realizados</span>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1">{completedToday}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">de {todayAppointments.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
                <span className="text-[10px] sm:text-xs text-muted-foreground hidden xs:inline">Risco</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">Risco Alto</span>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1">{highRiskAppointments.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">falta(s)</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">Pacientes</span>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1">{activePatients}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">ativos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20 hidden sm:block">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">Estoque</span>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1">{lowStockItems.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">itens baixos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 hidden lg:block">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-500" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">Novos</span>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1">{newPatientsThisMonth}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">este mês</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-2xl h-12 sm:h-auto">
            <TabsTrigger value="overview" className="text-[10px] sm:text-xs">Visão Geral</TabsTrigger>
            <TabsTrigger value="predictions" className="text-[10px] sm:text-xs">Previsões</TabsTrigger>
            <TabsTrigger value="performance" className="text-[10px] sm:text-xs">Performance</TabsTrigger>
            <TabsTrigger value="inventory" className="text-[10px] sm:text-xs">Estoque</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Revenue Forecast Chart */}
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden xs:inline">Previsão de Receita</span>
                    <span className="xs:hidden">Receita</span>
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs">Comparação entre previsão e receita real</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="h-[200px] sm:h-[250px] md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-[10px] sm:text-xs" />
                        <YAxis className="text-[10px] sm:text-xs" />
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
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden xs:inline">Insights da IA</span>
                    <span className="xs:hidden">Insights</span>
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs">Recomendações baseadas em dados</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <ScrollArea className="h-[200px] sm:h-[250px] md:h-[300px]">
                    <div className="space-y-2 sm:space-y-4">
                      {highRiskAppointments.length > 0 && (
                        <div className="p-2 sm:p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <div className="flex items-start gap-1.5 sm:gap-2">
                            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-amber-600 dark:text-amber-400 text-xs sm:text-sm">Atenção: Risco de Faltas</p>
                              <p className="text-[10px] sm:text-sm text-muted-foreground mt-1">
                                {highRiskAppointments.length} agendamentos têm mais de 30% de chance de não comparecimento.
                                Considere enviar lembretes extras ou ligar para confirmar.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {lowStockItems.length > 0 && (
                        <div className="p-2 sm:p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                          <div className="flex items-start gap-1.5 sm:gap-2">
                            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-rose-500 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-rose-600 dark:text-rose-400 text-xs sm:text-sm">Estoque Baixo</p>
                              <p className="text-[10px] sm:text-sm text-muted-foreground mt-1">
                                {lowStockItems.length} itens estão abaixo do mínimo: {lowStockItems.slice(0, 3).map(i => i.item_name).join(', ')}
                                {lowStockItems.length > 3 && ` e mais ${lowStockItems.length - 3}...`}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="p-2 sm:p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-start gap-1.5 sm:gap-2">
                          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">Tendência Positiva</p>
                            <p className="text-[10px] sm:text-sm text-muted-foreground mt-1">
                              Você teve {newPatientsThisMonth} novos pacientes este mês. Continue investindo em marketing digital para manter o crescimento.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-2 sm:p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div className="flex items-start gap-1.5 sm:gap-2">
                          <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-blue-600 dark:text-blue-400 text-xs sm:text-sm">Engajamento WhatsApp</p>
                            <p className="text-[10px] sm:text-sm text-muted-foreground mt-1">
                              Pacientes que recebem exercícios via WhatsApp têm 40% mais adesão ao tratamento. Configure o envio automático de protocolos.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-2 sm:p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <div className="flex items-start gap-1.5 sm:gap-2">
                          <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-purple-600 dark:text-purple-400 text-xs sm:text-sm">Gamificação</p>
                            <p className="text-[10px] sm:text-sm text-muted-foreground mt-1">
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

          <TabsContent value="predictions" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* No-Show Predictions */}
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden xs:inline">Previsão de Faltas</span>
                    <span className="xs:hidden">Faltas</span>
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs">Agendamentos com maior risco de não comparecimento</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <ScrollArea className="h-[250px] sm:h-[300px] md:h-[400px]">
                    <div className="space-y-2 sm:space-y-3">
                      {predictions.length === 0 ? (
                        <p className="text-[10px] sm:text-sm text-muted-foreground text-center py-8">
                          Ainda não há previsões disponíveis. O sistema aprende com o histórico de agendamentos.
                        </p>
                      ) : (
                        predictions.slice(0, 10).map((prediction) => (
                          <div
                            key={prediction.id}
                            className={`p-2 sm:p-3 rounded-lg border ${
                              prediction.no_show_probability > 0.5
                                ? 'bg-rose-500/10 border-rose-500/20'
                                : prediction.no_show_probability > 0.3
                                ? 'bg-amber-500/10 border-amber-500/20'
                                : 'bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-xs sm:text-sm truncate">Paciente #{prediction.patient_id.slice(0, 8)}</span>
                              <Badge variant={prediction.no_show_probability > 0.5 ? 'destructive' : 'secondary'} className="text-[10px] sm:text-xs shrink-0">
                                {Math.round(prediction.no_show_probability * 100)}% risco
                              </Badge>
                            </div>
                            {prediction.risk_factors && prediction.risk_factors.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {prediction.risk_factors.slice(0, 3).map((factor, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px] sm:text-xs">
                                    {factor}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {prediction.recommended_actions && prediction.recommended_actions.length > 0 && (
                              <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                                {prediction.recommended_actions[0]}
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
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden xs:inline">Previsão de Receita</span>
                    <span className="xs:hidden">Receita</span>
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs">Próximos 7 dias</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="space-y-2 sm:space-y-4">
                    {[...Array(7)].map((_, i) => {
                      const date = addDays(new Date(), i);
                      const forecast = forecasts.find(f => f.forecast_date === format(date, 'yyyy-MM-dd'));
                      const predictedRevenue = forecast?.predicted_revenue || 0;
                      const maxRevenue = 5000;

                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                            <span className={i === 0 ? 'font-medium' : 'text-muted-foreground'}>
                              {i === 0 ? 'Hoje' : format(date, 'EEE', { locale: ptBR })}
                            </span>
                            <span className="font-medium text-[10px] sm:text-xs">
                              R$ {predictedRevenue.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <Progress value={(predictedRevenue / maxRevenue) * 100} className="h-1.5 sm:h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden xs:inline">Performance da Equipe</span>
                  <span className="xs:hidden">Performance</span>
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">Métricas de desempenho dos profissionais</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                {staffPerformance.length === 0 ? (
                  <p className="text-[10px] sm:text-sm text-muted-foreground text-center py-8">
                    Ainda não há dados de performance. As métricas são calculadas automaticamente ao final de cada dia.
                  </p>
                ) : (
                  <div className="h-[250px] sm:h-[300px] md:h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={staffPerformance.slice(0, 30)}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="metric_date" className="text-[10px] sm:text-xs" />
                        <YAxis className="text-[10px] sm:text-xs" />
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

          <TabsContent value="inventory" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                  Controle de Estoque
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">Itens que precisam de reposição</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                {inventory.length === 0 ? (
                  <p className="text-[10px] sm:text-sm text-muted-foreground text-center py-8">
                    Nenhum item cadastrado no estoque. Acesse a página de Estoque para adicionar itens.
                  </p>
                ) : (
                  <div className="space-y-2 sm:space-y-4">
                    {inventory.map((item) => {
                      const percentage = (item.current_quantity / Math.max(item.minimum_quantity * 2, 1)) * 100;
                      const isLow = item.current_quantity <= item.minimum_quantity;

                      return (
                        <div key={item.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                              <span className={`font-medium truncate ${isLow ? 'text-rose-500' : ''}`}>
                                {item.item_name}
                              </span>
                              {isLow && (
                                <Badge variant="destructive" className="text-[10px] sm:text-xs shrink-0">Baixo</Badge>
                              )}
                            </div>
                            <span className="text-muted-foreground text-[10px] sm:text-xs shrink-0">
                              {item.current_quantity} / {item.minimum_quantity * 2} {item.unit}
                            </span>
                          </div>
                          <Progress
                            value={Math.min(percentage, 100)}
                            className={`h-1.5 sm:h-2 ${isLow ? '[&>div]:bg-rose-500' : ''}`}
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
