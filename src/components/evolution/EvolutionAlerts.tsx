import React, { memo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertTriangle,
	Timer,
	CalendarX,
	HeartPulse,
	TrendingUp,
	Clock,
	FileText,
} from "lucide-react";

interface Goal {
	id: string;
	title: string;
	target_date: string;
	status: string;
}

interface Pathology {
	id: string;
	name: string;
	code?: string;
}

interface EvolutionAlertsProps {
	overdueGoals: Goal[];
	painScale: { level: number; location?: string; character?: string };
	painTrend: "worsening" | "improving" | "stable" | "fluctuating" | null;
	upcomingGoals: Goal[];
	daysSinceLastEvolution: number | null;
	sessionDurationMinutes: number;
	sessionLongAlertShown: boolean;
	activePathologies: Pathology[];
	previousEvolutionsCount: number;
	onTabChange: (tab: string) => void;
}

export const EvolutionAlerts: React.FC<EvolutionAlertsProps> = memo(
	({
		overdueGoals,
		painScale,
		painTrend,
		upcomingGoals,
		daysSinceLastEvolution,
		sessionDurationMinutes,
		sessionLongAlertShown,
		activePathologies,
		previousEvolutionsCount,
		onTabChange,
	}) => {
		const criticalAlerts: React.ReactNode[] = [];
		const warningAlerts: React.ReactNode[] = [];
		const infoAlerts: React.ReactNode[] = [];
		const successAlerts: React.ReactNode[] = [];

		// CRÍTICOS
		if (overdueGoals.length > 0) {
			criticalAlerts.push(
				<Alert
					key="overdue"
					className="border-none bg-red-50/50 text-red-700 shadow-sm rounded-xl py-3"
					role="alert"
				>
					<CalendarX className="h-4 w-4 text-red-500" aria-hidden />
					<div className="flex flex-col gap-0.5">
						<AlertTitle className="text-xs font-bold uppercase tracking-wider">
							Metas Vencidas
						</AlertTitle>
						<AlertDescription className="text-xs font-medium leading-relaxed">
							{overdueGoals.length} meta(s) vencida(s).{" "}
							<button
								type="button"
								onClick={() => onTabChange("tratamento")}
								className="underline font-bold hover:text-red-900"
							>
								Ajustar datas →
							</button>
						</AlertDescription>
					</div>
				</Alert>,
			);
		}
		if (painScale.level >= 7) {
			criticalAlerts.push(
				<Alert
					key="pain-high"
					className="border-none bg-rose-50/50 text-rose-700 shadow-sm rounded-xl py-3"
					role="alert"
				>
					<AlertTriangle className="h-4 w-4 text-rose-500" aria-hidden />
					<div className="flex flex-col gap-0.5">
						<AlertTitle className="text-xs font-bold uppercase tracking-wider">
							Dor Elevada: {painScale.level}/10
						</AlertTitle>
						<AlertDescription className="text-xs font-medium leading-relaxed">
							{painTrend === "worsening" && "Tendência de PIORA. "}
							{painTrend === "improving" && "Tendência de MELHORA. "}
							Considere revisar o plano de tratamento.
						</AlertDescription>
					</div>
				</Alert>,
			);
		}
		if (daysSinceLastEvolution !== null && daysSinceLastEvolution > 21) {
			criticalAlerts.push(
				<Alert
					key="long-period"
					className="border-none bg-orange-50/50 text-orange-700 shadow-sm rounded-xl py-3"
					role="alert"
				>
					<FileText className="h-4 w-4 text-orange-500" aria-hidden />
					<div className="flex flex-col gap-0.5">
						<AlertTitle className="text-xs font-bold uppercase tracking-wider">
							Longo Intervalo
						</AlertTitle>
						<AlertDescription className="text-xs font-medium leading-relaxed">
							Última evolução há {daysSinceLastEvolution} dias.{" "}
							<button
								type="button"
								onClick={() => onTabChange("historico")}
								className="underline font-bold hover:text-orange-900"
							>
								Revisar histórico →
							</button>
						</AlertDescription>
					</div>
				</Alert>,
			);
		}

		// AVISOS
		if (upcomingGoals.length > 0) {
			warningAlerts.push(
				<Alert
					key="upcoming"
					className="border-none bg-amber-50/50 text-amber-700 shadow-sm rounded-xl py-3"
					role="alert"
				>
					<Clock className="h-4 w-4 text-amber-500" aria-hidden />
					<div className="flex flex-col gap-0.5">
						<AlertTitle className="text-xs font-bold uppercase tracking-wider">
							Metas Próximas
						</AlertTitle>
						<AlertDescription className="text-xs font-medium leading-relaxed">
							{upcomingGoals.length} meta(s) vencem em breve.{" "}
							<button
								type="button"
								onClick={() => onTabChange("tratamento")}
								className="underline font-bold hover:text-amber-900"
							>
								Acompanhar progresso →
							</button>
						</AlertDescription>
					</div>
				</Alert>,
			);
		}

		// INFORMATIVOS
		if (sessionDurationMinutes > 60 && !sessionLongAlertShown) {
			infoAlerts.push(
				<Alert
					key="session-long"
					className="border-none bg-blue-50/50 text-blue-700 shadow-sm rounded-xl py-3"
					role="alert"
				>
					<Timer className="h-4 w-4 text-blue-500" />
					<div className="flex flex-col gap-0.5">
						<AlertTitle className="text-xs font-bold uppercase tracking-wider">
							Duração da Sessão
						</AlertTitle>
						<AlertDescription className="text-xs font-medium leading-relaxed">
							Tempo: {Math.floor(sessionDurationMinutes / 60)}h {sessionDurationMinutes % 60}min.
						</AlertDescription>
					</div>
				</Alert>,
			);
		}
		if (activePathologies.length >= 3) {
			infoAlerts.push(
				<Alert
					key="complexity"
					className="border-none bg-slate-50 text-slate-700 shadow-sm rounded-xl py-3"
					role="alert"
				>
					<TrendingUp className="h-4 w-4 text-slate-500" />
					<div className="flex flex-col gap-0.5">
						<AlertTitle className="text-xs font-bold uppercase tracking-wider">
							Alta Complexidade
						</AlertTitle>
						<AlertDescription className="text-xs font-medium leading-relaxed">
							{activePathologies.length} patologias ativas. Planejamento cuidadoso sugerido.
						</AlertDescription>
					</div>
				</Alert>,
			);
		}

		// POSITIVOS
		if (
			painTrend === "improving" &&
			painScale.level < 4 &&
			previousEvolutionsCount >= 2
		) {
			successAlerts.push(
				<Alert
					key="progress"
					className="border-none bg-emerald-50/50 text-emerald-700 shadow-sm rounded-xl py-3"
					role="alert"
				>
					<HeartPulse className="h-4 w-4 text-emerald-500" />
					<div className="flex flex-col gap-0.5">
						<AlertTitle className="text-xs font-bold uppercase tracking-wider">
							Bom Progresso!
						</AlertTitle>
						<AlertDescription className="text-xs font-medium leading-relaxed">
							Paciente com tendência de melhora. Mantenha a conduta.
						</AlertDescription>
					</div>
				</Alert>,
			);
		}

		const allAlerts = [
			...criticalAlerts,
			...warningAlerts,
			...infoAlerts,
			...successAlerts,
		];
		if (allAlerts.length === 0) return null;

		return (
			<div
				className="flex flex-wrap gap-3"
				role="region"
				aria-label="Alertas da evolução"
			>
				{allAlerts.map((alert, idx) => (
					<div key={idx} className="flex-1 min-w-[280px]">
						{alert}
					</div>
				))}
			</div>
		);
	},
);

EvolutionAlerts.displayName = "EvolutionAlerts";
