import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import {
	patientsApi,
	appointmentsApi,
	type PatientRow,
	type AppointmentRow,
} from "@/lib/api/workers-client";
import {
	ResponsiveContainer,
	Tooltip,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	PieChart,
	Pie,
	Cell,
} from "recharts";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFiltersContext";

const COLORS = [
	"hsl(var(--primary))",
	"hsl(var(--secondary))",
	"hsl(var(--accent))",
	"hsl(var(--muted))",
];

const getPatientAge = (birthDate?: string) => {
	if (!birthDate) return null;
	const date = new Date(birthDate);
	if (Number.isNaN(date.getTime())) return null;
	return new Date().getFullYear() - date.getFullYear();
};

const listAllPatients = async () => {
	const all: PatientRow[] = [];
	let offset = 0;
	const limit = 1000;

	while (offset < 10000) {
		const response = await patientsApi.list({
			limit,
			offset,
			sortBy: "name_asc",
		});
		const chunk = response?.data ?? [];
		all.push(...chunk);
		if (chunk.length < limit) break;
		offset += limit;
	}

	return all;
};

const listAppointments = async (therapistId?: string) => {
	const items: AppointmentRow[] = [];
	let offset = 0;
	const limit = 1000;

	while (offset < 10000) {
		const response = await appointmentsApi.list({
			limit,
			offset,
			therapistId: therapistId === "all" ? undefined : therapistId,
		});
		const chunk = response?.data ?? [];
		items.push(...chunk);
		if (chunk.length < limit) break;
		offset += limit;
	}

	return items;
};

export function PatientAnalytics() {
	const { filters } = useAnalyticsFilters();
	const { professionalId } = filters;

	const { data: statusData, isLoading: loadingStatus } = useQuery({
		queryKey: ["patient-status-analytics", professionalId],
		queryFn: async () => {
			const [allPatients, therapistAppointments] = await Promise.all([
				listAllPatients(),
				professionalId !== "all"
					? listAppointments(professionalId)
					: Promise.resolve(null),
			]);

			let activeCount = 0;
			let inactiveCount = 0;

			if (professionalId === "all") {
				activeCount = allPatients.filter(
					(patient) => patient.status === "ativo" || patient.is_active === true,
				).length;
				inactiveCount = allPatients.length - activeCount;
			} else {
				const patientIdsForTherapist = new Set(
					therapistAppointments?.map((a) => a.patient_id).filter(Boolean),
				);
				const patientsForTherapist = allPatients.filter((p) =>
					patientIdsForTherapist.has(p.id),
				);
				activeCount = patientsForTherapist.filter(
					(patient) => patient.status === "ativo" || patient.is_active === true,
				).length;
				inactiveCount = patientsForTherapist.length - activeCount;
			}

			return [
				{ name: "Ativos", value: activeCount },
				{ name: "Inativos", value: inactiveCount },
			];
		},
	});

	const { data: ageData, isLoading: loadingAge } = useQuery({
		queryKey: ["patient-age-analytics", professionalId],
		queryFn: async () => {
			const [allPatients, therapistAppointments] = await Promise.all([
				listAllPatients(),
				professionalId !== "all"
					? listAppointments(professionalId)
					: Promise.resolve(null),
			]);

			let patientsToAnalyze = allPatients;
			if (professionalId !== "all") {
				const patientIdsForTherapist = new Set(
					therapistAppointments?.map((a) => a.patient_id).filter(Boolean),
				);
				patientsToAnalyze = allPatients.filter((p) =>
					patientIdsForTherapist.has(p.id),
				);
			}

			const ageRanges = {
				"0-17": 0,
				"18-30": 0,
				"31-50": 0,
				"51-70": 0,
				"70+": 0,
			};

			patientsToAnalyze.forEach((patient) => {
				const age = getPatientAge(patient.birth_date);
				if (age == null) return;
				if (age < 18) ageRanges["0-17"] += 1;
				else if (age <= 30) ageRanges["18-30"] += 1;
				else if (age <= 50) ageRanges["31-50"] += 1;
				else if (age <= 70) ageRanges["51-70"] += 1;
				else ageRanges["70+"] += 1;
			});

			return Object.entries(ageRanges).map(([faixa, total]) => ({
				faixa,
				total,
			}));
		},
	});

	return (
		<div className="space-y-4">
			<div className="grid gap-4 md:grid-cols-2">
				<Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
					<CardHeader>
						<CardTitle>Distribuição por Status</CardTitle>
						<CardDescription>
							{professionalId === "all"
								? "Status de todos os pacientes"
								: "Status dos pacientes do profissional"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-[300px] w-full">
							{loadingStatus ? (
								<div className="flex items-center justify-center h-full text-muted-foreground">
									Carregando...
								</div>
							) : (
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={statusData}
											cx="50%"
											cy="50%"
											innerRadius={60}
											outerRadius={100}
											paddingAngle={5}
											dataKey="value"
										>
											{statusData?.map((_, index) => (
												<Cell
													key={`cell-${index}`}
													fill={COLORS[index % COLORS.length]}
												/>
											))}
										</Pie>
										<Tooltip
											contentStyle={{
												borderRadius: "12px",
												border: "none",
												boxShadow: "0 4px 12px -2px rgba(0,0,0,0.05)",
											}}
										/>
									</PieChart>
								</ResponsiveContainer>
							)}
						</div>
						<div className="flex justify-center gap-4 mt-4">
							{statusData?.map((entry, index) => (
								<div key={entry.name} className="flex items-center gap-2">
									<div
										className="w-3 h-3 rounded-full"
										style={{ backgroundColor: COLORS[index % COLORS.length] }}
									/>
									<span className="text-sm font-medium text-muted-foreground">
										{entry.name}
									</span>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
					<CardHeader>
						<CardTitle>Distribuição por Faixa Etária</CardTitle>
						<CardDescription>
							Perfil de idade dos pacientes analisados
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-[300px] w-full">
							{loadingAge ? (
								<div className="flex items-center justify-center h-full text-muted-foreground">
									Carregando...
								</div>
							) : (
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={ageData}>
										<CartesianGrid
											strokeDasharray="3 3"
											vertical={false}
											stroke="#E2E8F0"
										/>
										<XAxis
											dataKey="faixa"
											axisLine={false}
											tickLine={false}
											tick={{ fill: "#64748B", fontSize: 12 }}
											dy={10}
										/>
										<YAxis
											axisLine={false}
											tickLine={false}
											tick={{ fill: "#64748B", fontSize: 12 }}
										/>
										<Tooltip
											cursor={{ fill: "rgba(var(--primary-rgb), 0.05)" }}
											contentStyle={{
												borderRadius: "12px",
												border: "none",
												boxShadow: "0 4px 12px -2px rgba(0,0,0,0.05)",
											}}
										/>
										<Bar
											dataKey="total"
											fill="hsl(var(--primary))"
											radius={[4, 4, 0, 0]}
											barSize={40}
										/>
									</BarChart>
								</ResponsiveContainer>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
