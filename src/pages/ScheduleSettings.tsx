import { Suspense, lazy, useCallback, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  CalendarOff,
  CalendarRange,
  Calendar,
  Menu,
  Palette,
  Shield,
  ChevronRight,
  Stethoscope,
  WifiOff,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import { useAppointmentTypes } from "@/hooks/useAppointmentTypes";
import { SettingsLoadingState } from "@/components/schedule/settings/shared/SettingsLoadingState";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useAgendaAppearancePersistence } from "@/hooks/useAgendaAppearancePersistence";
import { GlobalPresetsPanel } from "@/components/schedule/settings/GlobalPresetsPanel";
import { ViewAppearancePanel } from "@/components/schedule/settings/ViewAppearancePanel";
import { StatusColorManager } from "@/components/schedule/settings/StatusColorManager";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";
import { AccessibilitySection } from "@/components/schedule/settings/AccessibilitySection";

const AgendaHorariosTab = lazy(() =>
  import("@/components/schedule/settings/tabs/AgendaHorariosTab").then((m) => ({
    default: m.AgendaHorariosTab,
  })),
);
const ScheduleAppointmentTypesTab = lazy(() =>
  import("@/components/schedule/settings/tabs/ScheduleAppointmentTypesTab").then((m) => ({
    default: m.ScheduleAppointmentTypesTab,
  })),
);
const SchedulePoliciesTab = lazy(() =>
  import("@/components/schedule/settings/tabs/SchedulePoliciesTab").then((m) => ({
    default: m.SchedulePoliciesTab,
  })),
);
const ScheduleBlockedTab = lazy(() =>
  import("@/components/schedule/settings/tabs/ScheduleBlockedTab").then((m) => ({
    default: m.ScheduleBlockedTab,
  })),
);

// ─── Tab definitions ──────────────────────────────────────────────────────────

const scheduleSettingsTabs = [
  {
    value: "visual",
    label: "Aparência",
    description: "Cards, cores e acessibilidade",
    icon: Palette,
    color: "text-pink-600 dark:text-pink-400",
    activeBg: "bg-pink-50 dark:bg-pink-950/40",
    activeBorder: "border-pink-500/70",
    iconBg: "bg-pink-100 dark:bg-pink-900/40",
  },
  {
    value: "agenda-horarios",
    label: "Agenda & Horários",
    description: "Capacidade, horários e janelas",
    icon: CalendarClock,
    color: "text-teal-600 dark:text-teal-400",
    activeBg: "bg-teal-50 dark:bg-teal-950/40",
    activeBorder: "border-teal-500/70",
    iconBg: "bg-teal-100 dark:bg-teal-900/40",
  },
  {
    value: "appointment-types",
    label: "Tipos de Atendimento",
    description: "Avaliação, retorno, procedimentos",
    icon: Stethoscope,
    color: "text-violet-600 dark:text-violet-400",
    activeBg: "bg-violet-50 dark:bg-violet-950/40",
    activeBorder: "border-violet-500/70",
    iconBg: "bg-violet-100 dark:bg-violet-900/40",
  },
  {
    value: "policies",
    label: "Políticas",
    description: "Cancelamentos e lembretes",
    icon: Shield,
    color: "text-amber-600 dark:text-amber-400",
    activeBg: "bg-amber-50 dark:bg-amber-950/40",
    activeBorder: "border-amber-500/70",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
  },
  {
    value: "blocked",
    label: "Bloqueios",
    description: "Ausências e indisponibilidades",
    icon: CalendarOff,
    color: "text-red-600 dark:text-red-400",
    activeBg: "bg-red-50 dark:bg-red-950/40",
    activeBorder: "border-red-500/70",
    iconBg: "bg-red-100 dark:bg-red-900/40",
  },
] as const;

type TabValue = (typeof scheduleSettingsTabs)[number]["value"];

// ─── Valid tab values for URL sync ────────────────────────────────────────────

export const VALID_TAB_IDS = scheduleSettingsTabs.map((t) => t.value) as TabValue[];

// ─── Pure helper functions (used in property tests) ──────────────────────────

/**
 * Returns the badge count for a list of items.
 * Property 15: Badge de contagem reflete tamanho da lista
 */
export function getBadgeCount(items: unknown[]): number {
  return items.length;
}

/**
 * Reads the active tab from URL search params.
 * Property 16: URL sync é bidirecional
 */
export function getTabFromUrl(
  searchParams: URLSearchParams,
  validTabs: string[],
): string {
  const tab = searchParams.get("tab");
  return tab && validTabs.includes(tab) ? tab : validTabs[0];
}

/**
 * Returns a new URLSearchParams with the given tab set.
 * Property 16: URL sync é bidirecional
 */
export function setTabInUrl(
  searchParams: URLSearchParams,
  tab: string,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.set("tab", tab);
  return next;
}

// ─── Sidebar nav ─────────────────────────────────────────────────────────────

interface SidebarNavProps {
  activeTab: TabValue;
  onTabChange: (v: TabValue) => void;
  blockedCount: number;
  appointmentTypesCount: number;
}

function SidebarNav({
  activeTab,
  onTabChange: _onTabChange,
  blockedCount,
  appointmentTypesCount,
}: SidebarNavProps) {
  return (
    <>
      {scheduleSettingsTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.value;

        // Badge counts for specific tabs
        const badgeCount =
          tab.value === "blocked"
            ? blockedCount
            : tab.value === "appointment-types"
              ? appointmentTypesCount
              : 0;

        return (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "group relative h-auto w-full justify-start rounded-xl border px-3 py-2.5 text-left transition-all duration-200 overflow-hidden",
              "data-[state=inactive]:border-transparent data-[state=inactive]:hover:bg-muted/50 data-[state=inactive]:hover:border-border/50",
              isActive && `${tab.activeBg} ${tab.activeBorder} shadow-sm`,
            )}
          >
            {isActive && (
              <div
                className={cn(
                  "absolute left-0 top-2 bottom-2 w-0.5 rounded-full",
                  tab.color.replace("text-", "bg-"),
                )}
              />
            )}
            <div className="flex min-w-0 items-center gap-2.5 pl-1">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                  isActive
                    ? `${tab.iconBg} ${tab.color}`
                    : "bg-muted text-muted-foreground group-hover:bg-muted/80",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1 space-y-0.5">
                <span
                  className={cn(
                    "block text-sm font-medium leading-none transition-colors",
                    isActive ? tab.color : "",
                  )}
                >
                  {tab.label}
                </span>
                <span className="mt-1 hidden text-[11px] font-normal leading-snug text-muted-foreground lg:block">
                  {tab.description}
                </span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {badgeCount > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full",
                      isActive ? tab.color : "text-muted-foreground",
                    )}
                  >
                    {badgeCount}
                  </Badge>
                )}
                {isActive && (
                  <ChevronRight className={cn("h-3.5 w-3.5 opacity-60", tab.color)} />
                )}
              </div>
            </div>
          </TabsTrigger>
        );
      })}
    </>
  );
}

// ─── Visual tab content ───────────────────────────────────────────────────────

function VisualTabContent() {
  const { isOffline, isSyncing } = useAgendaAppearancePersistence("day");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-8 flex flex-col gap-5">
        {/* Offline banner */}
        {isOffline && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-sm">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>Modo offline — configurações salvas localmente</span>
          </div>
        )}

        {/* Loading indicator */}
        {isSyncing && !isOffline && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 text-sm">
            <span className="h-4 w-4 shrink-0 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
            <span>Sincronizando configurações...</span>
          </div>
        )}

        <GlobalPresetsPanel />
        <ViewAppearancePanel view="day" label="Dia" icon={CalendarDays} />
        <ViewAppearancePanel view="week" label="Semana" icon={CalendarRange} />
        <ViewAppearancePanel view="month" label="Mês" icon={Calendar} />
        <AccessibilitySection />
      </div>

      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-24">
          <SettingsSectionCard
            icon={<Palette className="h-4 w-4" />}
            iconBg="bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400"
            title="Cores de Status"
            description="Personalize as cores por tipo de agendamento"
          >
            <StatusColorManager />
          </SettingsSectionCard>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ScheduleSettings() {
  const { blockedTimes } = useScheduleSettings();
  const { types } = useAppointmentTypes();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Legacy redirect: capacity/hours → agenda-horarios
  const rawTab = searchParams.get("tab") ?? "visual";
  const resolvedTab: TabValue =
    rawTab === "capacity" || rawTab === "hours"
      ? "agenda-horarios"
      : VALID_TAB_IDS.includes(rawTab as TabValue)
        ? (rawTab as TabValue)
        : "visual";

  const handleTabChange = useCallback(
    (value: string) => {
      // Redirect legacy values
      const target =
        value === "capacity" || value === "hours" ? "agenda-horarios" : value;

      setSearchParams(
        (prev) => {
          prev.set("tab", target);
          return prev;
        },
        { replace: true },
      );
      setSheetOpen(false);
    },
    [setSearchParams],
  );

  const currentTabMeta = scheduleSettingsTabs.find((t) => t.value === resolvedTab);

  const blockedCount = getBadgeCount(blockedTimes ?? []);
  const appointmentTypesCount = getBadgeCount(types);

  return (
    <MainLayout compactPadding>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/agenda">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl h-9 w-9 shrink-0 hover:bg-muted/80"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 text-white shadow-sm">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-none tracking-tight">
                  Configurações da Agenda
                </h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  Aparência, horários e políticas
                </p>
              </div>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl shrink-0 border-border/60 hover:border-border"
          >
            <Link to="/agenda">Ver agenda</Link>
          </Button>
        </div>

        <Tabs
          value={resolvedTab}
          onValueChange={handleTabChange}
          className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start"
        >
          {isMobile ? (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between rounded-xl border-border/60 h-11"
                >
                  <span className="flex items-center gap-2.5">
                    {(() => {
                      const t = scheduleSettingsTabs.find((tab) => tab.value === resolvedTab);
                      if (!t) return null;
                      const Icon = t.icon;
                      return (
                        <>
                          <Icon className={cn("h-4 w-4", t.color)} />
                          <span className="font-medium">{t.label}</span>
                        </>
                      );
                    })()}
                  </span>
                  <Menu className="h-4 w-4 text-muted-foreground" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="text-base">Configurações</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-4rem)]">
                  <TabsList className="flex flex-col h-auto w-full gap-1 bg-transparent p-3">
                    <SidebarNav
                      activeTab={resolvedTab}
                      onTabChange={handleTabChange}
                      blockedCount={blockedCount}
                      appointmentTypesCount={appointmentTypesCount}
                    />
                  </TabsList>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          ) : (
            <TabsList className="hidden lg:flex lg:flex-col h-auto w-full gap-1 rounded-2xl border bg-card p-2 shadow-sm lg:sticky lg:top-4">
              <SidebarNav
                activeTab={resolvedTab}
                onTabChange={handleTabChange}
                blockedCount={blockedCount}
                appointmentTypesCount={appointmentTypesCount}
              />
            </TabsList>
          )}

          <div
            className={cn(
              "rounded-2xl border bg-card shadow-sm min-h-[60vh] overflow-hidden",
              currentTabMeta &&
                `border-t-2 ${currentTabMeta.activeBorder.replace("border-", "border-t-")}`,
            )}
          >
            {currentTabMeta && (
              <div className={cn("flex items-center gap-2.5 px-6 py-4 border-b bg-card/80")}>
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    currentTabMeta.iconBg,
                  )}
                >
                  <currentTabMeta.icon className={cn("h-4 w-4", currentTabMeta.color)} />
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", currentTabMeta.color)}>
                    {currentTabMeta.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{currentTabMeta.description}</p>
                </div>
              </div>
            )}

            <div className="p-6">
              <Suspense fallback={<SettingsLoadingState />}>
                <TabsContent value="visual" className="mt-0 focus-visible:outline-none">
                  <VisualTabContent />
                </TabsContent>

                <TabsContent value="agenda-horarios" className="mt-0 focus-visible:outline-none">
                  <AgendaHorariosTab />
                </TabsContent>

                <TabsContent value="appointment-types" className="mt-0 focus-visible:outline-none">
                  <ScheduleAppointmentTypesTab />
                </TabsContent>

                <TabsContent value="policies" className="mt-0 focus-visible:outline-none">
                  <SchedulePoliciesTab />
                </TabsContent>

                <TabsContent value="blocked" className="mt-0 focus-visible:outline-none">
                  <ScheduleBlockedTab />
                </TabsContent>
              </Suspense>
            </div>
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
}
