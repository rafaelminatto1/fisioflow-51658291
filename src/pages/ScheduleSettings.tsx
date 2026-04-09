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
		<MainLayout>
			<div className="mx-auto max-w-6xl space-y-5">
				{/* Header */}
				<div className="rounded-3xl border bg-background p-5 shadow-sm">
					<div className="flex items-center justify-between">
						<div className="flex items-start gap-3">
							<Link to="/agenda">
								<Button variant="ghost" size="icon" className="rounded-xl">
									<ArrowLeft className="h-5 w-5" />
								</Button>
							</Link>
							<div className="space-y-1">
								<Badge variant="outline" className="w-fit gap-1.5 rounded-full text-xs">
									<Clock className="h-3 w-3" />
									Agenda
								</Badge>
								<h1 className="text-xl font-bold tracking-tight">
									Configurações da Agenda
								</h1>
							</div>
						</div>
						<Button asChild variant="outline" size="sm" className="rounded-xl">
							<Link to="/agenda">Ver agenda</Link>
						</Button>
					</div>
				</div>

				{/* Layout 2-col */}
				<Tabs
					value={activeTab}
					onValueChange={(value) => setActiveTab(value as ScheduleSettingsTabValue)}
					className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start"
				>
					{/* Nav lateral */}
					<TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-3xl border bg-background p-2 shadow-sm lg:sticky lg:top-4 lg:block lg:space-y-1.5">
						{scheduleSettingsTabs.map((tab) => {
							const Icon = tab.icon;
							return (
								<TabsTrigger
									key={tab.value}
									value={tab.value}
									className="group h-auto min-h-14 w-full justify-start rounded-2xl border border-transparent px-3 py-3 text-left transition-colors data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
								>
									<div className="flex min-w-0 items-center gap-3">
										<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-data-[state=active]:bg-primary/15 group-data-[state=active]:text-primary">
											<Icon className="h-4 w-4" />
										</span>
										<span className="min-w-0 space-y-0.5">
											<span className="block text-sm font-medium leading-none">
												{tab.label}
											</span>
											<span className="mt-1 hidden text-xs font-normal leading-snug text-muted-foreground sm:block">
												{tab.description}
											</span>
										</span>
									</div>
								</TabsTrigger>
							);
						})}
					</TabsList>

					{/* Conteúdo */}
					<div className="rounded-3xl border bg-background p-5 shadow-sm">
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
