/**
 * Adaptador legado para manter a API do antigo Data Connect.
 */

import { useQuery } from "@tanstack/react-query";
import { patientsApi, clinicalApi } from "@/lib/api/workers-client";

const isUUID = (id: string | undefined): id is string =>
	!!id &&
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const usePatientsPostgres = (organizationId: string | undefined) => {
	return useQuery({
		queryKey: ["patients-postgres", organizationId],
		queryFn: async () => {
			if (!isUUID(organizationId)) return [];
			const result = await patientsApi.list({ limit: 500 });
			return result.data ?? [];
		},
		enabled: isUUID(organizationId),
	});
};

export const usePatientExercisesPostgres = (patientId: string | undefined) => {
	return useQuery({
		queryKey: ["patient-exercises-postgres", patientId],
		queryFn: async () => {
			if (!isUUID(patientId)) return [];
			const result = await clinicalApi.prescribedExercises.list({
				patientId,
				active: true,
			});
			return result.data ?? [];
		},
		enabled: isUUID(patientId),
	});
};

export const usePatientPostgres = (patientId: string | undefined) => {
	return useQuery({
		queryKey: ["patient-postgres", patientId],
		queryFn: async () => {
			if (!isUUID(patientId)) return null;
			const result = await patientsApi.get(patientId);
			return result.data ?? null;
		},
		enabled: isUUID(patientId),
	});
};
