import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Mic,
  Activity,
  MessageSquare,
  TrendingUp,
  Zap,
  ChevronRight,
  ShieldCheck,
  Lock,
  User,
  MonitorPlay,
  FileText,
  BrainCircuit,
  AlertCircle,
  ArrowRight,
  Bot,
  Target,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export const IAStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isScribeOpen, setIsScribeOpen] = useState(false);
  const [isADMOpen, setIsADMOpen] = useState(false);
  const [isGaitOpen, setIsGaitOpen] = useState(false);
  const [isAgentHubOpen, setIsAgentHubOpen] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState<
    "retention" | "predict" | "report" | null
  >(null);

  const tools = [
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
      name: "Agent Hub",
      description: "Revisores de SOAP e Simuladores",
      icon: Bot,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
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
  ];

  return (
    <MainLayout>
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
        {/* Modals/Overlays */}
        <FisioADM isOpen={isADMOpen} onClose={() => setIsADMOpen(false)} />
        <GaitAnalysisStudio isOpen={isGaitOpen} onClose={() => setIsGaitOpen(false)} />
        <AgentHub isOpen={isAgentHubOpen} onClose={() => setIsAgentHubOpen(false)} />
        <ScribeDrawer
          isOpen={isScribeOpen}
          onClose={() => setIsScribeOpen(false)}
          patientId="test"
        />

        {/* Top Bar - Brand & Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Bot className="text-white w-5 h-5" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">
                FisioFlow Intelligence
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none italic uppercase">
              IA Studio <span className="text-blue-600">Central</span>
            </h1>
            <p className="text-slate-500 font-medium max-w-xl">
              Sua central de inteligência clínica operacional. Automatize diagnósticos, revise
              prontuários e monitore a retenção de pacientes.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            {["dashboard", "settings"].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "ghost"}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "rounded-xl h-10 px-6 font-bold capitalize transition-all",
                  activeTab === tab
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "text-slate-500",
                )}
              >
                {tab}
              </Button>
            ))}
          </div>
        </div>

        <IAInsightsBar />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content Area */}
          <div className="xl:col-span-3 space-y-10">
            <AnimatePresence mode="wait">
              {activeFeatureTab ? (
                <motion.div
                  key={activeFeatureTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="p-8 rounded-[40px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl relative"
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
                  {/* Action Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tools.map((tool) => (
                      <motion.div
                        key={tool.id}
                        whileHover={{ y: -5, scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <Card
                          className="group cursor-pointer border-none shadow-sm hover:shadow-2xl transition-all duration-500 bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden"
                          onClick={tool.action}
                        >
                          <CardContent className="p-8 flex items-center gap-8 relative">
                            <div
                              className={cn(
                                "absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-700",
                                tool.bg,
                              )}
                            />

                            <div
                              className={cn(
                                "w-20 h-20 rounded-[24px] flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500",
                                tool.bg,
                              )}
                            >
                              <tool.icon className={cn("w-10 h-10", tool.color)} />
                            </div>
                            <div className="flex-1 space-y-2 relative z-10">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                                  {tool.name}
                                </h3>
                                <div
                                  className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all",
                                    tool.bg,
                                  )}
                                >
                                  <ChevronRight className={cn("w-5 h-5", tool.color)} />
                                </div>
                              </div>
                              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                                {tool.description}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  {/* Promo Section */}
                  <section className="p-10 rounded-[40px] bg-gradient-to-br from-slate-900 to-slate-950 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                      <TrendingUp className="w-48 h-48" />
                    </div>
                    <div className="relative z-10 space-y-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <TrendingUp className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">
                          Efficiency Boost: +40%
                        </span>
                      </div>
                      <h2 className="text-4xl font-black tracking-tighter leading-none italic uppercase">
                        Reduza seu tempo de <br />
                        <span className="text-blue-500">documentação pela metade.</span>
                      </h2>
                      <p className="text-slate-400 max-w-md text-sm font-medium leading-relaxed">
                        Use o AI Scribe durante seus atendimentos e deixe que a nossa inteligência
                        clínica gere o SOAP, o faturamento e a evolução para você.
                      </p>
                      <div className="flex gap-4">
                        <Button
                          className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl px-8 h-14 font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/20"
                          onClick={() => setIsScribeOpen(true)}
                        >
                          Ativar FisioAmbient
                        </Button>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar / Insights Panel */}
          <aside className="xl:col-span-1 space-y-8">
            {/* Retention Panel */}
            <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden">
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

            {/* Small Quick Insights */}
            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  label: "Precisão do Scribe",
                  value: "98.2%",
                  color: "text-emerald-500",
                  icon: ShieldCheck,
                },
                { label: "Tempo Economizado", value: "14h/mês", color: "text-blue-500", icon: Zap },
              ].map((stat, i) => (
                <Card
                  key={i}
                  className="border-none shadow-sm bg-white dark:bg-slate-900 rounded-2xl p-6 flex items-center justify-between"
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
            </div>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
};

export default IAStudio;
