import type { CapacityGroup } from "@/hooks/useScheduleCapacity";
import { cn } from "@/lib/utils";

const DAY_SHORT: Record<number, string> = {
	0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb",
};

function formatDaysLabel(days: number[]): string {
	if (days.length === 0) return "";
	const sorted = [...days].sort((a, b) => a - b);
	const runs: number[][] = [];
	let run = [sorted[0]];
	for (let i = 1; i < sorted.length; i++) {
		if (sorted[i] === run[run.length - 1] + 1) run.push(sorted[i]);
		else {
			runs.push(run);
			run = [sorted[i]];
		}
	}
	runs.push(run);
	return runs
		.map((r) =>
			r.length >= 2
				? `${DAY_SHORT[r[0]]}-${DAY_SHORT[r[r.length - 1]]}`
				: DAY_SHORT[r[0]],
		)
		.join(", ");
}

const INTENSITY_CLASSES = [
	"bg-blue-200/50 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300",
	"bg-blue-300/50 dark:bg-blue-700/40 text-blue-800 dark:text-blue-200",
	"bg-blue-400/60 dark:bg-blue-600/50 text-blue-900 dark:text-blue-100",
	"bg-blue-500/70 dark:bg-blue-500/60 text-white dark:text-white",
];

function getIntensityClass(ratio: number): string {
	if (ratio <= 0.33) return INTENSITY_CLASSES[0];
	if (ratio <= 0.55) return INTENSITY_CLASSES[1];
	if (ratio <= 0.75) return INTENSITY_CLASSES[2];
	return INTENSITY_CLASSES[3];
}

interface WeeklyHeatmapGridProps {
	groups: CapacityGroup[];
}

export function WeeklyHeatmapGrid({ groups }: WeeklyHeatmapGridProps) {
	const dayCapacities: Record<number, number> = {};
	for (const g of groups) {
		for (const d of g.days) {
			dayCapacities[d] = (dayCapacities[d] || 0) + g.max_patients;
		}
	}
	const maxCap = Math.max(...Object.values(dayCapacities), 1);

	const days = [
		{ num: 1, label: "S" },
		{ num: 2, label: "T" },
		{ num: 3, label: "Q" },
		{ num: 4, label: "Q" },
		{ num: 5, label: "S" },
		{ num: 6, label: "S" },
		{ num: 0, label: "D" },
	];

	return (
		<div className="bg-card rounded-xl p-6 shadow-sm border border-border/60">
			<h3 className="text-sm font-medium text-foreground mb-4">
				Disponibilidade Semanal
			</h3>
			<div className="space-y-1">
				<div className="grid grid-cols-7 gap-1">
					{days.map((d) => (
						<div
							key={d.num}
							className="text-center text-[10px] font-semibold text-muted-foreground uppercase pb-1"
						>
							{d.label}
						</div>
					))}
				</div>
				<div className="grid grid-cols-7 gap-1">
					{days.map((d) => {
						const cap = dayCapacities[d.num] || 0;
						const ratio = cap > 0 ? cap / maxCap : 0;
						return (
							<div
								key={d.num}
								className={cn(
									"aspect-square rounded-md flex items-center justify-center text-[10px] font-semibold transition-colors",
									cap > 0
										? getIntensityClass(ratio)
										: "bg-muted text-muted-foreground",
								)}
							>
								{cap > 0 ? cap : "—"}
							</div>
						);
					})}
				</div>
			</div>
			<div className="flex items-center justify-between mt-4">
				<span className="text-[10px] text-muted-foreground">Livre</span>
				<div className="flex-1 h-1.5 mx-2 bg-gradient-to-r from-muted via-blue-400/50 to-blue-600 dark:to-blue-400 rounded-full" />
				<span className="text-[10px] text-muted-foreground">Lotado</span>
			</div>
			{groups.length > 0 && (
				<div className="mt-4 pt-4 border-t">
					<div className="space-y-1.5">
						{groups.map((g) => (
							<div
								key={`${g.start_time}-${g.end_time}`}
								className="flex items-center justify-between text-xs"
							>
								<span className="text-muted-foreground">
									{formatDaysLabel(g.days)} • {g.start_time.slice(0, 5)}-{g.end_time.slice(0, 5)}
								</span>
								<span className="font-semibold text-foreground">
									{g.max_patients} vaga{g.max_patients !== 1 ? "s" : ""}/hora
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
