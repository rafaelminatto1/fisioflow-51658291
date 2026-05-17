import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  CalendarOff,
  Clock,
  Gauge,
  LayoutGrid,
  Menu,
  Palette,
  Shield,
  SlidersHorizontal,
  Stethoscope,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppointmentTypes } from "@/hooks/useAppointmentTypes";
import { cn } from "@/lib/utils";
import { OverviewTab } from "@/components/schedule/settings-v2/tabs/OverviewTab";
import { HorariosTab } from "@/components/schedule/settings-v2/tabs/HorariosTab";
import { CapacidadeTab } from "@/components/schedule/settings-v2/tabs/CapacidadeTab";
import { StatusTab } from "@/components/schedule/settings-v2/tabs/StatusTab";
import { TiposTab } from "@/components/schedule/settings-v2/tabs/TiposTab";
import { BloqueiosTab } from "@/components/schedule/settings-v2/tabs/BloqueiosTab";
import { PoliticasTab } from "@/components/schedule/settings-v2/tabs/PoliticasTab";
import { AparenciaTab } from "@/components/schedule/settings-v2/tabs/AparenciaTab";

const TABS = [
  { value: "overview", label: "Visão geral", description: "Saúde da configuração", icon: LayoutGrid, Component: OverviewTab },
  { value: "horarios", label: "Horários", description: "Expediente e pausas", icon: Clock, Component: HorariosTab },
  { value: "capacidade", label: "Capacidade", description: "Vagas por horário", icon: Gauge, Component: CapacidadeTab },
  { value: "status", label: "Status", description: "Cores e estados", icon: Palette, Component: StatusTab },
  { value: "tipos", label: "Tipos", description: "Serviços e durações", icon: Stethoscope, Component: TiposTab },
  { value: "bloqueios", label: "Bloqueios", description: "Feriados e folgas", icon: CalendarOff, Component: BloqueiosTab },
  { value: "politicas", label: "Políticas", description: "Cancelamento e lembretes", icon: Shield, Component: PoliticasTab },
  { value: "aparencia", label: "Aparência", description: "Densidade e visual", icon: SlidersHorizontal, Component: AparenciaTab },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export const VALID_TAB_IDS = TABS.map((t) => t.value) as TabValue[];

const LEGACY_REDIRECTS: Record<string, TabValue> = {
  visual: "aparencia",
  "agenda-horarios": "horarios",
  "capacidade-horarios": "capacidade",
  capacity: "capacidade",
  hours: "horarios",
  "appointment-types": "tipos",
  policies: "politicas",
  blocked: "bloqueios",
};

export function getBadgeCount(items: unknown[]): number {
  return items.length;
}

export function getTabFromUrl(searchParams: URLSearchParams, validTabs: string[]): string {
  const tab = searchParams.get("tab");
  return tab && validTabs.includes(tab) ? tab : validTabs[0];
}

export function setTabInUrl(searchParams: URLSearchParams, tab: string): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.set("tab", tab);
  return next;
}

function NavList({
  active,
  onSelect,
  typesCount,
}: {
  active: TabValue;
  onSelect: (v: TabValue) => void;
  typesCount: number;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.value;
        const badge = tab.value === "tipos" && typesCount > 0 ? typesCount : null;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onSelect(tab.value)}
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition",
              isActive
                ? "border-teal-200 bg-teal-50 text-teal-950 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100"
                : "hover:bg-slate-50 dark:hover:bg-slate-900",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                isActive ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{tab.label}</span>
              <span className="mt-0.5 block truncate text-[11px] font-normal text-muted-foreground">
                {tab.description}
              </span>
            </span>
            {badge !== null && (
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">
                {badge}
              </Badge>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export default function ScheduleSettings() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { types } = useAppointmentTypes();

  const rawTab = searchParams.get("tab") ?? "overview";
  const activeTab: TabValue = useMemo(() => {
    const redirected = LEGACY_REDIRECTS[rawTab];
    if (redirected) return redirected;
    return (VALID_TAB_IDS as readonly string[]).includes(rawTab) ? (rawTab as TabValue) : "overview";
  }, [rawTab]);

  const activeMeta = TABS.find((t) => t.value === activeTab) ?? TABS[0];
  const ActiveIcon = activeMeta.icon;
  const ActiveComponent = activeMeta.Component;
  const typesCount = getBadgeCount(types);

  const handleSelect = useCallback(
    (value: TabValue) => {
      const next = LEGACY_REDIRECTS[value] ?? value;
      setSearchParams((prev) => setTabInUrl(prev, next), { replace: true });
      setSheetOpen(false);
    },
    [setSearchParams],
  );

  return (
    <MainLayout compactPadding>
      <div className="min-h-[calc(100vh-5rem)] space-y-5">
        <header className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-lg">
              <Link to="/agenda" aria-label="Voltar para agenda">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight">Configurações da Agenda</h1>
              <p className="text-sm text-muted-foreground">
                Horários, capacidade, status, tipos, bloqueios e políticas de atendimento.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/agenda">Ver agenda</Link>
            </Button>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
          {isMobile ? (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-11 justify-between rounded-lg">
                  <span className="flex items-center gap-2">
                    <ActiveIcon className="h-4 w-4 text-teal-600" />
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
                  <NavList active={activeTab} onSelect={handleSelect} typesCount={typesCount} />
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <aside className="hidden lg:block">
              <div className="sticky top-4 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <NavList active={activeTab} onSelect={handleSelect} typesCount={typesCount} />
              </div>
            </aside>
          )}

          <main className="min-w-0 space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                <ActiveIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{activeMeta.label}</h2>
                <p className="text-sm text-muted-foreground">{activeMeta.description}</p>
              </div>
            </div>

            <ActiveComponent />
          </main>
        </div>
      </div>
    </MainLayout>
  );
}
