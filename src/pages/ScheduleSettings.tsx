import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Menu } from "lucide-react";
import { PageLayout, PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { resolveTab, type TabValue } from "@/components/schedule/settings/tabRedirects";
import { SettingsNav, NAV_ITEMS } from "@/components/schedule/settings/SettingsNav";
import { OverviewStrip } from "@/components/schedule/settings/OverviewStrip";
import { SettingsSaveBar } from "@/components/schedule/settings/SettingsSaveBar";
import type { TabSaveHandle } from "@/components/schedule/settings/types";
import { FuncionamentoTab } from "@/components/schedule/settings/tabs/FuncionamentoTab";
import { AtendimentosTab } from "@/components/schedule/settings/tabs/AtendimentosTab";
import { DisponibilidadeTab } from "@/components/schedule/settings/tabs/DisponibilidadeTab";
import { PoliticasTab } from "@/components/schedule/settings/tabs/PoliticasTab";
import { AparenciaTab } from "@/components/schedule/settings/tabs/AparenciaTab";

const TAB_COMPONENTS: Record<TabValue, React.ComponentType<{ registerHandle: (h: TabSaveHandle | null) => void }>> = {
  funcionamento: FuncionamentoTab,
  atendimentos: AtendimentosTab,
  disponibilidade: DisponibilidadeTab,
  politicas: PoliticasTab,
  aparencia: AparenciaTab,
};

export default function ScheduleSettings() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [handle, setHandle] = useState<TabSaveHandle | null>(null);

  const activeTab = useMemo(() => resolveTab(searchParams.get("tab")), [searchParams]);
  const activeMeta = NAV_ITEMS.find((t) => t.value === activeTab) ?? NAV_ITEMS[0];
  const ActiveIcon = activeMeta.icon;
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  const handleSelect = useCallback(
    (value: TabValue) => {
      if (value === activeTab) {
        setSheetOpen(false);
        return;
      }
      if (handle?.isDirty && !window.confirm("Descartar alterações não salvas?")) {
        return;
      }
      handle?.discard();
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", value);
          return next;
        },
        { replace: true },
      );
      setSheetOpen(false);
    },
    [activeTab, handle, setSearchParams],
  );

  return (
    <PageLayout>
      <PageContainer>
        <PageHeader
          title="Configurações da Agenda"
          subtitle="Funcionamento, atendimentos, disponibilidade, políticas e aparência."
          actions={
            <Button asChild variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-lg">
              <Link to="/agenda" aria-label="Voltar para agenda">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          }
        />

        <div className="space-y-5">
          <OverviewStrip onJump={handleSelect} />

          <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
            {isMobile ? (
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="h-11 justify-between rounded-lg">
                    <span className="flex items-center gap-2">
                      <ActiveIcon className="h-4 w-4 text-blue-600" />
                      {activeMeta.label}
                    </span>
                    <Menu className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <SheetHeader className="border-b p-4">
                    <SheetTitle>Configurações</SheetTitle>
                  </SheetHeader>
                  <div className="p-3">
                    <SettingsNav active={activeTab} onSelect={handleSelect} />
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <aside className="hidden lg:block">
                <div className="sticky top-4 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                  <SettingsNav active={activeTab} onSelect={handleSelect} />
                </div>
              </aside>
            )}

            <main className="min-w-0 space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <ActiveIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">{activeMeta.label}</h2>
                  <p className="text-sm text-muted-foreground">{activeMeta.description}</p>
                </div>
              </div>

              <ActiveComponent key={activeTab} registerHandle={setHandle} />
              <SettingsSaveBar handle={handle} />
            </main>
          </div>
        </div>
      </PageContainer>
    </PageLayout>
  );
}
