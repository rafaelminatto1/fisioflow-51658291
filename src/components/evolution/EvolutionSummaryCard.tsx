import { memo } from "react";
import {
	FileText,
	Target,
	TrendingUp,
	Activity,
	BarChart3,
	CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EvolutionSummaryCardProps {
	stats: {
		totalEvolutions: number;
		completedGoals: number;
		totalGoals: number;
		avgGoalProgress: number;
		activePathologiesCount: number;
		totalMeasurements: number;
		completionRate: number;
	};
}

const STATS = [
	{
		label: "Evoluções",
		getValue: (s: EvolutionSummaryCardProps["stats"]) => s.totalEvolutions,
		icon: FileText,
		color: "text-blue-600",
		bg: "bg-blue-50",
	},
	{
		label: "Metas",
		getValue: (s: EvolutionSummaryCardProps["stats"]) =>
			`${s.completedGoals}/${s.totalGoals}`,
		icon: Target,
		color: "text-green-600",
		bg: "bg-green-50",
	},
	{
		label: "Progresso",
		getValue: (s: EvolutionSummaryCardProps["stats"]) => `${s.avgGoalProgress}%`,
		icon: TrendingUp,
		color: "text-purple-600",
		bg: "bg-purple-50",
	},
	{
		label: "Patologias",
		getValue: (s: EvolutionSummaryCardProps["stats"]) => s.activePathologiesCount,
		icon: Activity,
		color: "text-orange-600",
		bg: "bg-orange-50",
	},
	{
		label: "Medições",
		getValue: (s: EvolutionSummaryCardProps["stats"]) => s.totalMeasurements,
		icon: BarChart3,
		color: "text-cyan-600",
		bg: "bg-cyan-50",
	},
	{
		label: "Sucesso",
		getValue: (s: EvolutionSummaryCardProps["stats"]) => `${s.completionRate}%`,
		icon: CheckCircle2,
		color: "text-emerald-600",
		bg: "bg-emerald-50",
	},
] as const;

export const EvolutionSummaryCard = memo(function EvolutionSummaryCard({
	stats,
}: EvolutionSummaryCardProps) {
	return (
		<div className="rounded-xl border border-border/50 bg-white/80 shadow-sm px-3 py-2">
			<div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-border/40">
				{STATS.map((stat) => {
					const Icon = stat.icon;
					const value = stat.getValue(stats);
					return (
						<div
							key={stat.label}
							className="flex items-center gap-2 px-3 py-1 first:pl-0 last:pr-0"
						>
							<div className={cn("p-1.5 rounded-lg shrink-0", stat.bg)}>
								<Icon className={cn("h-3.5 w-3.5", stat.color)} />
							</div>
							<div className="min-w-0">
								<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide leading-none truncate">
									{stat.label}
								</p>
								<p className={cn("text-sm font-black leading-tight mt-0.5 truncate", stat.color)}>
									{value}
								</p>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
});
