import { BusinessHoursManager } from "@/components/schedule/settings/BusinessHoursManager";
import { BookingWindowSettings } from "@/components/schedule/settings/BookingWindowSettings";
import { SlotAlignmentSettings } from "@/components/schedule/settings/SlotAlignmentSettings";
import { Clock } from "lucide-react";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";

export function ScheduleCapacityHoursTab() {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
			<div className="lg:col-span-7">
				<SettingsSectionCard
					icon={<Clock className="h-4 w-4" />}
					iconBg="bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400"
					title="Horário de Funcionamento"
					description="Defina os horários de abertura e fechamento de cada dia"
					variant="highlight"
				>
					<BusinessHoursManager />
				</SettingsSectionCard>
			</div>

			<div className="lg:col-span-5 flex flex-col gap-5">
				<BookingWindowSettings />
				<SlotAlignmentSettings />
			</div>
		</div>
	);
}
