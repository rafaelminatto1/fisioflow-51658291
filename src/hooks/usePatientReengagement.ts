import { useQuery } from "@tanstack/react-query";
import { patientsApi, type PatientRow } from "@/api/v2";
import { differenceInDays, parseISO } from "date-fns";

/**
 * Hook para identificar pacientes inativos que precisam de reengajamento
 */
export function usePatientReengagement() {
	const { data: inactivePatients = [], isLoading } = useQuery({
		queryKey: ["inactive-patients-reengagement"],
		queryFn: async () => {
			const res = await patientsApi.list({ status: "ativo", limit: 1000 });
			const patients = (res?.data ?? []) as PatientRow[];
			const today = new Date();

			return patients
				.filter((p) => {
					if (!p.last_visit_date) return false;
					const lastVisit = parseISO(p.last_visit_date);
					const daysSinceLastVisit = differenceInDays(today, lastVisit);

					// Critério: mais de 60 dias sem visita
					return daysSinceLastVisit >= 60;
				})
				.map((p) => ({
					id: p.id,
					name: p.name || p.full_name,
					phone: p.phone,
					daysInactive: differenceInDays(today, parseISO(p.last_visit_date!)),
					lastVisit: p.last_visit_date,
				}))
				.sort((a, b) => b.daysInactive - a.daysInactive);
		},
	});

	return {
		inactivePatients,
		isLoading,
		totalToReengage: inactivePatients.length,
	};
}
