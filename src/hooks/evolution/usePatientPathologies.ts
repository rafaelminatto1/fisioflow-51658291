import { useQuery } from "@tanstack/react-query";
import { patientsApi } from "@/api/v2";
import { Pathology } from "@/types/evolution";

const mapPathologyStatus = (value?: string | null): Pathology["status"] => {
  if (!value) return "cronica";
  if (value === "active") return "em_tratamento";
  if (value === "treated") return "tratada";
  if (value === "monitoring") return "cronica";
  return "cronica";
};

/**
 * usePatientPathologies - Gerencia as patologias/diagnósticos do paciente
 */
export const usePatientPathologies = (patientId: string) => {
  return useQuery({
    queryKey: ["patient-pathologies", patientId],
    queryFn: async () => {
      const res = await patientsApi.pathologies(patientId);
      return (res?.data ?? []).map((row) => ({
        id: row.id,
        patient_id: patientId,
        pathology_name: row.name,
        cid_code: row.icd_code ?? undefined,
        diagnosis_date: row.diagnosed_at ?? undefined,
        severity: undefined,
        affected_region: undefined,
        status: mapPathologyStatus(row.status),
        notes: row.notes ?? undefined,
        created_at: row.created_at,
        updated_at: row.created_at,
      })) as Pathology[];
    },
    enabled: !!patientId,
    staleTime: 1000 * 60 * 20, // 20 minutos
    gcTime: 1000 * 60 * 45, // 45 minutos
  });
};
