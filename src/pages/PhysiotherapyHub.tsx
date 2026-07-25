import { useState } from "react";
import { PageLayout, PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PosturalAssessment } from "@/components/physiotherapy/PosturalAssessment";
import { TreatmentPlan } from "@/components/physiotherapy/TreatmentPlan";
import { ProgressTracking } from "@/components/physiotherapy/ProgressTracking";
import { User, TrendingUp, ClipboardList, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type PhysiotherapyTab = "assessment" | "treatment" | "progress";

const DECK_ITEMS: Array<{
  value: PhysiotherapyTab;
  label: string;
  description: string;
  icon: typeof User;
  badge?: string;
}> = [
  {
    value: "assessment",
    label: "Avaliação Postural",
    description: "Anamnese, mapas de dor e análise física do paciente.",
    icon: User,
  },
  {
    value: "treatment",
    label: "Plano de Tratamento",
    description: "Prescrição de condutas, exercícios e protocolos de reabilitação.",
    icon: ClipboardList,
    badge: "ATIVO",
  },
  {
    value: "progress",
    label: "Progresso & Metas",
    description: "Evolução de dor, amplitude articular e indicadores de alta.",
    icon: TrendingUp,
    badge: "ANÁLISE",
  },
];

export default function PhysiotherapyHub() {
  const [activeTab, setActiveTab] = useState<PhysiotherapyTab>("assessment");

  return (
    <PageLayout>
      <PageContainer maxWidth="full" className="space-y-6">
        <PageHeader
          title="Central Fisioterapêutica"
          subtitle="3 tratamentos ativos · 12 avaliações este mês · 95% taxa de adesão"
          icon={Activity}
        />

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as PhysiotherapyTab)} className="space-y-6">
          <section className="rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  FLUXO DE ATENDIMENTO
                </p>
                <h2 className="text-lg font-black tracking-tight text-foreground">
                  Selecione a etapa do atendimento
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {DECK_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setActiveTab(item.value)}
                    className={cn(
                      "group relative min-h-[120px] overflow-hidden rounded-2xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                      active
                        ? "border-primary/40 bg-primary/5 shadow-primary/10"
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
          </section>

          <TabsContent value="assessment" className="m-0 outline-none">
            <PosturalAssessment />
          </TabsContent>

          <TabsContent value="treatment" className="m-0 outline-none">
            <TreatmentPlan />
          </TabsContent>

          <TabsContent value="progress" className="m-0 outline-none">
            <ProgressTracking />
          </TabsContent>
        </Tabs>
      </PageContainer>
    </PageLayout>
  );
}
