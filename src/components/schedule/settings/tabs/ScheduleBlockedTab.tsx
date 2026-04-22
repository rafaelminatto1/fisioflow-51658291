import { useState } from "react";
import { BlockedTimesManager } from "@/components/schedule/settings/BlockedTimesManager";
import { cn } from "@/lib/utils";
import { CalendarOff, CalendarCheck, Clock, History } from "lucide-react";

type FilterValue = "all" | "active" | "past" | "this_week";

const FILTERS: {
	value: FilterValue;
	label: string;
	icon: React.ElementType;
}[] = [
	{ value: "all", label: "Todos", icon: CalendarOff },
	{ value: "active", label: "Ativos", icon: CalendarCheck },
	{ value: "this_week", label: "Esta semana", icon: Clock },
	{ value: "past", label: "Passados", icon: History },
];

export function ScheduleBlockedTab() {
	const [filter, setFilter] = useState<FilterValue>("all");

	return (
		<div className="space-y-5">
			{/* Filter tabs */}
			<div
				className="flex items-center gap-1.5 flex-wrap p-1 bg-muted/40 rounded-xl"
				role="tablist"
				aria-label="Filtro de bloqueios"
			>
				{FILTERS.map((f) => {
					const Icon = f.icon;
					const isActive = filter === f.value;
					return (
						<button
							key={f.value}
							type="button"
							role="tab"
							aria-selected={isActive}
							onClick={() => setFilter(f.value)}
							className={cn(
								"flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150",
								isActive
									? "bg-card text-foreground shadow-sm border border-border/60"
									: "text-muted-foreground hover:text-foreground hover:bg-muted/60",
							)}
						>
							<Icon className={cn("h-3.5 w-3.5", isActive && "text-red-500")} />
							{f.label}
						</button>
					);
				})}
			</div>

			{/* Content */}
			<BlockedTimesManager filter={filter} />
		</div>
	);
}
