import React, { memo } from "react";
import {
	FileText,
	Target,
	TrendingUp,
	Activity,
	BarChart3,
	CheckCircle2,
} from "lucide-react";

interface EvolutionStatsProps {
	stats: {
		totalEvolutions: number;
		completedGoals: number;
		totalGoals: number;
		avgGoalProgress: number;
		activePathologiesCount: number;
		totalMeasurements: number;
		completionRate: number;
	};
	/** Layout compacto para cards em linha - 2 colunas, fontes maiores, dados visíveis */
	compact?: boolean;
	/** Layout vertical para card grande - stats em lista com progress indicators */
	vertical?: boolean;
}

const STAT_CONFIG = [
	{
		label: "Evoluções",
		getVal: (s: EvolutionStatsProps["stats"]) => s.totalEvolutions || 0,
		icon: FileText,
		color: "blue",
	},
	{
		label: "Metas",
		getVal: (s: EvolutionStatsProps["stats"]) =>
			`${s.completedGoals || 0}/${s.totalGoals || 0}`,
		icon: Target,
		color: "green",
	},
	{
		label: "Progresso",
		getVal: (s: EvolutionStatsProps["stats"]) => `${s.avgGoalProgress || 0}%`,
		icon: TrendingUp,
		color: "purple",
	},
	{
		label: "Patologias",
		getVal: (s: EvolutionStatsProps["stats"]) => s.activePathologiesCount || 0,
		icon: Activity,
		color: "orange",
	},
	{
		label: "Medições",
		getVal: (s: EvolutionStatsProps["stats"]) => s.totalMeasurements || 0,
		icon: BarChart3,
		color: "cyan",
	},
	{
		label: "Sucesso",
		getVal: (s: EvolutionStatsProps["stats"]) => `${s.completionRate || 0}%`,
		icon: CheckCircle2,
		color: "emerald",
	},
] as const;

const COLOR_CLASSES: Record<
	string,
	{
		bg: string;
		text: string;
		icon: string;
		border: string;
		progress: string;
	}
> = {
	blue: {
		bg: "from-blue-500/5",
		text: "text-blue-600 dark:text-blue-400",
		icon: "text-blue-500/30 group-hover:text-blue-500/50",
		border: "border-blue-500/20",
		progress: "bg-blue-500",
	},
	green: {
		bg: "from-green-500/5",
		text: "text-green-600 dark:text-green-400",
		icon: "text-green-500/30 group-hover:text-green-500/50",
		border: "border-green-500/20",
		progress: "bg-green-500",
	},
	purple: {
		bg: "from-purple-500/5",
		text: "text-purple-600 dark:text-purple-400",
		icon: "text-purple-500/30 group-hover:text-purple-500/50",
		border: "border-purple-500/20",
		progress: "bg-purple-500",
	},
	orange: {
		bg: "from-orange-500/5",
		text: "text-orange-600 dark:text-orange-400",
		icon: "text-orange-500/30 group-hover:text-orange-500/50",
		border: "border-orange-500/20",
		progress: "bg-orange-500",
	},
	cyan: {
		bg: "from-cyan-500/5",
		text: "text-cyan-600 dark:text-cyan-400",
		icon: "text-cyan-500/30 group-hover:text-cyan-500/50",
		border: "border-cyan-500/20",
		progress: "bg-cyan-500",
	},
	emerald: {
		bg: "from-emerald-500/5",
		text: "text-emerald-600 dark:text-emerald-400",
		icon: "text-emerald-500/30 group-hover:text-emerald-500/50",
		border: "border-emerald-500/20",
		progress: "bg-emerald-500",
	},
};

export const EvolutionStats = memo(
	({ stats, compact = false, vertical = false }: EvolutionStatsProps) => {
		// Layout vertical para o card de resumo lateral, mantendo o visual padrão
		if (vertical) {
			return (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{STAT_CONFIG.map((config, idx) => {
						const colors = COLOR_CLASSES[config.color];
						const rawValue = config.getVal(stats);
						const isPercent =
							typeof rawValue === "string" && rawValue.includes("%");
						const numValue = isPercent
							? parseInt(rawValue)
							: typeof rawValue === "number"
								? rawValue
								: 0;

						return (
							<div
								key={idx}
								className={`group relative overflow-hidden rounded-xl border ${colors.border} bg-card/40 backdrop-blur-sm p-2 hover:bg-card/60 transition-all shadow-sm`}
							>
								<div className="flex items-center gap-1.5 mb-1">
									<div
										className={`p-1 rounded-md bg-gradient-to-br ${colors.bg}`}
									>
										<config.icon className={`h-3 w-3 ${colors.text}`} />
									</div>
									<span className="text-xs font-semibold text-muted-foreground/90 uppercase tracking-tight">
										{config.label}
									</span>
								</div>
								<p
									className={`text-lg font-black leading-tight ${colors.text}`}
								>
									{rawValue}
								</p>
								{isPercent && (
									<div className="mt-1.5 h-1.5 w-full bg-muted/50 rounded-full overflow-hidden border border-border/5">
										<div
											className={`h-full ${colors.progress} rounded-full transition-all duration-500`}
											style={{
												width: `${Math.min(100, Math.max(0, numValue))}%`,
											}}
										/>
									</div>
								)}
							</div>
						);
					})}
				</div>
			);
		}

		// Layout compacto (grid pequeno)
		return (
			<div
				className={
					compact
						? "grid grid-cols-2 gap-3"
						: "grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4"
				}
			>
				{STAT_CONFIG.map((config, idx) => {
					const colors = COLOR_CLASSES[config.color];
					return (
						<div
							key={idx}
							className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 sm:p-5 hover:bg-card/90 hover:shadow-lg transition-all cursor-default"
						>
							<div
								className={`absolute inset-0 bg-gradient-to-br ${colors.bg} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}
							/>
							<div className="relative flex items-center justify-between gap-3">
								<div className="min-w-0 flex-1">
									<p className="text-sm uppercase tracking-widest text-muted-foreground font-bold truncate opacity-80">
										{config.label}
									</p>
									<p
										className={`text-xl sm:text-2xl font-black ${colors.text} mt-1.5 truncate tracking-tight`}
									>
										{config.getVal(stats)}
									</p>
								</div>
								<config.icon
									className={`h-6 w-6 sm:h-7 sm:w-7 ${colors.icon} transition-transform group-hover:scale-110 flex-shrink-0`}
								/>
							</div>
						</div>
					);
				})}
			</div>
		);
	},
);

EvolutionStats.displayName = "EvolutionStats";
