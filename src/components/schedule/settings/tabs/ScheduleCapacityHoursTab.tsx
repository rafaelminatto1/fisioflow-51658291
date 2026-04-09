import { ScheduleCapacityManager } from "@/components/schedule/ScheduleCapacityManager";
import { BusinessHoursManager } from "@/components/schedule/settings/BusinessHoursManager";
import { Users, Clock } from "lucide-react";

export function ScheduleCapacityHoursTab() {
	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-md">
						<Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
					</div>
					<div>
						<p className="text-sm font-semibold">Capacidade</p>
						<p className="text-xs text-muted-foreground">Vagas por dia e horário</p>
					</div>
				</div>
				<ScheduleCapacityManager />
			</div>

			<div className="border-t" />

			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
						<Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
					</div>
					<div>
						<p className="text-sm font-semibold">Horários de Funcionamento</p>
						<p className="text-xs text-muted-foreground">Dias e horários de atendimento</p>
					</div>
				</div>
				<BusinessHoursManager />
			</div>
		</div>
	);
}
