import type { QueryClient } from "@tanstack/react-query";
import { evolutionApi, goalsApi, patientsApi, sessionsApi } from "@/api/v2";
import { soapKeys } from "@/hooks/useSoapRecords";
import { normalizeGoalRows } from "@/lib/clinical/goalNormalization";

export async function prefetchPatientGoals(
  queryClient: QueryClient,
  patientId: string,
  staleTime: number,
) {
  return queryClient.prefetchQuery({
    queryKey: ["patient-goals", patientId],
    staleTime,
    queryFn: async () => {
      const response = await goalsApi.list(patientId);
      return normalizeGoalRows(response.data);
    },
  });
}

export async function prefetchPatientPathologies(
  queryClient: QueryClient,
  patientId: string,
  staleTime: number,
) {
  return queryClient.prefetchQuery({
    queryKey: ["patient-pathologies", patientId],
    staleTime,
    queryFn: async () => {
      const response = await patientsApi.pathologies(patientId);
      return response.data ?? [];
    },
  });
}

export async function prefetchEvolutionMeasurements(
  queryClient: QueryClient,
  patientId: string,
  resultLimit: number,
  staleTime: number,
) {
  return queryClient.prefetchQuery({
    queryKey: ["evolution-measurements", patientId, resultLimit],
    staleTime,
    queryFn: async () => {
      const response = await evolutionApi.measurements.list(patientId, {
        limit: resultLimit,
      });
      return response.data ?? [];
    },
  });
}

export async function prefetchRequiredMeasurements(
  queryClient: QueryClient,
  pathologyNames: string[],
  staleTime: number,
) {
  const uniquePathologies = Array.from(new Set(pathologyNames.filter(Boolean)));
  if (uniquePathologies.length === 0) return;

  return queryClient.prefetchQuery({
    queryKey: ["required-measurements", uniquePathologies],
    staleTime,
    queryFn: async () => {
      const response = await evolutionApi.requiredMeasurements.list(uniquePathologies);
      return response.data ?? [];
    },
  });
}

export async function prefetchPatientSurgeries(
  queryClient: QueryClient,
  patientId: string,
  staleTime: number,
) {
  return queryClient.prefetchQuery({
    queryKey: ["patient-surgeries", patientId],
    staleTime,
    queryFn: async () => {
      const response = await patientsApi.surgeries(patientId);
      return response.data ?? [];
    },
  });
}

export async function prefetchPatientMedicalReturns(
  queryClient: QueryClient,
  patientId: string,
  staleTime: number,
) {
  return queryClient.prefetchQuery({
    queryKey: ["patient-medical-returns", patientId],
    staleTime,
    queryFn: async () => {
      const response = await patientsApi.medicalReturns(patientId);
      return response.data ?? [];
    },
  });
}

export async function prefetchSoapRecords(
  queryClient: QueryClient,
  patientId: string,
  resultLimit: number,
  staleTime: number,
) {
  return queryClient.prefetchQuery({
    queryKey: soapKeys.list(patientId, { limit: resultLimit }),
    staleTime,
    queryFn: async () => {
      const response = await sessionsApi.list({
        patientId,
        limit: resultLimit,
      });
      return response.data ?? [];
    },
  });
}
