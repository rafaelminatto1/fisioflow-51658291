import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Shield, CalendarOff, Palette, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";
import { ScheduleCapacityHoursTab } from "@/components/schedule/settings/tabs/ScheduleCapacityHoursTab";
import { SchedulePoliciesTab } from "@/components/schedule/settings/tabs/SchedulePoliciesTab";
import { ScheduleBlockedTab } from "@/components/schedule/settings/tabs/ScheduleBlockedTab";
import { ScheduleVisualTab } from "@/components/schedule/settings/tabs/ScheduleVisualTab";

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

export default function ScheduleSettings() {
	useScheduleSettings();
	useScheduleCapacity();

	return (
		<MainLayout>
			<div className="mx-auto max-w-6xl space-y-6">
				<div className="flex items-start gap-4 pb-2">
					<Link to="/agenda">
						<Button variant="ghost" size="icon" className="rounded-lg">
							<ArrowLeft className="h-5 w-5" />
						</Button>
					</Link>
					<div className="flex-1">
						<h1 className="text-2xl font-bold tracking-tight">
							Configurações da Agenda
						</h1>
						<p className="text-sm text-muted-foreground">
							Ajuste horários, regras, bloqueios e aparência sem sair do fluxo
							da agenda.
						</p>
					</div>
				</div>

				<Tabs
					defaultValue="schedule"
					className="grid gap-5 md:grid-cols-[17rem_minmax(0,1fr)] md:items-start"
				>
					<TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl border bg-background p-2 shadow-sm md:sticky md:top-4 md:block md:space-y-1.5">
						{scheduleSettingsTabs.map((tab) => {
							const Icon = tab.icon;

							return (
								<TabsTrigger
									key={tab.value}
									value={tab.value}
									className="group h-auto min-h-14 w-full justify-start rounded-xl border border-transparent px-3 py-3 text-left transition-colors data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none md:min-h-[4.5rem]"
								>
									<div className="flex min-w-0 items-center gap-3">
										<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-data-[state=active]:bg-primary/15 group-data-[state=active]:text-primary">
											<Icon className="h-4 w-4" />
										</span>
										<span className="min-w-0 space-y-0.5">
											<span className="block text-sm font-medium leading-none">
												{tab.label}
											</span>
											<span className="hidden text-xs font-normal leading-snug text-muted-foreground md:block">
												{tab.description}
											</span>
										</span>
									</div>
								</TabsTrigger>
							);
						})}
					</TabsList>

					<div className="min-w-0 rounded-2xl border bg-background p-4 shadow-sm sm:p-5">
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
					</div>
				</Tabs>
			</div>
		</MainLayout>
	);
}
