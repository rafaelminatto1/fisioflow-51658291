import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  Clock,
  Gauge,
  LayoutGrid,
  Menu,
  Palette,
  Shield,
  SlidersHorizontal,
  Stethoscope,
  TimerOff,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsLoadingState } from "@/components/schedule/settings/shared/SettingsLoadingState";
import { BusinessHoursManager } from "@/components/schedule/settings/BusinessHoursManager";
import { CapacityRulesList } from "@/components/schedule/settings/CapacityRulesList";
import { SlotConfigurationSettings } from "@/components/schedule/settings/SlotConfigurationSettings";
import { BlockedTimesManager } from "@/components/schedule/settings/BlockedTimesManager";
import { useAppointmentTypes } from "@/hooks/useAppointmentTypes";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { cn } from "@/lib/utils";

const StatusAtendimentoTab = lazy(() =>
  import("@/components/schedule/settings/tabs/StatusAtendimentoTab").then((m) => ({
    default: m.StatusAtendimentoTab,
  })),
);

const ScheduleAppointmentTypesTab = lazy(() =>
  import("@/components/schedule/settings/tabs/ScheduleAppointmentTypesTab").then((m) => ({
    default: m.ScheduleAppointmentTypesTab,
  })),
);

const PoliciesRulesTab = lazy(() =>
  import("@/components/schedule/settings/tabs/PoliciesRulesTab").then((m) => ({
    default: m.PoliciesRulesTab,
  })),
);

const ScheduleVisualTab = lazy(() =>
  import("@/components/schedule/settings/tabs/ScheduleVisualTab").then((m) => ({
    default: m.ScheduleVisualTab,
  })),
);

const settingsTabs = [
  {
    value: "overview",
    label: "Visão geral",
    description: "Saúde da configuração",
    icon: LayoutGrid,
  },
  {
    value: "horarios",
    label: "Horários",
    description: "Expediente e pausas",
    icon: Clock,
  },
  {
    value: "capacidade",
    label: "Capacidade",
    description: "Vagas por faixa",
    icon: Gauge,
  },
  {
    value: "status",
    label: "Status",
    description: "CRUD, cores e regras",
    icon: Palette,
  },
  {
    value: "tipos",
    label: "Tipos",
    description: "Serviços e durações",
    icon: Stethoscope,
  },
  {
    value: "bloqueios",
    label: "Bloqueios",
    description: "Feriados e indisponibilidades",
    icon: TimerOff,
  },
  {
    value: "politicas",
    label: "Políticas",
    description: "Cancelamento e lembretes",
    icon: Shield,
  },
  {
    value: "aparencia",
    label: "Aparência",
    description: "Densidade e visual",
    icon: SlidersHorizontal,
  },
] as const;

type TabValue = (typeof settingsTabs)[number]["value"];

export const VALID_TAB_IDS = settingsTabs.map((tab) => tab.value) as TabValue[];

const LEGACY_TAB_REDIRECTS: Record<string, TabValue> = {
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

function NavItems({
  activeTab,
  appointmentTypesCount,
}: {
  activeTab: TabValue;
  appointmentTypesCount: number;
}) {
  return (
    <>
      {settingsTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.value;
        const badge =
          tab.value === "tipos" && appointmentTypesCount > 0 ? appointmentTypesCount : null;
        return (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "group h-auto w-full justify-start rounded-lg border border-transparent px-3 py-2.5 text-left",
              "data-[state=active]:border-teal-200 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-950 dark:data-[state=active]:border-teal-900 dark:data-[state=active]:bg-teal-950/40 dark:data-[state=active]:text-teal-100",
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
                  isActive && "bg-teal-600 text-white",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{tab.label}</span>
                <span className="mt-0.5 hidden truncate text-xs font-normal text-muted-foreground xl:block">
                  {tab.description}
                </span>
              </span>
              {badge && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">
                  {badge}
                </Badge>
              )}
            </div>
          </TabsTrigger>
        );
      })}
    </>
  );
}

function OverviewPanel() {
  const { businessHours, blockedTimes, notificationSettings } = useScheduleSettings();
  const { capacityGroups, capacities } = useScheduleCapacity();
  const { allStatusRows } = useStatusConfig();
  const { types } = useAppointmentTypes();

  const openDays = businessHours.filter((hour) => hour.is_open).length;
  const activeStatuses = (allStatusRows ?? []).filter((status: any) => status.is_active).length;
  const capacityTotal = capacities.reduce((sum, item) => sum + item.max_patients, 0);
  const reminders =
    notificationSettings?.send_reminder_24h || notificationSettings?.send_reminder_2h;

  const cards = [
    {
      label: "Dias abertos",
      value: `${openDays}/7`,
      detail: openDays > 0 ? "Expediente configurado" : "Defina horários",
      icon: Clock,
    },
    {
      label: "Regras de capacidade",
      value: capacityGroups.length,
      detail: `${capacityTotal} vagas somadas`,
      icon: Gauge,
    },
    {
      label: "Status ativos",
      value: activeStatuses,
      detail: "Disponíveis na agenda",
      icon: Palette,
    },
    {
      label: "Tipos de atendimento",
      value: types.length,
      detail: "Serviços cadastrados",
      icon: Stethoscope,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="rounded-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tracking-tight">{card.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-teal-600" />
            <h2 className="text-base font-semibold">Mapa semanal</h2>
          </div>
          <div className="grid gap-2">
            {businessHours.length > 0 ? (
              businessHours.map((hour) => (
                <div
                  key={hour.day_of_week}
                  className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 py-2 sm:grid-cols-[7rem_minmax(0,1fr)_auto]"
                >
                  <span className="text-sm font-medium">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][hour.day_of_week]}
                  </span>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className={cn("h-2 rounded-full", hour.is_open ? "bg-teal-500" : "bg-muted")}
                      style={{ width: hour.is_open ? "100%" : "0%" }}
                    />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {hour.is_open ? `${hour.open_time}-${hour.close_time}` : "Fechado"}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm font-medium">Nenhum expediente salvo</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Configure os dias e horários na aba Horários.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-teal-600" />
            <h2 className="text-base font-semibold">Pronto para uso</h2>
          </div>
          <div className="space-y-3">
            {[
              ["Horários de atendimento", openDays > 0],
              ["Capacidade por faixa", capacityGroups.length > 0],
              ["Status ativos", activeStatuses > 0],
              ["Lembretes", !!reminders],
              ["Bloqueios cadastrados", blockedTimes.length > 0],
            ].map(([label, ok]) => (
              <div key={String(label)} className="flex items-center justify-between gap-3">
                <span className="text-sm">{label}</span>
                <Badge variant={ok ? "default" : "secondary"}>{ok ? "OK" : "Pendente"}</Badge>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ScheduleSettings() {
  const { types } = useAppointmentTypes();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  const rawTab = searchParams.get("tab") ?? "overview";
  const activeTab: TabValue = useMemo(
    () =>
      LEGACY_TAB_REDIRECTS[rawTab] ??
      (VALID_TAB_IDS.includes(rawTab as TabValue) ? (rawTab as TabValue) : "overview"),
    [rawTab],
  );
  const activeMeta = settingsTabs.find((tab) => tab.value === activeTab) ?? settingsTabs[0];
  const ActiveIcon = activeMeta.icon;
  const appointmentTypesCount = getBadgeCount(types);

  const handleTabChange = useCallback(
    (value: string) => {
      const next = LEGACY_TAB_REDIRECTS[value] ?? value;
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
              <Link to="/agenda">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight">
                Configurações da Agenda
              </h1>
              <p className="text-sm text-muted-foreground">
                Capacidade, horários, status, bloqueios e regras de atendimento.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex">
              Console clínico
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link to="/agenda">Ver agenda</Link>
            </Button>
          </div>
        </header>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]"
        >
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
                <ScrollArea className="h-[calc(100vh-4rem)]">
                  <TabsList className="flex h-auto w-full flex-col gap-1 bg-transparent p-3">
                    <NavItems
                      activeTab={activeTab}
                      appointmentTypesCount={appointmentTypesCount}
                    />
                  </TabsList>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          ) : (
            <aside className="hidden lg:block">
              <TabsList className="sticky top-4 flex h-auto w-full flex-col gap-1 rounded-xl border bg-card p-2 shadow-sm">
                <NavItems activeTab={activeTab} appointmentTypesCount={appointmentTypesCount} />
              </TabsList>
            </aside>
          )}

          <main className="min-w-0 rounded-xl border bg-background">
            <div className="flex items-center gap-3 border-b bg-card/80 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                <ActiveIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{activeMeta.label}</h2>
                <p className="text-sm text-muted-foreground">{activeMeta.description}</p>
              </div>
            </div>

            <div className="p-4 md:p-5">
              <Suspense fallback={<SettingsLoadingState />}>
                <TabsContent value="overview" className="m-0 focus-visible:outline-none">
                  <OverviewPanel />
                </TabsContent>
                <TabsContent value="horarios" className="m-0 focus-visible:outline-none">
                  <BusinessHoursManager />
                  <div className="mt-5">
                    <SlotConfigurationSettings />
                  </div>
                </TabsContent>
                <TabsContent value="capacidade" className="m-0 focus-visible:outline-none">
                  <CapacityRulesList />
                </TabsContent>
                <TabsContent value="status" className="m-0 focus-visible:outline-none">
                  <StatusAtendimentoTab />
                </TabsContent>
                <TabsContent value="tipos" className="m-0 focus-visible:outline-none">
                  <ScheduleAppointmentTypesTab />
                </TabsContent>
                <TabsContent value="bloqueios" className="m-0 focus-visible:outline-none">
                  <BlockedTimesManager />
                </TabsContent>
                <TabsContent value="politicas" className="m-0 focus-visible:outline-none">
                  <PoliciesRulesTab />
                </TabsContent>
                <TabsContent value="aparencia" className="m-0 focus-visible:outline-none">
                  <ScheduleVisualTab />
                </TabsContent>
              </Suspense>
            </div>
          </main>
        </Tabs>
      </div>
    </MainLayout>
  );
}
