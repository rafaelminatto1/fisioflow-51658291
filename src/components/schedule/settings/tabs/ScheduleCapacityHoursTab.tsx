import { ScheduleCapacityManager } from "@/components/schedule/ScheduleCapacityManager";
import { BusinessHoursManager } from "@/components/schedule/settings/BusinessHoursManager";
import { Users, Clock } from "lucide-react";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";

export function ScheduleCapacityHoursTab() {
	return (
		<div className="space-y-4">
		<div>
			<h2 className="text-base font-bold">Horários</h2>
			<p className="text-sm text-muted-foreground">Capacidade de atendimento e horários de funcionamento</p>
		</div>
		<div className="grid gap-4 lg:grid-cols-2 lg:items-start">
			<SettingsSectionCard
				icon={
					<Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
				}
				iconBg="bg-emerald-100 dark:bg-emerald-900/30"
				title="Capacidade"
				description="Vagas por dia e horário"
			>
				<ScheduleCapacityManager />
			</SettingsSectionCard>

			<SettingsSectionCard
				icon={<Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
				iconBg="bg-blue-100 dark:bg-blue-900/30"
				title="Horários de Funcionamento"
				description="Dias, horários e intervalos"
			>
				<BusinessHoursManager />
			</SettingsSectionCard>
		</div>
		</div>
	);
}
