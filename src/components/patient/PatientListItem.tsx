import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PatientActions } from "@/components/patient/PatientActions";
import { usePrefetchPatientOnHover } from "@/hooks/performance";
import { useNavPreload } from "@/hooks/useIntelligentPreload";
import {
	PATIENT_CARE_PROFILE_LABELS,
	PATIENT_CLASSIFICATION_LABELS,
	PATIENT_FINANCIAL_STATUS_LABELS,
	PATIENT_ORIGIN_LABELS,
	PATIENT_PAYER_MODEL_LABELS,
	PATIENT_THERAPY_FOCUS_LABELS,
} from "@/lib/constants/patient-directory";
import { patientRoutes } from "@/lib/routing/appRoutes";
import { cn } from "@/lib/utils";
import { PatientHelpers } from "@/types";
import type { PatientRow } from "@/types/workers";
import {
	Activity,
	AlertTriangle,
	CalendarClock,
	HandCoins,
	HeartPulse,
	ShieldCheck,
	Sparkles,
	Stethoscope,
} from "lucide-react";

interface PatientListItemProps {
	patient: PatientRow;
	onClick: () => void;
}

function formatDate(value?: string | null) {
	if (!value) return "Sem agenda";
	return new Date(value).toLocaleDateString("pt-BR");
}

function createBadgeTone(type: "clinical" | "financial" | "operational" | "neutral") {
	switch (type) {
		case "clinical":
			return "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300";
		case "financial":
			return "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300";
		case "operational":
			return "border-blue-200/80 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300";
		default:
			return "border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200";
	}
}

export const PatientListItem = ({ patient, onClick }: PatientListItemProps) => {
	const { prefetch } = usePrefetchPatientOnHover(patient.id);
	const { preloadRoute } = useNavPreload();

	const handleMouseEnter = () => {
		prefetch();
		preloadRoute(patientRoutes.profile(patient.id));
	};

	const patientName = PatientHelpers.getName(patient) || "Sem nome";
	const initials = patientName
		.split(" ")
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

	const primaryPathology =
		patient.primaryPathology || patient.mainCondition || "Sem patologia definida";

	const badgeEntries = [
		...(patient.careProfiles ?? []).slice(0, 2).map((value) => ({
			label: PATIENT_CARE_PROFILE_LABELS[value] ?? value,
			type: "clinical" as const,
		})),
		...(patient.therapyFocuses ?? []).slice(0, 2).map((value) => ({
			label: PATIENT_THERAPY_FOCUS_LABELS[value] ?? value,
			type: "operational" as const,
		})),
		patient.recentSurgery
			? { label: "Cirurgia recente", type: "clinical" as const }
			: patient.hasSurgery
				? { label: "Com cirurgia", type: "clinical" as const }
				: null,
		patient.financialStatus
			? {
					label:
						PATIENT_FINANCIAL_STATUS_LABELS[patient.financialStatus] ??
						patient.financialStatus,
					type: "financial" as const,
				}
			: null,
		patient.classification
			? {
					label:
						PATIENT_CLASSIFICATION_LABELS[
							patient.classification as keyof typeof PATIENT_CLASSIFICATION_LABELS
						] ?? patient.classification,
					type: "neutral" as const,
				}
			: null,
	].filter(Boolean) as Array<{ label: string; type: "clinical" | "financial" | "operational" | "neutral" }>;

	return (
		<Card
			className="group h-full rounded-[2rem] border border-white/60 bg-white/85 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.55)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_32px_80px_-42px_rgba(79,70,229,0.35)] dark:border-slate-800/70 dark:bg-slate-950/75"
			onMouseEnter={handleMouseEnter}
			data-testid={`patient-card-${patient.id}`}
			data-patient-id={patient.id}
		>
			<div className="flex items-start justify-between gap-4">
				<button
					type="button"
					onClick={onClick}
					className="flex min-w-0 flex-1 items-start gap-4 text-left"
				>
					<div className="relative shrink-0">
						<Avatar className="h-14 w-14 rounded-[1.25rem] border border-white/70 shadow-sm dark:border-slate-800">
							<AvatarFallback className="rounded-[1.25rem] bg-primary/10 text-sm font-black text-primary">
								{initials}
							</AvatarFallback>
						</Avatar>
						<span
							className={cn(
								"absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-slate-950",
								patient.status === "Em Tratamento" ? "bg-emerald-500" : "bg-slate-300",
							)}
						/>
					</div>

					<div className="min-w-0 flex-1 space-y-3">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div className="min-w-0">
								<h3 className="truncate text-lg font-black tracking-tight text-slate-950 dark:text-white">
									{patientName}
								</h3>
								<p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
									<Stethoscope className="h-4 w-4 text-primary/70" />
									<span className="truncate">{primaryPathology}</span>
								</p>
							</div>
							<Badge className="rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
								{patient.status || "Inicial"}
							</Badge>
						</div>

						<div className="flex flex-wrap gap-2">
							{badgeEntries.slice(0, 5).map((badge) => (
								<Badge
									key={`${patient.id}-${badge.label}`}
									className={cn(
										"rounded-full border px-2.5 py-1 text-[10px] font-semibold",
										createBadgeTone(badge.type),
									)}
								>
									{badge.label}
								</Badge>
							))}
						</div>

						<div className="grid gap-3 text-[12px] text-slate-600 dark:text-slate-300 md:grid-cols-2">
							<div className="flex items-center gap-2">
								<Activity className="h-4 w-4 text-primary/70" />
								<span>
									{patient.sessionsCompleted ?? 0} sessões concluídas
								</span>
							</div>
							<div className="flex items-center gap-2">
								<CalendarClock className="h-4 w-4 text-primary/70" />
								<span>Próxima sessão: {formatDate(patient.nextAppointmentDate)}</span>
							</div>
							<div className="flex items-center gap-2">
								<HandCoins className="h-4 w-4 text-primary/70" />
								<span>
									{PATIENT_PAYER_MODEL_LABELS[patient.payerModel ?? ""] ??
										patient.payerModel ??
										"Sem modelo de pagamento"}
								</span>
							</div>
							<div className="flex items-center gap-2">
								<ShieldCheck className="h-4 w-4 text-primary/70" />
								<span>
									{PATIENT_ORIGIN_LABELS[patient.origin ?? ""] ??
										patient.origin ??
										"Origem não informada"}
								</span>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
							{patient.partnerCompanyName && (
								<span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-900">
									<Sparkles className="h-3.5 w-3.5" />
									{patient.partnerCompanyName}
								</span>
							)}
							{patient.noShowCount ? (
								<span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-red-700 dark:bg-red-950/30 dark:text-red-300">
									<AlertTriangle className="h-3.5 w-3.5" />
									{patient.noShowCount} falta(s)
								</span>
							) : null}
							{patient.openBalance && Number(patient.openBalance) > 0 ? (
								<span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
									<HeartPulse className="h-3.5 w-3.5" />
									Saldo R$ {Number(patient.openBalance).toFixed(2)}
								</span>
							) : null}
						</div>
					</div>
				</button>

				<PatientActions patient={patient} variant="speed-dial" />
			</div>
		</Card>
	);
};
