import { ScheduleCapacityManager } from "@/components/schedule/ScheduleCapacityManager";
import { BusinessHoursManager } from "@/components/schedule/settings/BusinessHoursManager";
import { Users, Clock } from "lucide-react";

function SectionHeader({
	icon,
	iconBg,
	iconColor,
	title,
	description,
}: {
	icon: React.ReactNode;
	iconBg: string;
	iconColor: string;
	title: string;
	description: string;
}) {
	return (
		<div className="flex items-center gap-2 pb-3 border-b">
			<div className={`p-1.5 rounded-md ${iconBg}`}>
				<span className={iconColor}>{icon}</span>
			</div>
			<div>
				<p className="text-sm font-semibold">{title}</p>
				<p className="text-xs text-muted-foreground">{description}</p>
			</div>
		</div>
	);
}

export function ScheduleCapacityHoursTab() {
	return (
		<div className="grid gap-4 lg:grid-cols-2 lg:items-start">
			{/* Capacidade */}
			<div className="rounded-xl border bg-muted/10 p-4 space-y-4">
				<SectionHeader
					icon={<Users className="h-4 w-4" />}
					iconBg="bg-emerald-100 dark:bg-emerald-900/30"
					iconColor="text-emerald-600 dark:text-emerald-400"
					title="Capacidade"
					description="Vagas por dia e horário"
				/>
				<ScheduleCapacityManager />
			</div>

			{/* Horários de Funcionamento */}
			<div className="rounded-xl border bg-muted/10 p-4 space-y-4">
				<SectionHeader
					icon={<Clock className="h-4 w-4" />}
					iconBg="bg-blue-100 dark:bg-blue-900/30"
					iconColor="text-blue-600 dark:text-blue-400"
					title="Horários de Funcionamento"
					description="Dias e horários de atendimento"
				/>
				<BusinessHoursManager />
			</div>
		</div>
	);
}
