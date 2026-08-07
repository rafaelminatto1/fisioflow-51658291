import { lazy, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Bot,
  Brain,
  Filter,
  Globe,
  LineChart,
  Lock,
  MessageSquare,
  Search,
  Settings,
  Shield,
  Sparkles,
  Stethoscope,
  Zap,
  Calendar,
  BookOpen,
  Building2,
  FileCode,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PageLayout, PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  IntelligenceTabId,
  useIntelligencePermissions,
} from "@/lib/permissions/intelligencePermissions";
import { IntelligencePermissionsModal } from "@/components/intelligence/IntelligencePermissionsModal";

const SmartDashboardContent = lazy(() =>
  import("./SmartDashboard").then((module) => ({ default: module.SmartDashboardContent })),
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
const CopilotChatContent = lazy(() =>
  import("./copilot/CopilotChatPage").then((module) => ({ default: module.default })),
);
const KnowledgeAskContent = lazy(() =>
  import("./knowledge/KnowledgeAsk").then((module) => ({ default: module.default })),
);

type ExtendedTabId = IntelligenceTabId | "overview";

const LEGACY_TAB_MAP: Record<string, ExtendedTabId> = {
  overview: "overview",
  clinica: "overview",
  analytics: "analytics",
  analise: "analytics",
  copilot: "copilot",
  copiloto: "copilot",
  ai: "copilot",
  assistant: "copilot",
  knowledge: "knowledge",
  conhecimento: "knowledge",
  studio: "studio",
  brain: "studio",
};

const ALL_HUB_TABS: Array<{
  value: ExtendedTabId;
  label: string;
  description: string;
  icon: typeof Brain;
  badge?: string;
  adminOnly?: boolean;
}> = [
  {
    value: "overview",
    label: "Visão Geral",
    description: "Agenda, retenção, alertas e indicadores operacionais.",
    icon: Stethoscope,
  },
  {
    value: "analytics",
    label: "Analytics & Negócio",
    description: "BI clínico, financeiro, no-show e saúde de negócio (Restrito).",
    icon: BarChart3,
    badge: "ADMIN",
    adminOnly: true,
  },
  {
    value: "copilot",
    label: "Copiloto Clínico",
    description: "Chat e suporte à decisão clínica em tempo real.",
    icon: MessageSquare,
    badge: "AI CHAT",
  },
  {
    value: "knowledge",
    label: "Conhecimento & Pesquisa",
    description: "RAG da clínica + Literatura científica PubMed / Crossref.",
    icon: BookOpen,
    badge: "PUBMED",
  },
  {
    value: "studio",
    label: "Studio IA & Fisio Brain",
    description: "Scribe de áudio, evoluções SOAP, biomecânica e prontuários.",
    icon: Zap,
    badge: "PRO",
  },
];

function normalizeTab(value: string | null): ExtendedTabId {
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
  allowedTabIds,
}: {
  activeTab: ExtendedTabId;
  onSelectTab: (tab: ExtendedTabId) => void;
  allowedTabIds: ExtendedTabId[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {ALL_HUB_TABS.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.value;
        const isAllowed = allowedTabIds.includes(item.value);

        return (
          <button
            key={item.value}
            type="button"
            disabled={!isAllowed}
            onClick={() => isAllowed && onSelectTab(item.value)}
            className={cn(
              "group relative min-h-[132px] overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition-all",
              !isAllowed
                ? "cursor-not-allowed opacity-50 bg-muted/20 border-muted"
                : active
                ? "border-teal-500/40 bg-teal-500/5 shadow-teal-500/10 dark:bg-teal-950/20"
                : "bg-card border-border/60 hover:-translate-y-0.5 hover:shadow-md hover:border-teal-500/20",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                  active
                    ? "bg-teal-600 text-white"
                    : isAllowed
                    ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              {!isAllowed ? (
                <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-600 bg-amber-500/10 gap-1">
                  <Lock className="w-2.5 h-2.5" /> RESTRITO
                </Badge>
              ) : item.badge ? (
                <Badge className="border-0 bg-teal-500/15 text-[9px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300">
                  {item.badge}
                </Badge>
              ) : null}
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-xs font-black uppercase tracking-wider text-foreground">
                {item.label}
              </p>
              <p className="text-[11px] font-medium leading-normal text-muted-foreground line-clamp-2">
                {item.description}
              </p>
            </div>
            {isAllowed && (
              <div
                className={cn(
                  "absolute inset-x-4 bottom-0 h-1 rounded-t-full transition-opacity",
                  active
                    ? "bg-teal-600 opacity-100"
                    : "bg-teal-500/30 opacity-0 group-hover:opacity-100",
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function IntelligenceHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();
  const role = profile?.role;
  const isAdmin = role === "admin";

  const { isTabAllowed } = useIntelligencePermissions(role);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);

  // Filtros interativos globais
  const [searchSource, setSearchSource] = useState<"all" | "pubmed" | "clinic" | "protocols">("all");
  const [periodFilter, setPeriodFilter] = useState<"30d" | "6m" | "all">("all");

  const allowedTabIds = useMemo<ExtendedTabId[]>(() => {
    const list: ExtendedTabId[] = ["overview"];
    if (isTabAllowed("analytics")) list.push("analytics");
    if (isTabAllowed("copilot")) list.push("copilot");
    if (isTabAllowed("knowledge")) list.push("knowledge");
    if (isTabAllowed("studio")) list.push("studio");
    return list;
  }, [isTabAllowed]);

  const rawTab = searchParams.get("tab");
  const tab = useMemo(() => {
    const normalized = normalizeTab(rawTab);
    return allowedTabIds.includes(normalized) ? normalized : "overview";
  }, [rawTab, allowedTabIds]);

  const handleTabChange = (value: string) => {
    const nextTab = normalizeTab(value);
    if (!allowedTabIds.includes(nextTab)) return;

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
      {isAdmin && (
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-xl text-xs font-bold gap-1.5 border-teal-500/30 hover:bg-teal-500/10 text-teal-700 dark:text-teal-300"
          onClick={() => setPermissionsModalOpen(true)}
        >
          <Settings className="h-3.5 w-3.5" />
          Gerenciar Permissões
        </Button>
      )}

      {allowedTabIds.includes("copilot") && (
        <Button
          variant={tab === "copilot" ? "default" : "outline"}
          size="sm"
          className="h-9 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white"
          onClick={() => handleTabChange("copilot")}
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          Copiloto Clínico
        </Button>
      )}
    </div>
  );

  return (
    <PageLayout fullWidth showFooter={tab !== "copilot"}>
      <PageContainer maxWidth="full" className="space-y-6">
        <PageHeader
          title="Central de IA & Inteligência Clínica"
          subtitle="Copiloto clínico, base científica PubMed, estúdio de evoluções e analytics consolidado em uma única central."
          icon={Brain}
          actions={actions}
        />

        {/* Badges de Status & Segurança em Tempo Real */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border bg-card/60 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="border-teal-500/30 text-teal-700 bg-teal-500/10 dark:text-teal-300 gap-1 font-semibold">
              <Sparkles className="w-3 h-3 text-teal-500" /> IA Core: Gemini 1.5 Flash
            </Badge>
            <Badge variant="outline" className="border-blue-500/30 text-blue-700 bg-blue-500/10 dark:text-blue-300 gap-1 font-semibold">
              <BookOpen className="w-3 h-3 text-blue-500" /> PubMed & Crossref Live API
            </Badge>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 bg-emerald-500/10 dark:text-emerald-300 gap-1 font-semibold">
              <Shield className="w-3 h-3 text-emerald-500" /> LGPD Redacted (Strict)
            </Badge>
            <Badge variant="outline" className="border-slate-500/30 text-slate-700 bg-slate-500/10 dark:text-slate-300 gap-1 font-semibold">
              <Zap className="w-3 h-3 text-amber-500" /> Region: SA-East-1 (São Paulo)
            </Badge>
          </div>

          {/* Filtros Contextuais Globais */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border">
              <Filter className="w-3.5 h-3.5 text-muted-foreground ml-1" />
              <button
                type="button"
                onClick={() => setSearchSource("all")}
                className={cn("px-2 py-0.5 rounded text-[11px] font-medium transition-colors", searchSource === "all" ? "bg-background shadow text-foreground font-bold" : "text-muted-foreground")}
              >
                Tudo
              </button>
              <button
                type="button"
                onClick={() => setSearchSource("pubmed")}
                className={cn("px-2 py-0.5 rounded text-[11px] font-medium transition-colors", searchSource === "pubmed" ? "bg-blue-500 text-white font-bold" : "text-muted-foreground")}
              >
                PubMed
              </button>
              <button
                type="button"
                onClick={() => setSearchSource("clinic")}
                className={cn("px-2 py-0.5 rounded text-[11px] font-medium transition-colors", searchSource === "clinic" ? "bg-teal-600 text-white font-bold" : "text-muted-foreground")}
              >
                Prontuários
              </button>
            </div>

            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground ml-1" />
              <button
                type="button"
                onClick={() => setPeriodFilter("30d")}
                className={cn("px-2 py-0.5 rounded text-[11px] font-medium transition-colors", periodFilter === "30d" ? "bg-background shadow text-foreground font-bold" : "text-muted-foreground")}
              >
                30 Dias
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter("all")}
                className={cn("px-2 py-0.5 rounded text-[11px] font-medium transition-colors", periodFilter === "all" ? "bg-background shadow text-foreground font-bold" : "text-muted-foreground")}
              >
                Histórico
              </button>
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
          <section className="rounded-[1.75rem] border border-border bg-card p-4 shadow-sm md:p-5">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
                    Navegação Inteligente
                  </p>
                  <h2 className="text-lg font-black tracking-tight text-foreground">
                    Selecione o modo de trabalho
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
                <LineChart className="h-4 w-4 text-emerald-500" />
                Conectado com Neon DB (AWS sa-east-1) & Cloudflare Workers Edge.
              </div>
            </div>
            <IntelligenceCommandDeck
              activeTab={tab}
              onSelectTab={handleTabChange}
              allowedTabIds={allowedTabIds}
            />
          </section>

          {/* Aba 1: Visão Geral */}
          <TabsContent value="overview" className="m-0 outline-none">
            <Suspense fallback={<IntelligenceContentSkeleton />}>
              <SmartDashboardContent />
            </Suspense>
          </TabsContent>

          {/* Aba 2: Analytics & Negócio (Restrito por RBAC) */}
          {allowedTabIds.includes("analytics") && (
            <TabsContent value="analytics" className="m-0 space-y-8 outline-none">
              <section className="rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-sm md:p-6">
                <div className="mb-5 flex flex-col gap-1">
                  <Badge variant="outline" className="w-fit mb-1 border-purple-500/30 text-purple-700 bg-purple-500/10">
                    🔒 Restrito ao Perfil Administrador
                  </Badge>
                  <h2 className="text-xl font-black tracking-tight text-foreground">
                    BI Executivo & Indicadores de Performance
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground">
                    Retenção de pacientes, no-show, saúde financeira e previsões de faturamento da clínica.
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
          )}

          {/* Aba 3: Copiloto Clínico */}
          {allowedTabIds.includes("copilot") && (
            <TabsContent value="copilot" className="m-0 min-h-[75vh] rounded-[1.75rem] border overflow-hidden bg-card outline-none">
              <Suspense fallback={<IntelligenceContentSkeleton />}>
                <CopilotChatContent />
              </Suspense>
            </TabsContent>
          )}

          {/* Aba 4: Conhecimento & Literatura Científica */}
          {allowedTabIds.includes("knowledge") && (
            <TabsContent value="knowledge" className="m-0 min-h-[75vh] rounded-[1.75rem] border p-4 bg-card outline-none">
              <Suspense fallback={<IntelligenceContentSkeleton />}>
                <KnowledgeAskContent />
              </Suspense>
            </TabsContent>
          )}

          {/* Aba 5: Studio IA & Fisio Brain */}
          {allowedTabIds.includes("studio") && (
            <TabsContent value="studio" className="m-0 space-y-6 outline-none">
              <section className="rounded-[1.75rem] border bg-slate-50 p-4 dark:bg-slate-950 md:p-6">
                <Suspense fallback={<IntelligenceContentSkeleton />}>
                  <IAStudioWorkspace embedded />
                </Suspense>
              </section>
              <section className="rounded-[1.75rem] border bg-card p-4 md:p-6">
                <Suspense fallback={<IntelligenceContentSkeleton />}>
                  <BrainDashboardContent />
                </Suspense>
              </section>
            </TabsContent>
          )}
        </Tabs>

        {/* Modal de Gerenciamento de Permissões (Exclusivo Admin) */}
        {isAdmin && (
          <IntelligencePermissionsModal
            open={permissionsModalOpen}
            onOpenChange={setPermissionsModalOpen}
          />
        )}
      </PageContainer>
    </PageLayout>
  );
}
