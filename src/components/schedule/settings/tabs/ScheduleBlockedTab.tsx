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
			<div
				className="flex items-center gap-0 border-b"
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
								"flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors relative",
								isActive
									? "text-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{isActive && (
								<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />
							)}
							<Icon className={cn("h-3.5 w-3.5", isActive && "text-red-500")} />
							{f.label}
						</button>
					);
				})}
			</div>

			<BlockedTimesManager filter={filter} />
		</div>
	);
}
