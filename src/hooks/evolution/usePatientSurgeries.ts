import { useQuery } from "@tanstack/react-query";
import { patientsApi } from "@/api/v2";
import { Surgery } from "@/types/evolution";

/**
 * usePatientSurgeries - Gerencia o histórico de cirurgias do paciente
 */
export const usePatientSurgeries = (patientId: string) => {
  return useQuery({
    queryKey: ["patient-surgeries", patientId],
    queryFn: async () => {
      const res = await patientsApi.surgeries(patientId);
      return (res?.data ?? []).map((row) => ({
        id: row.id,
        patient_id: patientId,
        surgery_name: row.name,
        surgery_date: row.surgery_date ?? row.created_at,
        affected_side: row.affected_side || "nao_aplicavel",
        notes: row.notes ?? undefined,
        surgeon: row.surgeon_name ?? row.surgeon ?? undefined,
        hospital: row.hospital ?? undefined,
        surgery_type: row.surgery_type ?? row.post_op_protocol ?? undefined,
        complications: row.complications ?? undefined,
        created_at: row.created_at,
        updated_at: row.created_at,
      })) as Surgery[];
    },
    enabled: !!patientId,
    // Cache de longa duração pois cirurgias mudam pouco
    staleTime: 1000 * 60 * 15, // 15 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
  });
};
