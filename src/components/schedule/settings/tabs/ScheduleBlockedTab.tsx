import { useState } from "react";
import { BlockedTimesManager } from "@/components/schedule/settings/BlockedTimesManager";
import { cn } from "@/lib/utils";

type FilterValue = "all" | "active" | "past" | "this_week";

const FILTERS: { value: FilterValue; label: string }[] = [
	{ value: "all", label: "Todos" },
	{ value: "active", label: "Ativos" },
	{ value: "this_week", label: "Esta semana" },
	{ value: "past", label: "Passados" },
];

export function ScheduleBlockedTab() {
	const [filter, setFilter] = useState<FilterValue>("all");

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-1.5 flex-wrap">
				{FILTERS.map((f) => (
					<button
						key={f.value}
						type="button"
						onClick={() => setFilter(f.value)}
						className={cn(
							"px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
							filter === f.value
								? "bg-primary text-primary-foreground"
								: "bg-muted/50 text-muted-foreground hover:bg-muted",
						)}
					>
						{f.label}
					</button>
				))}
			</div>
			<BlockedTimesManager filter={filter} />
		</div>
	);
}
