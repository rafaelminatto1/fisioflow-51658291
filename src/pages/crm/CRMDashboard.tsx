// Lazy load LeadImport (contém exceljs - ~946KB) - só carrega quando a tab é acessada

import {
  Award,
  BarChart3,
  Bot,
  CheckSquare,
  Heart,
  Loader2,
  Send,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { CRMAnalytics } from "@/components/crm/CRMAnalytics";
import { CRMAutomacoes } from "@/components/crm/CRMAutomacoes";
import { CRMAutomationDashboard } from "@/components/crm/CRMAutomationDashboard";
import { CRMCampanhas } from "@/components/crm/CRMCampanhas";
import { CRMTarefas } from "@/components/crm/CRMTarefas";
import { LeadsContent } from "@/components/crm/LeadsContent";
import { NPSDashboard } from "@/components/crm/NPSDashboard";
import { ReferralsRanking } from "@/components/crm/ReferralsRanking";
import { PageLayout, PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LeadImport = lazy(() =>
  import("@/components/crm/LeadImport").then((m) => ({
    default: m.LeadImport,
  })),
);

export default function CRMDashboard() {
  const [activeTab, setActiveTab] = useState("leads");

  return (
    <PageLayout>
      <PageContainer>
        <PageHeader
          title="CRM & Automações"
          subtitle="Gerencie pacientes em potencial, campanhas, tarefas e os robôs do FisioFlow"
        />
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-64 shrink-0 space-y-6">
              <TabsList className="flex flex-col h-auto bg-transparent p-0 w-full space-y-5">
                {/* Grupo 1: Operação Comercial */}
                <div className="w-full space-y-1">
                  <p className="px-3 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
                    Pipeline & Operação
                  </p>
                  <TabsTrigger
                    value="leads"
                    className="w-full justify-start gap-3 rounded-xl px-3.5 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold transition-all hover:bg-muted/60 border border-transparent data-[state=active]:border-primary/20 text-xs"
                  >
                    <Users className="h-4 w-4" />
                    <span>Pipeline de Leads</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="tarefas"
                    className="w-full justify-start gap-3 rounded-xl px-3.5 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold transition-all hover:bg-muted/60 border border-transparent data-[state=active]:border-primary/20 text-xs"
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>Tarefas de Follow-up</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="importar"
                    className="w-full justify-start gap-3 rounded-xl px-3.5 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold transition-all hover:bg-muted/60 border border-transparent data-[state=active]:border-primary/20 text-xs"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Importar Leads</span>
                  </TabsTrigger>
                </div>

                {/* Grupo 2: Comunicação e Automações */}
                <div className="w-full space-y-1">
                  <p className="px-3 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
                    Robôs & Disparos
                  </p>
                  <TabsTrigger
                    value="campanhas"
                    className="w-full justify-start gap-3 rounded-xl px-3.5 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold transition-all hover:bg-muted/60 border border-transparent data-[state=active]:border-primary/20 text-xs"
                  >
                    <Send className="h-4 w-4" />
                    <span>Campanhas Manuais</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="regras_automacao"
                    className="w-full justify-start gap-3 rounded-xl px-3.5 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold transition-all hover:bg-muted/60 border border-transparent data-[state=active]:border-primary/20 text-xs"
                  >
                    <Zap className="h-4 w-4" />
                    <span>Regras de Automação</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="monitor_robo"
                    className="w-full justify-start gap-3 rounded-xl px-3.5 py-2.5 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:font-semibold transition-all hover:bg-muted/60 border border-transparent data-[state=active]:border-emerald-500/20 text-xs"
                  >
                    <Bot className="h-4 w-4" />
                    <span>Monitor do Robô IA</span>
                  </TabsTrigger>
                </div>

                {/* Grupo 3: Performance & Crescimento */}
                <div className="w-full space-y-1">
                  <p className="px-3 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
                    Métricas & Retenção
                  </p>
                  <TabsTrigger
                    value="analytics"
                    className="w-full justify-start gap-3 rounded-xl px-3.5 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold transition-all hover:bg-muted/60 border border-transparent data-[state=active]:border-primary/20 text-xs"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Analytics Comercial</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="nps"
                    className="w-full justify-start gap-3 rounded-xl px-3.5 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold transition-all hover:bg-muted/60 border border-transparent data-[state=active]:border-primary/20 text-xs"
                  >
                    <Heart className="h-4 w-4" />
                    <span>NPS & Satisfação</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="indicacoes"
                    className="w-full justify-start gap-3 rounded-xl px-3.5 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold transition-all hover:bg-muted/60 border border-transparent data-[state=active]:border-primary/20 text-xs"
                  >
                    <Award className="h-4 w-4" />
                    <span>Ranking Indicações</span>
                  </TabsTrigger>
                </div>
              </TabsList>
            </div>

            <div className="flex-1 min-w-0 bg-card rounded-2xl border shadow-sm p-1">
              <TabsContent
                value="leads"
                className="m-0 p-4 lg:p-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
              >
                <LeadsContent />
              </TabsContent>

              <TabsContent
                value="campanhas"
                className="m-0 p-4 lg:p-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
              >
                <CRMCampanhas />
              </TabsContent>

              <TabsContent
                value="regras_automacao"
                className="m-0 p-4 lg:p-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
              >
                <CRMAutomacoes />
              </TabsContent>

              <TabsContent
                value="monitor_robo"
                className="m-0 p-4 lg:p-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
              >
                <CRMAutomationDashboard />
              </TabsContent>

              <TabsContent
                value="tarefas"
                className="m-0 p-4 lg:p-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
              >
                <CRMTarefas />
              </TabsContent>

              <TabsContent
                value="nps"
                className="m-0 p-4 lg:p-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
              >
                <NPSDashboard />
              </TabsContent>

              <TabsContent
                value="indicacoes"
                className="m-0 p-4 lg:p-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
              >
                <ReferralsRanking />
              </TabsContent>

              <TabsContent
                value="analytics"
                className="m-0 p-4 lg:p-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
              >
                <CRMAnalytics />
              </TabsContent>

              <TabsContent
                value="importar"
                className="m-0 p-4 lg:p-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
              >
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center space-y-4">
                        <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
                        <p className="text-muted-foreground">Carregando importador seguro...</p>
                      </div>
                    </div>
                  }
                >
                  <LeadImport />
                </Suspense>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </PageContainer>
    </PageLayout>
  );
}
