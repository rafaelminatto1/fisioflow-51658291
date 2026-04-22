import { CancellationRulesManager } from "@/components/schedule/settings/CancellationRulesManager";
import { NotificationSettingsManager } from "@/components/schedule/settings/NotificationSettingsManager";
import { NoShowPolicyCard } from "@/components/schedule/settings/NoShowPolicyCard";
import { ShieldAlert, Bell, UserX } from "lucide-react";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";

export function SchedulePoliciesTab() {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
			<div className="lg:col-span-8 space-y-5">
				<SettingsSectionCard
					icon={<ShieldAlert className="h-4 w-4" />}
					iconBg="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
					title="Política de Cancelamento"
					description="Antecedência mínima, limites mensais e taxas por cancelamento tardio"
					variant="warning"
				>
					<CancellationRulesManager />
				</SettingsSectionCard>

				<SettingsSectionCard
					icon={<UserX className="h-4 w-4" />}
					iconBg="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
					title="Política de No-Show"
					description="Controle de faltas sem aviso e ações automáticas"
				>
					<NoShowPolicyCard />
				</SettingsSectionCard>
			</div>

			<div className="lg:col-span-4 space-y-5">
				<SettingsSectionCard
					icon={<Bell className="h-4 w-4" />}
					iconBg="bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400"
					title="Notificações Automáticas"
					description="Confirmações, lembretes e mensagens por canal"
					variant="highlight"
				>
					<NotificationSettingsManager />
				</SettingsSectionCard>
			</div>
		</div>
	);
}
