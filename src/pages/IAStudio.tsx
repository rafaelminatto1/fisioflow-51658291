import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { PageLayout, PageContainer } from "@/components/layout/PageLayout";
import {
  Activity,
  TrendingUp,
  Zap,
  ChevronRight,
  ShieldCheck,
  Bot,
  Target,
  AlertTriangle,
  ArrowUpRight,
  X,
  DollarSign,
  FileText,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScribeDrawer } from "@/features/ia-studio/components/ScribeDrawer";
import { FisioADM } from "@/features/ia-studio/components/FisioADM";
import { FisioRetention } from "@/features/ia-studio/components/FisioRetention";
import { FisioPredictIndicator } from "@/features/ia-studio/components/FisioPredictIndicator";
import { GaitAnalysisStudio } from "@/features/ia-studio/components/GaitAnalysisStudio";
import { PremiumReportGenerator } from "@/features/ia-studio/components/PremiumReportGenerator";
import { IAInsightsBar } from "@/features/ia-studio/components/IAInsightsBar";
import { AgentHub } from "@/features/ia-studio/components/AgentHub";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getWorkersApiUrl } from "@/lib/api/config";

export const IAStudioWorkspace: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { data: usageData } = useQuery({
    queryKey: ["ai-usage-weekly"],
    queryFn: async () => {
      const res = await fetch(`${getWorkersApiUrl()}/api/ai/usage/weekly`);
      if (!res.ok) return null;
      return res.json() as Promise<{
        totalCalls: number;
        totalTokens: number;
        avgLatencyMs: number;
        fallbackCalls: number;
      }>;
    },
    staleTime: 1000 * 60 * 5,
  });
  const [isScribeOpen, setIsScribeOpen] = useState(false);
  const [isADMOpen, setIsADMOpen] = useState(false);
  const [isGaitOpen, setIsGaitOpen] = useState(false);
  const [isAgentHubOpen, setIsAgentHubOpen] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState<
    "retention" | "predict" | "report" | null
  >(null);

  const tools = [
    {
      id: "scribe",
      name: "AI Scribe",
      description: "Evolução por voz e SOAP estruturado",
      icon: Mic,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      action: () => setIsScribeOpen(true),
    },
    {
      id: "adm",
      name: "FisioADM Pro",
      description: "Goniometria digital via MediaPipe",
      icon: Target,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      action: () => setIsADMOpen(true),
    },
    {
      id: "gait",
      name: "GaitStudio 2.0",
      description: "Análise de marcha e postura",
      icon: Activity,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      action: () => setIsGaitOpen(true),
    },
    {
      id: "soap",
      name: "Agent Hub Clínico",
      description: "SOAP, simulação e raciocínio clínico",
      icon: Bot,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      action: () => setIsAgentHubOpen(true),
    },
    {
      id: "predict",
      name: "Predictive Alta",
      description: "Previsão de alta e evolução",
      icon: Zap,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      action: () => setActiveFeatureTab(activeFeatureTab === "predict" ? null : "predict"),
    },
    {
      id: "report",
      name: "Relatórios IA",
      description: "Síntese para médico, paciente e evolução",
      icon: FileText,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
      action: () => setActiveFeatureTab(activeFeatureTab === "report" ? null : "report"),
    },
  ];

  return (
    <div
      className={cn(
        "mx-auto max-w-[1600px] space-y-8 bg-slate-50 dark:bg-slate-950",
        embedded ? "p-0 pb-10" : "min-h-screen p-4 pb-32 md:p-8",
      )}
    >
      <FisioADM isOpen={isADMOpen} onClose={() => setIsADMOpen(false)} />
      <GaitAnalysisStudio isOpen={isGaitOpen} onClose={() => setIsGaitOpen(false)} />
      <AgentHub isOpen={isAgentHubOpen} onClose={() => setIsAgentHubOpen(false)} />
      <ScribeDrawer isOpen={isScribeOpen} onClose={() => setIsScribeOpen(false)} patientId="test" />

      <IAInsightsBar />

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-4">
        <div className="space-y-8 xl:col-span-3">
          <AnimatePresence mode="wait">
            {activeFeatureTab ? (
              <motion.div
                key={activeFeatureTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="relative rounded-2xl border border-slate-100 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900 md:p-8"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-6 right-6"
                  onClick={() => setActiveFeatureTab(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
                {activeFeatureTab === "predict" && <FisioPredictIndicator patientId="test" />}
                {activeFeatureTab === "retention" && <FisioRetention />}
                {activeFeatureTab === "report" && (
                  <PremiumReportGenerator patientId="test" patientName="Paciente Teste" />
                )}
              </motion.div>
            ) : (
              <div className="space-y-10">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {tools.map((tool) => (
                    <motion.div
                      key={tool.id}
                      whileHover={{ y: -5, scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Card
                        className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                        onClick={tool.action}
                      >
                        <CardContent className="relative flex min-h-[132px] items-center gap-5 p-5">
                          <div
                            className={cn(
                              "absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-700",
                              tool.bg,
                            )}
                          />

                          <div
                            className={cn(
                              "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl shadow-inner transition-transform duration-300 group-hover:scale-105",
                              tool.bg,
                            )}
                          >
                            <tool.icon className={cn("h-7 w-7", tool.color)} />
                          </div>
                          <div className="flex-1 space-y-2 relative z-10">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                {tool.name}
                              </h3>
                              <div
                                className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-full opacity-0 transition-all group-hover:opacity-100",
                                  tool.bg,
                                )}
                              >
                                <ChevronRight className={cn("h-4 w-4", tool.color)} />
                              </div>
                            </div>
                            <p className="text-sm font-medium leading-relaxed text-slate-500">
                              {tool.description}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <section className="group relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white md:p-8">
                  <div className="absolute right-0 top-0 p-8 opacity-10 transition-opacity group-hover:opacity-20">
                    <TrendingUp className="h-40 w-40" />
                  </div>
                  <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-400">
                        <TrendingUp className="h-3 w-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">
                          Produtividade clínica
                        </span>
                      </div>
                      <h2 className="max-w-2xl text-2xl font-black uppercase tracking-tight md:text-3xl">
                        Documentação, raciocínio e relatórios no mesmo fluxo.
                      </h2>
                      <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-400">
                        Inicie pelo Scribe durante o atendimento, revise no Agent Hub e gere
                        sínteses clínicas sem sair da central.
                      </p>
                    </div>
                    <Button
                      className="h-12 rounded-xl bg-blue-600 px-6 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-blue-500/20 hover:bg-blue-500"
                      onClick={() => setIsScribeOpen(true)}
                    >
                      <Mic className="mr-2 h-4 w-4" />
                      Ativar Scribe
                    </Button>
                  </div>
                </section>
              </div>
            )}
          </AnimatePresence>
        </div>

        <aside className="space-y-6 xl:col-span-1">
          <Card className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="p-6 pb-0 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Risco de Churn
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8"
                onClick={() => setActiveFeatureTab("retention")}
              >
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
            <FisioRetention compact />
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-2xl h-12 font-bold gap-2"
                onClick={() => toast.success("Automação de reengajamento ativada!")}
              >
                Automação Ativa
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            {[
              {
                label: "Precisão do Scribe",
                value: "98.2%",
                color: "text-emerald-500",
                icon: ShieldCheck,
              },
              {
                label: "Tempo Economizado",
                value: "14h/mês",
                color: "text-blue-500",
                icon: Zap,
              },
            ].map((stat, i) => (
              <Card
                key={i}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">
                    {stat.label}
                  </span>
                  <span className={cn("text-2xl font-black tracking-tighter", stat.color)}>
                    {stat.value}
                  </span>
                </div>
                <stat.icon className={cn("w-8 h-8 opacity-10", stat.color)} />
              </Card>
            ))}

            <Card className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Uso IA (7 dias)
                </span>
                <DollarSign className="w-4 h-4 text-emerald-400 opacity-60" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xl font-black tracking-tighter text-emerald-500">
                    {usageData?.totalCalls ?? "—"}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 block">chamadas</span>
                </div>
                <div>
                  <span className="text-xl font-black tracking-tighter text-indigo-500">
                    {usageData?.totalTokens != null
                      ? `${(usageData.totalTokens / 1000).toFixed(1)}k`
                      : "—"}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 block">tokens</span>
                </div>
                <div>
                  <span className="text-xl font-black tracking-tighter text-slate-700 dark:text-slate-200">
                    {usageData?.avgLatencyMs != null ? `${usageData.avgLatencyMs}ms` : "—"}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 block">latência</span>
                </div>
                <div>
                  <span className="text-xl font-black tracking-tighter text-amber-500">
                    {usageData?.fallbackCalls ?? "—"}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 block">fallbacks</span>
                </div>
              </div>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
};

export const IAStudio: React.FC = () => {
  return (
    <PageLayout>
      <PageContainer>
        <PageHeader
          title="IA Studio Central"
          actions={
            <Button
              className="rounded-xl h-10 px-6 font-bold bg-blue-600 text-white shadow-lg shadow-blue-500/20"
              disabled
            >
              Studio
            </Button>
          }
        />
        <IAStudioWorkspace />
      </PageContainer>
    </PageLayout>
  );
};

export default IAStudio;
