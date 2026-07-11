import "@/styles/bundles/schedule.css";
import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageLayout, PageContainer } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { resolveTab, type TabValue } from "@/components/schedule/settings/tabRedirects";
import { SettingsNav } from "@/components/schedule/settings/SettingsNav";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [handle, setHandle] = useState<TabSaveHandle | null>(null);

  const activeTab = useMemo(() => resolveTab(searchParams.get("tab")), [searchParams]);
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  const handleSelect = useCallback(
    (value: TabValue) => {
      if (value === activeTab) {
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
    },
    [activeTab, handle, setSearchParams],
  );

  return (
    <PageLayout>
      <PageContainer className="max-w-6xl py-12">
        <div className="mb-12 flex items-center justify-between">
          <Button asChild variant="outline" size="sm" className="rounded-full border-slate-300 dark:border-slate-700">
            <Link to="/agenda" aria-label="Voltar para agenda">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-4 lg:gap-16">
          {/* Menu Lateral Ultraminimalista */}
          <aside className="w-full lg:col-span-1">
            <div className="sticky top-8">
              <h1 className="mb-8 text-sm font-bold uppercase tracking-widest text-slate-400">
                Configurações
              </h1>
              <SettingsNav active={activeTab} onSelect={handleSelect} />
            </div>
          </aside>

          {/* Conteúdo Principal Borderless */}
          <main className="min-w-0 pb-32 lg:col-span-3">
            <ActiveComponent key={activeTab} registerHandle={setHandle} />
            <SettingsSaveBar handle={handle} />
          </main>
        </div>
      </PageContainer>
    </PageLayout>
  );
}
