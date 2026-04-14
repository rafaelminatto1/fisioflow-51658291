import { Suspense, lazy, useCallback, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	ArrowLeft,
	CalendarOff,
	Clock,
	Eye,
	LayoutDashboard,
	Palette,
	Shield,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";
import { SettingsLoadingState } from "@/components/schedule/settings/shared/SettingsLoadingState";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
const ScheduleOverviewTab = lazy(() =>
	import("@/components/schedule/settings/tabs/ScheduleOverviewTab").then(
		(m) => ({ default: m.ScheduleOverviewTab }),
	),
);
const ScheduleCapacityHoursTab = lazy(() =>
	import("@/components/schedule/settings/tabs/ScheduleCapacityHoursTab").then(
		(m) => ({ default: m.ScheduleCapacityHoursTab }),
	),
);
const SchedulePoliciesTab = lazy(() =>
	import("@/components/schedule/settings/tabs/SchedulePoliciesTab").then(
		(m) => ({ default: m.SchedulePoliciesTab }),
	),
);
const ScheduleBlockedTab = lazy(() =>
	import("@/components/schedule/settings/tabs/ScheduleBlockedTab").then(
		(m) => ({ default: m.ScheduleBlockedTab }),
	),
);
const ScheduleVisualTab = lazy(() =>
	import("@/components/schedule/settings/tabs/ScheduleVisualTab").then((m) => ({
		default: m.ScheduleVisualTab,
	})),
);
const ScheduleAccessibilityTab = lazy(() =>
	import("@/components/schedule/settings/tabs/ScheduleAccessibilityTab").then(
		(m) => ({ default: m.ScheduleAccessibilityTab }),
	),
);

const scheduleSettingsTabs = [
	{
		value: "overview",
		label: "Visão Geral",
		description: "Resumo das configurações",
		icon: LayoutDashboard,
	},
	{
		value: "schedule",
		label: "Horários",
		description: "Capacidade e funcionamento",
		icon: Clock,
	},
	{
		value: "policies",
		label: "Políticas",
		description: "Cancelamentos e lembretes",
		icon: Shield,
	},
	{
		value: "blocked",
		label: "Bloqueios",
		description: "Ausências e indisponibilidades",
		icon: CalendarOff,
	},
	{
		value: "visual",
		label: "Aparência",
		description: "Cards e cores da agenda",
		icon: Palette,
	},
	{
		value: "accessibility",
		label: "Acessibilidade",
		description: "Contraste, texto e animações",
		icon: Eye,
	},
] as const;

type TabValue = (typeof scheduleSettingsTabs)[number]["value"];

function SidebarNav({
	activeTab,
	onTabChange,
}: {
	activeTab: TabValue;
	onTabChange: (v: TabValue) => void;
}) {
	return (
		<>
			{scheduleSettingsTabs.map((tab) => {
				const Icon = tab.icon;
				return (
					<TabsTrigger
						key={tab.value}
						value={tab.value}
						className="group h-auto min-h-12 w-full justify-start rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
					>
						<div className="flex min-w-0 items-center gap-2.5">
							<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-data-[state=active]:bg-primary/15 group-data-[state=active]:text-primary">
								<Icon className="h-3.5 w-3.5" />
							</span>
							<span className="min-w-0 space-y-0.5">
								<span className="block text-sm font-medium leading-none">
									{tab.label}
								</span>
								<span className="mt-1 hidden text-[11px] font-normal leading-snug text-muted-foreground lg:block">
									{tab.description}
								</span>
							</span>
						</div>
					</TabsTrigger>
				);
			})}
		</>
	);
}

export default function ScheduleSettings() {
	useScheduleSettings();
	useScheduleCapacity();
	const isMobile = useIsMobile();
	const [searchParams, setSearchParams] = useSearchParams();
	const [sheetOpen, setSheetOpen] = useState(false);
	const activeTab = (searchParams.get("tab") ?? "overview") as TabValue;

	const handleTabChange = useCallback(
		(value: string) => {
			setSearchParams(
				(prev) => {
					prev.set("tab", value);
					return prev;
				},
				{ replace: true },
			);
			setSheetOpen(false);
		},
		[setSearchParams],
	);

	const isValidTab = scheduleSettingsTabs.some((t) => t.value === activeTab);
	const currentTab = isValidTab ? activeTab : "overview";

	return (
		<MainLayout compactPadding>
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Link to="/agenda">
							<Button
								variant="ghost"
								size="icon"
								className="rounded-xl h-9 w-9"
							>
								<ArrowLeft className="h-4 w-4" />
							</Button>
						</Link>
						<div>
							<div className="flex items-center gap-2 mb-0.5">
								<Badge
									variant="outline"
									className="gap-1 rounded-full text-xs px-2 py-0.5"
								>
									<Clock className="h-3 w-3" />
									Agenda
								</Badge>
							</div>
							<h1 className="text-lg font-bold tracking-tight leading-none">
								Configurações da Agenda
							</h1>
						</div>
					</div>
					<Button asChild variant="outline" size="sm" className="rounded-xl">
						<Link to="/agenda">Ver agenda</Link>
					</Button>
				</div>

				<Tabs
					value={currentTab}
					onValueChange={handleTabChange}
					className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start"
				>
					{isMobile ? (
						<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
							<SheetTrigger asChild>
								<Button
									variant="outline"
									className="w-full justify-between rounded-xl"
								>
									<span className="flex items-center gap-2">
										{(() => {
											const t = scheduleSettingsTabs.find(
												(tab) => tab.value === currentTab,
											);
											if (!t) return null;
											const Icon = t.icon;
											return (
												<>
													<Icon className="h-4 w-4" />
													{t.label}
												</>
											);
										})()}
									</span>
									<LayoutDashboard className="h-4 w-4 text-muted-foreground" />
								</Button>
							</SheetTrigger>
							<SheetContent side="left" className="w-72 p-0">
								<SheetHeader className="p-4 border-b">
									<SheetTitle className="text-base">Configurações</SheetTitle>
								</SheetHeader>
								<ScrollArea className="h-[calc(100vh-4rem)]">
									<TabsList className="flex flex-col h-auto w-full gap-1 bg-transparent p-3">
										<SidebarNav
											activeTab={currentTab}
											onTabChange={handleTabChange}
										/>
									</TabsList>
								</ScrollArea>
							</SheetContent>
						</Sheet>
					) : (
						<TabsList className="hidden lg:grid h-auto w-full grid-cols-2 gap-1.5 rounded-2xl border bg-background p-1.5 shadow-sm lg:sticky lg:top-4 lg:block lg:space-y-1">
							<SidebarNav
								activeTab={currentTab}
								onTabChange={handleTabChange}
							/>
						</TabsList>
					)}

					<div className="rounded-2xl border bg-background p-4 shadow-sm min-h-[60vh]">
						<Suspense fallback={<SettingsLoadingState />}>
							<TabsContent
								value="overview"
								className="mt-0 focus-visible:outline-none"
							>
								<ScheduleOverviewTab />
							</TabsContent>

							<TabsContent
								value="schedule"
								className="mt-0 focus-visible:outline-none"
							>
								<ScheduleCapacityHoursTab />
							</TabsContent>

							<TabsContent
								value="policies"
								className="mt-0 focus-visible:outline-none"
							>
								<SchedulePoliciesTab />
							</TabsContent>

							<TabsContent
								value="blocked"
								className="mt-0 focus-visible:outline-none"
							>
								<ScheduleBlockedTab />
							</TabsContent>

							<TabsContent
								value="visual"
								className="mt-0 focus-visible:outline-none"
							>
								<ScheduleVisualTab />
							</TabsContent>

							<TabsContent
								value="accessibility"
								className="mt-0 focus-visible:outline-none"
							>
								<ScheduleAccessibilityTab />
							</TabsContent>
						</Suspense>
					</div>
				</Tabs>
			</div>
		</MainLayout>
	);
}
