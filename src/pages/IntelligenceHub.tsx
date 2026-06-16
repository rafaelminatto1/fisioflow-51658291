import { lazy, Suspense, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Bot,
  Brain,
  LineChart,
  Sparkles,
  Stethoscope,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageLayout, PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { cn } from "@/lib/utils";

type IntelligenceTab = "overview" | "studio" | "analytics" | "assistant" | "brain";

const SmartDashboardContent = lazy(() =>
  import("./SmartDashboard").then((module) => ({ default: module.SmartDashboardContent })),
);
const SmartAIContent = lazy(() =>
  import("./SmartAI").then((module) => ({ default: module.SmartAIContent })),
);
const BrainDashboardContent = lazy(() =>
  import("./ai/BrainDashboardPage").then((module) => ({ default: module.BrainDashboardPage })),
);
const AdvancedAnalyticsContent = lazy(() =>
  import("./AdvancedAnalytics").then((module) => ({ default: module.AdvancedAnalyticsContent })),
);
const IAStudioWorkspace = lazy(() =>
  import("./IAStudio").then((module) => ({ default: module.IAStudioWorkspace })),
);
const AIAnalyticsHubContent = lazy(() =>
  import("./AIHub").then((module) => ({ default: module.AIAnalyticsHubContent })),
);

const LEGACY_TAB_MAP: Record<string, IntelligenceTab> = {
  clinica: "overview",
  analise: "analytics",
  ai: "assistant",
  studio: "studio",
  overview: "overview",
  analytics: "analytics",
  assistant: "assistant",
};

const HUB_TABS: Array<{
  value: IntelligenceTab;
  label: string;
  description: string;
  icon: typeof Brain;
  badge?: string;
}> = [
  {
    value: "overview",
    label: "Visão Geral",
    description: "Agenda, retenção, alertas e indicadores operacionais.",
    icon: Stethoscope,
  },
  {
    value: "studio",
    label: "Studio IA",
    description: "Scribe, Agent Hub, ADM, marcha, relatórios e predição.",
    icon: Zap,
    badge: "PRO",
  },
  {
    value: "analytics",
    label: "Analytics",
    description: "BI clínico, financeiro, no-show, retenção e previsões.",
    icon: BarChart3,
    badge: "NEW",
  },
  {
    value: "brain",
    label: "Fisio Brain",
    description: "Busca em histórico, insights proativos e pesquisa clínica.",
    icon: Brain,
    badge: "PRO",
  },
  {
    value: "assistant",
    label: "Assistente",
    description: "Wiki clínica, RAG e perguntas.",
    icon: Bot,
  },
];

function normalizeTab(value: string | null): IntelligenceTab {
  return value ? (LEGACY_TAB_MAP[value] ?? "overview") : "overview";
}

function IntelligenceContentSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-36 animate-pulse rounded-2xl border border-border/60 bg-muted/40"
        />
      ))}
      <div className="h-80 animate-pulse rounded-2xl border border-border/60 bg-muted/40 md:col-span-2 xl:col-span-4" />
    </div>
  );
}

function IntelligenceCommandDeck({
  activeTab,
  onSelectTab,
}: {
  activeTab: IntelligenceTab;
  onSelectTab: (tab: IntelligenceTab) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {HUB_TABS.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelectTab(item.value)}
            className={cn(
              "group relative min-h-[132px] overflow-hidden rounded-2xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg",
              active
                ? "border-primary/30 bg-primary/5 shadow-primary/10"
                : "border-border/60 hover:border-primary/20",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-primary",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              {item.badge ? (
                <Badge className="border-0 bg-primary/10 text-[9px] font-black uppercase tracking-widest text-primary">
                  {item.badge}
                </Badge>
              ) : null}
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-sm font-black uppercase tracking-wider text-foreground">
                {item.label}
              </p>
              <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
            <div
              className={cn(
                "absolute inset-x-5 bottom-0 h-1 rounded-t-full transition-opacity",
                active
                  ? "bg-primary opacity-100"
                  : "bg-primary/30 opacity-0 group-hover:opacity-100",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function IntelligenceHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = useMemo(() => normalizeTab(searchParams.get("tab")), [searchParams]);

  const handleTabChange = (value: string) => {
    const nextTab = normalizeTab(value);
    setSearchParams(
      (currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        nextParams.set("tab", nextTab);
        return nextParams;
      },
      { replace: true },
    );
  };

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={tab === "studio" ? "default" : "outline"}
        size="sm"
        className="h-9 rounded-xl text-xs font-bold"
        onClick={() => handleTabChange("studio")}
      >
        <Sparkles className="mr-2 h-3.5 w-3.5" />
        Abrir Studio
      </Button>
      <Button
        variant={tab === "assistant" ? "default" : "ghost"}
        size="sm"
        className="h-9 rounded-xl text-xs font-bold text-muted-foreground"
        onClick={() => handleTabChange("assistant")}
      >
        <Bot className="mr-2 h-3.5 w-3.5" />
        Perguntar à IA
      </Button>
    </div>
  );

  return (
    <PageLayout fullWidth showFooter={tab !== "assistant"}>
      <PageContainer maxWidth="full" className="space-y-6">
        <PageHeader
          title="Central de Inteligência & IA"
          subtitle="Decisões clínicas, gestão e conhecimento em um fluxo de trabalho único."
          icon={Brain}
          actions={actions}
        />

        <section className="rounded-[1.75rem] border border-border/60 bg-background p-4 shadow-sm md:p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  Inteligência & IA
                </p>
                <h2 className="text-lg font-black tracking-tight text-foreground">
                  Escolha o modo de trabalho
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
              <LineChart className="h-4 w-4 text-emerald-500" />
              Atualizado com dados clínicos, operacionais e financeiros.
            </div>
          </div>
          <IntelligenceCommandDeck activeTab={tab} onSelectTab={handleTabChange} />
        </section>

        <Tabs value={tab} onValueChange={handleTabChange} className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl border border-border/60 bg-muted/40 p-1 md:inline-grid md:w-auto md:grid-cols-4">
            {HUB_TABS.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="h-10 rounded-xl text-xs font-black uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  <Icon className="mr-2 hidden h-4 w-4 sm:block" />
                  {item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="overview" className="m-0 outline-none">
            <Suspense fallback={<IntelligenceContentSkeleton />}>
              <SmartDashboardContent />
            </Suspense>
          </TabsContent>

          <TabsContent
            value="studio"
            className="m-0 rounded-[1.75rem] bg-slate-50 p-4 outline-none dark:bg-slate-950 md:p-6"
          >
            <Suspense fallback={<IntelligenceContentSkeleton />}>
              <IAStudioWorkspace embedded />
            </Suspense>
          </TabsContent>

          <TabsContent value="analytics" className="m-0 space-y-8 outline-none">
            <section className="rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-sm md:p-6">
              <div className="mb-5 flex flex-col gap-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  AI Analytics Hub
                </p>
                <h2 className="text-xl font-black tracking-tight text-foreground">
                  Previsões executivas e sinais de risco
                </h2>
                <p className="text-sm font-medium text-muted-foreground">
                  Retenção, no-show e receita prevista reunidos antes da análise detalhada.
                </p>
              </div>
              <Suspense fallback={<IntelligenceContentSkeleton />}>
                <AIAnalyticsHubContent embedded />
              </Suspense>
            </section>
            <Suspense fallback={<IntelligenceContentSkeleton />}>
              <AdvancedAnalyticsContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="brain" className="m-0 min-h-[70vh] rounded-[1.75rem] outline-none">
            <Suspense fallback={<IntelligenceContentSkeleton />}>
              <BrainDashboardContent />
            </Suspense>
          </TabsContent>

          <TabsContent
            value="assistant"
            className="m-0 min-h-[70vh] overflow-hidden rounded-[1.75rem] border border-border/60 bg-card outline-none"
          >
            <Suspense fallback={<IntelligenceContentSkeleton />}>
              <SmartAIContent />
            </Suspense>
          </TabsContent>
        </Tabs>
      </PageContainer>
    </PageLayout>
  );
}
