import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Zap, Activity, Clock, CheckCircle2, XCircle } from "lucide-react";

export function AutomationsDashboardPage() {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("ativas");

  // Mock data for the dashboard
  const automations = [
    {
      id: "auto-1",
      name: "Boas-vindas (Onboarding)",
      category: "Retenção e Relacionamento",
      status: true,
      lastRun: "Há 10 minutos",
      runsMonth: 142,
      failures: 0,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200"
    },
    {
      id: "auto-2",
      name: "Confirmação Inteligente de Agenda",
      category: "Operacional e Agenda",
      status: true,
      lastRun: "Há 2 horas",
      runsMonth: 385,
      failures: 2,
      color: "bg-indigo-50 text-indigo-700 border-indigo-200"
    },
    {
      id: "auto-3",
      name: "Pesquisa NPS (Pós-Sessão)",
      category: "Retenção e Relacionamento",
      status: false,
      lastRun: "Há 5 dias",
      runsMonth: 89,
      failures: 0,
      color: "bg-blue-50 text-blue-700 border-blue-200"
    }
  ];

  const logs = [
    { id: "log-1", automation: "Confirmação Inteligente", time: "Hoje, 14:30", status: "success", target: "João Silva" },
    { id: "log-2", automation: "Boas-vindas", time: "Hoje, 11:15", status: "success", target: "Maria Oliveira" },
    { id: "log-3", automation: "Confirmação Inteligente", time: "Hoje, 09:00", status: "error", target: "Carlos Sousa (WhatsApp desconectado)" },
  ];

  return (
    <PageLayout 
      title="Automações" 
      subtitle="Gerencie seus fluxos automáticos e poupe tempo da sua equipe."
      actions={
        <Button onClick={() => navigate("/automacoes/templates")}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Automação
        </Button>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="ativas">Meus Fluxos</TabsTrigger>
          <TabsTrigger value="logs">Histórico e Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="ativas" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">Fluxos Ativos</CardTitle>
                <Zap className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">Execuções no Mês</CardTitle>
                <Activity className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">616</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">Taxa de Sucesso</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">99.6%</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automations.map(auto => (
              <Card key={auto.id} className={`border-l-4 ${auto.status ? "border-l-emerald-500" : "border-l-slate-300"}`}>
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {auto.name}
                      <Badge variant="outline" className={`font-normal ${auto.color}`}>
                        {auto.category}
                      </Badge>
                    </CardTitle>
                  </div>
                  <Switch checked={auto.status} />
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Última execução: {auto.lastRun}
                    </div>
                    <div className="flex gap-4">
                      <span><strong>{auto.runsMonth}</strong> vezes/mês</span>
                      {auto.failures > 0 && <span className="text-red-500"><strong>{auto.failures}</strong> falhas</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Histórico Recente</CardTitle>
              <CardDescription>Veja o que foi executado recentemente pelas suas automações.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logs.map(log => (
                  <div key={log.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      {log.status === "success" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium text-slate-800">{log.automation}</p>
                        <p className="text-sm text-slate-500">Alvo: {log.target}</p>
                      </div>
                    </div>
                    <div className="text-sm text-slate-500">
                      {log.time}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}

export default AutomationsDashboardPage;