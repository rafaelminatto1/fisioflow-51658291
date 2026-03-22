import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, TrendingUp } from "lucide-react";

interface ExercisePlan {
	id: string;
	name: string;
	status: string;
	patient_id: string;
	start_date?: string;
	end_date?: string;
}

interface HEPComplianceData {
	planId: string;
	planName: string;
	totalDays: number;
	completedDays: number;
	rate: number;
	byExercise: Record<
		string,
		{ completed: number; total: number; rate: number }
	>;
	last14Days: Array<{ date: string; completed: boolean }>;
}

function ComplianceBar({
	date,
	completed,
}: {
	date: string;
	completed: boolean;
}) {
	const label = new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
		weekday: "narrow",
		day: "numeric",
	});
	return (
		<div className="flex flex-col items-center gap-1">
			<div
				className={`w-5 rounded-sm ${completed ? "bg-green-500" : "bg-muted"}`}
				style={{ height: 24 }}
				title={`${date}: ${completed ? "Realizado" : "Não realizado"}`}
			/>
			<span className="text-[10px] text-muted-foreground">{label}</span>
		</div>
	);
}

function PlanComplianceCard({ planId }: { planId: string }) {
	const { data, isLoading } = useQuery<HEPComplianceData>({
		queryKey: ["hep-compliance", planId],
		queryFn: async () => {
			const res = await request<{ data: HEPComplianceData }>(
				`/api/exercise-plans/${planId}/compliance`,
			);
			return res.data;
		},
		staleTime: 5 * 60 * 1000,
	});

	if (isLoading) return <Skeleton className="h-32 w-full" />;
	if (!data) return null;

	const rateColor =
		data.rate >= 70
			? "text-green-600"
			: data.rate >= 40
				? "text-yellow-600"
				: "text-red-600";

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<CardTitle className="text-sm font-medium">{data.planName}</CardTitle>
					<Badge
						variant={
							data.rate >= 70
								? "default"
								: data.rate >= 40
									? "secondary"
									: "destructive"
						}
						className="shrink-0"
					>
						{data.rate}% adesão
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<Progress value={data.rate} className="h-2" />
				<p className="text-xs text-muted-foreground">
					{data.completedDays} de {data.totalDays} dias realizados
				</p>

				{/* Mini calendar dos últimos 14 dias */}
				<div className="flex gap-1 pt-1 overflow-x-auto pb-1">
					{data.last14Days.map((day) => (
						<ComplianceBar
							key={day.date}
							date={day.date}
							completed={day.completed}
						/>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

interface HEPComplianceDashboardProps {
	patientId: string;
}

export function HEPComplianceDashboard({
	patientId,
}: HEPComplianceDashboardProps) {
	const { data: plansData, isLoading } = useQuery<{ data: ExercisePlan[] }>({
		queryKey: ["exercise-plans", patientId],
		queryFn: () => request(`/api/exercise-plans?patientId=${patientId}`),
		enabled: Boolean(patientId),
		staleTime: 5 * 60 * 1000,
	});

	const activePlans = (plansData?.data ?? []).filter(
		(p) => p.status === "ativo",
	);

	if (isLoading) {
		return (
			<div className="space-y-3">
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-32 w-full" />
			</div>
		);
	}

	if (!activePlans.length) {
		return (
			<div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
				<TrendingUp className="h-8 w-8 mb-2 opacity-40" />
				<p className="text-sm">Nenhum plano de exercício ativo</p>
				<p className="text-xs">
					Crie um plano HEP para acompanhar a adesão do paciente.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2 text-sm font-medium">
				<TrendingUp className="h-4 w-4 text-primary" />
				<span>Adesão ao Plano Domiciliar (HEP)</span>
			</div>

			<div className="grid gap-3">
				{activePlans.map((plan) => (
					<PlanComplianceCard key={plan.id} planId={plan.id} />
				))}
			</div>

			<div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
				<span className="flex items-center gap-1">
					<CheckCircle2 className="h-3 w-3 text-green-500" /> Realizado
				</span>
				<span className="flex items-center gap-1">
					<XCircle className="h-3 w-3 text-muted-foreground/50" /> Não realizado
				</span>
			</div>
		</div>
	);
}
