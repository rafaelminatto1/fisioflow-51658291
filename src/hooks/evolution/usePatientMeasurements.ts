import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { evolutionApi } from "@/api/v2";
import { useMemo } from "react";

export interface PathologyRequiredMeasurement {
  id: string;
  pathology_name: string;
  measurement_name: string;
  measurement_unit?: string;
  alert_level: "high" | "medium" | "low";
  instructions?: string;
}

export interface EvolutionMeasurement {
  id: string;
  soap_record_id?: string;
  patient_id: string;
  measurement_type: string;
  measurement_name: string;
  value: number;
  unit?: string;
  notes?: string;
  custom_data?: Record<string, unknown>;
  measured_at: string;
  created_by: string;
  created_at: string;
}

export interface UseEvolutionMeasurementsOptions {
  limit?: number;
  enabled?: boolean;
}

/**
 * useRequiredMeasurements - Medições obrigatórias baseadas nas patologias
 */
export const useRequiredMeasurements = (pathologyNames: string[]) => {
  const uniquePathologies = useMemo(
    () => Array.from(new Set(pathologyNames.filter(Boolean))),
    [pathologyNames],
  );

  return useQuery({
    queryKey: ["required-measurements", uniquePathologies],
    queryFn: async () => {
      if (uniquePathologies.length === 0) return [];
      const res = await evolutionApi.requiredMeasurements.list(uniquePathologies);
      return (res?.data ?? []) as PathologyRequiredMeasurement[];
    },
    enabled: uniquePathologies.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutos
    gcTime: 1000 * 60 * 60, // 1 hora
  });
};

/**
 * useEvolutionMeasurements - Histórico de medições do paciente
 */
export const useEvolutionMeasurements = (
  patientId: string,
  options: UseEvolutionMeasurementsOptions = {},
) => {
  const { limit: resultsLimit, enabled = true } = options;

  return useQuery({
    queryKey: ["evolution-measurements", patientId, resultsLimit ?? "all"],
    queryFn: async () => {
      const res = await evolutionApi.measurements.list(
        patientId,
        resultsLimit ? { limit: resultsLimit } : undefined,
      );
      const data = res?.data ?? [];
      return data.map((row) => ({
        id: row.id,
        soap_record_id: row.soap_record_id ?? undefined,
        patient_id: row.patient_id,
        measurement_type: row.measurement_type,
        measurement_name: row.measurement_name,
        value: Number(row.value ?? 0),
        unit: row.unit ?? undefined,
        notes: row.notes ?? undefined,
        custom_data: row.custom_data ?? undefined,
        measured_at: row.measured_at,
        created_by: row.created_by,
        created_at: row.created_at,
      })) as EvolutionMeasurement[];
    },
    enabled: !!patientId && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 15, // 15 minutos
  });
};

/**
 * useCreateMeasurement - Registra uma nova medição
 */
export const useCreateMeasurement = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (measurement: Omit<EvolutionMeasurement, "id" | "created_at">) => {
      const res = await evolutionApi.measurements.create({
        patient_id: measurement.patient_id,
        measurement_type: measurement.measurement_type,
        measurement_name: measurement.measurement_name,
        value: measurement.value,
        unit: measurement.unit,
        notes: measurement.notes,
        custom_data: measurement.custom_data,
        measured_at: measurement.measured_at,
      });
      const data = res?.data;
      if (!data) throw new Error("Falha ao registrar medição");
      return {
        id: data.id,
        soap_record_id: measurement.soap_record_id,
        patient_id: data.patient_id,
        measurement_type: data.measurement_type,
        measurement_name: data.measurement_name,
        value: Number(data.value ?? 0),
        unit: data.unit ?? undefined,
        notes: data.notes ?? undefined,
        custom_data: data.custom_data ?? undefined,
        measured_at: data.measured_at,
        created_by: data.created_by,
        created_at: data.created_at,
      } as EvolutionMeasurement;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["evolution-measurements", (data as EvolutionMeasurement).patient_id],
      });
      toast({
        title: "Medição registrada",
        description: "A medição foi registrada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao registrar medição",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
