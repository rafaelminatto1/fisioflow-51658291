import { ScheduleCapacityManager } from "@/components/schedule/ScheduleCapacityManager";
import { BusinessHoursManager } from "@/components/schedule/settings/BusinessHoursManager";
import { Users, Clock } from "lucide-react";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";

export function ScheduleCapacityHoursTab() {
	return (
		<div className="space-y-5">
			{/* Capacidade */}
			<SettingsSectionCard
				icon={<Users className="h-4 w-4" />}
				iconBg="bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400"
				title="Capacidade de Atendimento"
				description="Número máximo de vagas por dia e faixa de horário"
				variant="highlight"
			>
				<ScheduleCapacityManager />
			</SettingsSectionCard>

			{/* Horários de Funcionamento */}
			<SettingsSectionCard
				icon={<Clock className="h-4 w-4" />}
				iconBg="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
				title="Horários de Funcionamento"
				description="Dias da semana, horários de abertura/fechamento e intervalos"
				variant="highlight"
			>
				<BusinessHoursManager />
			</SettingsSectionCard>
		</div>
	);
}
