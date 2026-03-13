import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Send, 
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

/**
 * CRMAutomationDashboard
 * Painel de monitoramento das automações Inngest + WhatsApp
 */
export function CRMAutomationDashboard() {
  // Simulando dados que virão da API/Hasura
  const stats = {
    sentToday: 124,
    pending: 5,
    failed: 2,
    conversionRate: 85,
    activeAutomations: [
      { id: 1, name: 'Lembrete 24h', status: 'active', count: 45, success: 98 },
      { id: 2, name: 'Boas-vindas', status: 'active', count: 12, success: 100 },
      { id: 3, name: 'Feedback Pós-Sessão', status: 'active', count: 38, success: 92 },
      { id: 4, name: 'Aniversariantes', status: 'idle', count: 3, success: 100 },
    ]
  };

  return (
    <div className="space-y-6 p-1">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Enviadas (Hoje)</CardTitle>
            <Send className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sentToday}</div>
            <p className="text-xs text-emerald-500 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" /> +12% que ontem
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Confirmadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <Progress value={stats.conversionRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card className="bg-white/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Agendadas (Fila)</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-slate-400 mt-1">Aguardando gatilho</p>
          </CardContent>
        </Card>

        <Card className="bg-white/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Falhas</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed}</div>
            <p className="text-xs text-destructive mt-1 flex items-center">
              Atenção necessária
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Status por Automação</CardTitle>
              <CardDescription>Desempenho dos fluxos ativos no Inngest</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl h-8">
              <RefreshCw className="h-3.5 w-3.5 mr-2" /> Sincronizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {stats.activeAutomations.map((auto) => (
              <div key={auto.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${auto.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{auto.name}</div>
                    <div className="text-xs text-slate-500">{auto.count} envios este mês</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm font-medium">{auto.success}% sucesso</div>
                    <Progress value={auto.success} className="w-24 h-1 mt-1" />
                  </div>
                  <div className={`h-2 w-2 rounded-full ${auto.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
