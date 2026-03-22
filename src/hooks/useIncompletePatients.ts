/**
 * useIncompletePatients - Migrated to Neon/Workers
 *
 */

import { useQuery } from "@tanstack/react-query";
import { patientsApi } from "@/api/v2";

interface IncompletePatient {
	id: string;
	name: string;
	phone?: string | null;
}

export const useIncompletePatients = () => {
	const { data, isLoading, error } = useQuery<
		IncompletePatient[],
		Error | null
	>({
		queryKey: ["incomplete-patients"],
		queryFn: async () => {
			const response = await patientsApi.list({
				incompleteRegistration: true,
				sortBy: "created_at_desc",
				limit: 100,
			});
			const patients = response?.data ?? [];
			return patients.map((patient) => ({
				id: patient.id,
				name: patient.full_name ?? patient.name ?? "Paciente sem nome",
				phone: patient.phone ?? null,
			}));
		},
		staleTime: 1000 * 60 * 2,
		refetchInterval: 1000 * 60,
	});

	return {
		data: data ?? [],
		isLoading,
		error: error ? error.message : null,
		count: data?.length ?? 0,
	};
};
