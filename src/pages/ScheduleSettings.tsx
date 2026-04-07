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

export default function ScheduleSettings() {
	useScheduleSettings();
	useScheduleCapacity();

	return (
		<MainLayout>
			<div className="max-w-4xl mx-auto space-y-6">
				<div className="flex items-center gap-4 pb-2">
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
							Horários, políticas, bloqueios e visualização
						</p>
					</div>
				</div>

				<Tabs defaultValue="schedule" className="space-y-4">
					<TabsList className="grid w-full grid-cols-4 h-auto gap-1 bg-muted/50 p-1 rounded-lg">
						<TabsTrigger
							value="schedule"
							className="rounded-md data-[state=active]:shadow-sm flex items-center gap-1.5 py-2.5"
						>
							<Clock className="h-4 w-4" />
							<span className="text-xs">Horários</span>
						</TabsTrigger>
						<TabsTrigger
							value="policies"
							className="rounded-md data-[state=active]:shadow-sm flex items-center gap-1.5 py-2.5"
						>
							<Shield className="h-4 w-4" />
							<span className="text-xs">Políticas</span>
						</TabsTrigger>
						<TabsTrigger
							value="blocked"
							className="rounded-md data-[state=active]:shadow-sm flex items-center gap-1.5 py-2.5"
						>
							<CalendarOff className="h-4 w-4" />
							<span className="text-xs">Bloqueios</span>
						</TabsTrigger>
						<TabsTrigger
							value="visual"
							className="rounded-md data-[state=active]:shadow-sm flex items-center gap-1.5 py-2.5"
						>
							<Palette className="h-4 w-4" />
							<span className="text-xs">Visual</span>
						</TabsTrigger>
					</TabsList>

					<TabsContent value="schedule" className="focus-visible:outline-none">
						<ScheduleCapacityHoursTab />
					</TabsContent>

					<TabsContent value="policies" className="focus-visible:outline-none">
						<SchedulePoliciesTab />
					</TabsContent>

					<TabsContent value="blocked" className="focus-visible:outline-none">
						<ScheduleBlockedTab />
					</TabsContent>

					<TabsContent value="visual" className="focus-visible:outline-none">
						<ScheduleVisualTab />
					</TabsContent>
				</Tabs>
			</div>
		</MainLayout>
	);
}
