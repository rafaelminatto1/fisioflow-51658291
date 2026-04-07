import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { CancellationRulesManager } from "@/components/schedule/settings/CancellationRulesManager";
import { NotificationSettingsManager } from "@/components/schedule/settings/NotificationSettingsManager";
import { AlertTriangle, Bell } from "lucide-react";

export function SchedulePoliciesTab() {
	return (
		<div className="space-y-4">
			<Accordion
				type="multiple"
				defaultValue={["cancellation", "notifications"]}
				className="space-y-2"
			>
				<AccordionItem value="cancellation" className="border rounded-lg px-4">
					<AccordionTrigger className="py-3 hover:no-underline">
						<div className="flex items-center gap-2">
							<div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-md">
								<AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
							</div>
							<div className="text-left">
								<p className="text-sm font-semibold">Cancelamento</p>
								<p className="text-xs text-muted-foreground font-normal">
									Antecedência mínima, limites e taxas
								</p>
							</div>
						</div>
					</AccordionTrigger>
					<AccordionContent className="pb-4">
						<CancellationRulesManager />
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="notifications" className="border rounded-lg px-4">
					<AccordionTrigger className="py-3 hover:no-underline">
						<div className="flex items-center gap-2">
							<div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-md">
								<Bell className="h-4 w-4 text-violet-600 dark:text-violet-400" />
							</div>
							<div className="text-left">
								<p className="text-sm font-semibold">Notificações</p>
								<p className="text-xs text-muted-foreground font-normal">
									Confirmações, lembretes e mensagens
								</p>
							</div>
						</div>
					</AccordionTrigger>
					<AccordionContent className="pb-4">
						<NotificationSettingsManager />
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}
