import { useQuery } from "@tanstack/react-query";
import { getHEPCompliance, getPatientExercisePlans, type ApiHEPComplianceData } from "@/lib/api";

export type { ApiHEPComplianceData };

export function usePatientExercisePlans(patientId: string) {
  return useQuery({
    queryKey: ["exercise-plans", patientId],
    queryFn: () => getPatientExercisePlans(patientId),
    enabled: !!patientId,
  });
}

export function useHEPCompliance(planId: string | undefined) {
  return useQuery<ApiHEPComplianceData>({
    queryKey: ["hep-compliance", planId],
    queryFn: () => getHEPCompliance(planId!),
    enabled: Boolean(planId),
    staleTime: 5 * 60 * 1000,
  });
}
