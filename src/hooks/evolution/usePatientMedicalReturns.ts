import { useQuery } from "@tanstack/react-query";
import { patientsApi } from "@/api/v2";
import { MedicalReturn } from "@/types/evolution";

/**
 * usePatientMedicalReturns - Gerencia os retornos médicos do paciente
 */
export const usePatientMedicalReturns = (patientId: string) => {
  return useQuery({
    queryKey: ["patient-medical-returns", patientId],
    queryFn: async () => {
      const res = await patientsApi.medicalReturns(patientId);
      return (res?.data ?? []) as MedicalReturn[];
    },
    enabled: !!patientId,
    staleTime: 1000 * 60 * 10, // 10 minutos
    retry: false,
  });
};
