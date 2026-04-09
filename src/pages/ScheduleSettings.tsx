import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	ArrowLeft,
	CalendarOff,
	Clock,
	Palette,
	Shield,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";
import { ScheduleCapacityHoursTab } from "@/components/schedule/settings/tabs/ScheduleCapacityHoursTab";
import { SchedulePoliciesTab } from "@/components/schedule/settings/tabs/SchedulePoliciesTab";
import { ScheduleBlockedTab } from "@/components/schedule/settings/tabs/ScheduleBlockedTab";
import { ScheduleVisualTab } from "@/components/schedule/settings/tabs/ScheduleVisualTab";
import { useState } from "react";

const scheduleSettingsTabs = [
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
		label: "Visual",
		description: "Cards, cores e acessibilidade",
		icon: Palette,
	},
] as const;

type ScheduleSettingsTabValue = (typeof scheduleSettingsTabs)[number]["value"];

export default function ScheduleSettings() {
	useScheduleSettings();
	useScheduleCapacity();
	const [activeTab, setActiveTab] = useState<ScheduleSettingsTabValue>("schedule");

	return (
		<MainLayout compactPadding>
			<div className="space-y-4">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Link to="/agenda">
							<Button variant="ghost" size="icon" className="rounded-xl h-9 w-9">
								<ArrowLeft className="h-4 w-4" />
							</Button>
						</Link>
						<div>
							<div className="flex items-center gap-2 mb-0.5">
								<Badge variant="outline" className="gap-1 rounded-full text-xs px-2 py-0.5">
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

				{/* Layout 2-col */}
				<Tabs
					value={activeTab}
					onValueChange={(value) => setActiveTab(value as ScheduleSettingsTabValue)}
					className="grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start"
				>
					{/* Nav lateral */}
					<TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-2xl border bg-background p-1.5 shadow-sm lg:sticky lg:top-4 lg:block lg:space-y-1">
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
					</TabsList>

					{/* Conteúdo */}
					<div className="rounded-2xl border bg-background p-4 shadow-sm min-h-[60vh]">
						<TabsContent value="schedule" className="mt-0 focus-visible:outline-none">
							<ScheduleCapacityHoursTab />
						</TabsContent>

						<TabsContent value="policies" className="mt-0 focus-visible:outline-none">
							<SchedulePoliciesTab />
						</TabsContent>

						<TabsContent value="blocked" className="mt-0 focus-visible:outline-none">
							<ScheduleBlockedTab />
						</TabsContent>

						<TabsContent value="visual" className="mt-0 focus-visible:outline-none">
							<ScheduleVisualTab />
						</TabsContent>
					</div>
				</Tabs>
			</div>
		</MainLayout>
	);
}
