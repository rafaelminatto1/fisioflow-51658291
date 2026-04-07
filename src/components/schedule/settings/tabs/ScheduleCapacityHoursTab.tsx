import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { ScheduleCapacityManager } from "@/components/schedule/ScheduleCapacityManager";
import { BusinessHoursManager } from "@/components/schedule/settings/BusinessHoursManager";
import { Users, Clock } from "lucide-react";

export function ScheduleCapacityHoursTab() {
	return (
		<div className="space-y-4">
			<Accordion
				type="multiple"
				defaultValue={["capacity", "hours"]}
				className="space-y-2"
			>
				<AccordionItem value="capacity" className="border rounded-lg px-4">
					<AccordionTrigger className="py-3 hover:no-underline">
						<div className="flex items-center gap-2">
							<div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-md">
								<Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
							</div>
							<div className="text-left">
								<p className="text-sm font-semibold">Capacidade</p>
								<p className="text-xs text-muted-foreground font-normal">
									Vagas por dia e horário
								</p>
							</div>
						</div>
					</AccordionTrigger>
					<AccordionContent className="pb-4">
						<ScheduleCapacityManager />
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="hours" className="border rounded-lg px-4">
					<AccordionTrigger className="py-3 hover:no-underline">
						<div className="flex items-center gap-2">
							<div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
								<Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
							</div>
							<div className="text-left">
								<p className="text-sm font-semibold">
									Horários de Funcionamento
								</p>
								<p className="text-xs text-muted-foreground font-normal">
									Dias e horários de atendimento
								</p>
							</div>
						</div>
					</AccordionTrigger>
					<AccordionContent className="pb-4">
						<BusinessHoursManager />
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}
