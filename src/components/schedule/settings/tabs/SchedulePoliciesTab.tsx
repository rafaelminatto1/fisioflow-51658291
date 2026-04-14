import { CancellationRulesManager } from "@/components/schedule/settings/CancellationRulesManager";
import { NotificationSettingsManager } from "@/components/schedule/settings/NotificationSettingsManager";
import { AlertTriangle, Bell } from "lucide-react";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";

export function SchedulePoliciesTab() {
	return (
		<div className="grid gap-4 lg:grid-cols-2 lg:items-start">
			<SettingsSectionCard
				icon={
					<AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
				}
				iconBg="bg-amber-100 dark:bg-amber-900/30"
				title="Cancelamento"
				description="Antecedência mínima, limites e taxas"
			>
				<CancellationRulesManager />
			</SettingsSectionCard>

			<SettingsSectionCard
				icon={<Bell className="h-4 w-4 text-violet-600 dark:text-violet-400" />}
				iconBg="bg-violet-100 dark:bg-violet-900/30"
				title="Notificações"
				description="Confirmações, lembretes e mensagens"
			>
				<NotificationSettingsManager />
			</SettingsSectionCard>
		</div>
	);
}
