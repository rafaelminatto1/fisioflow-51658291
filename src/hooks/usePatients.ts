import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PatientService } from '@/lib/services/PatientService';
import type { 
  PatientSearchResult, 
  PatientFinancialData, 
  PatientAppointmentSummary,
  CreatePatientData,
  UpdatePatientData 
} from '@/lib/services/PatientService';
import type { Patient } from '@/types/agenda';

// Query keys for React Query
export const patientKeys = {
  all: ['patients'] as const,
  search: (query: string) => [...patientKeys.all, 'search', query] as const,
  active: () => [...patientKeys.all, 'active'] as const,
  byId: (id: string) => [...patientKeys.all, 'byId', id] as const,
  financial: (id: string) => [...patientKeys.all, 'financial', id] as const,
  summary: (id: string) => [...patientKeys.all, 'summary', id] as const,
  stats: () => [...patientKeys.all, 'stats'] as const,
  byTherapist: (therapistId: string) => [...patientKeys.all, 'byTherapist', therapistId] as const,
  pendingPayments: () => [...patientKeys.all, 'pendingPayments'] as const,
};

/**
 * Hook for searching patients
 */
export function usePatientSearch(query: string, options?: {
  limit?: number;
  activeOnly?: boolean;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: patientKeys.search(query),
    queryFn: () => PatientService.searchPatients(
      query, 
      options?.limit, 
      options?.activeOnly
    ),
    enabled: (options?.enabled ?? true) && query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for getting active patients
 */
export function useActivePatients() {
  return useQuery({
    queryKey: patientKeys.active(),
    queryFn: () => PatientService.getActivePatients(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for getting a single patient
 */
export function usePatient(patientId: string | undefined) {
  return useQuery({
    queryKey: patientKeys.byId(patientId || ''),
    queryFn: () => PatientService.getPatient(patientId!),
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for getting patient financial data
 */
export function usePatientFinancialData(patientId: string | undefined) {
  return useQuery({
    queryKey: patientKeys.financial(patientId || ''),
    queryFn: () => PatientService.getPatientFinancialData(patientId!),
    enabled: !!patientId,
    staleTime: 2 * 60 * 1000, // 2 minutes (financial data changes more frequently)
  });
}

/**
 * Hook for getting patient appointment summary
 */
export function usePatientAppointmentSummary(patientId: string | undefined) {
  return useQuery({
    queryKey: patientKeys.summary(patientId || ''),
    queryFn: () => PatientService.getPatientAppointmentSummary(patientId!),
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for getting patient statistics
 */
export function usePatientStats() {
  return useQuery({
    queryKey: patientKeys.stats(),
    queryFn: () => PatientService.getPatientStats(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Hook for getting patients by therapist
 */
export function usePatientsByTherapist(therapistId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: patientKeys.byTherapist(therapistId || ''),
    queryFn: () => PatientService.getPatientsByTherapist(therapistId!, limit),
    enabled: !!therapistId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for getting patients with pending payments
 */
export function usePatientsWithPendingPayments() {
  return useQuery({
    queryKey: patientKeys.pendingPayments(),
    queryFn: () => PatientService.getPatientsWithPendingPayments(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for creating a new patient
 */
export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePatientData) => PatientService.createPatient(data),
    onSuccess: (newPatient) => {
      // Invalidate and refetch patient lists
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
      
      // Add the new patient to the cache
      queryClient.setQueryData(patientKeys.byId(newPatient.id), newPatient);
    },
  });
}

/**
 * Hook for updating a patient
 */
export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, updates }: { patientId: string; updates: UpdatePatientData }) =>
      PatientService.updatePatient(patientId, updates),
    onSuccess: (updatedPatient, { patientId }) => {
      // Update the patient in cache
      queryClient.setQueryData(patientKeys.byId(patientId), updatedPatient);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
      queryClient.invalidateQueries({ queryKey: patientKeys.financial(patientId) });
      queryClient.invalidateQueries({ queryKey: patientKeys.summary(patientId) });
    },
  });
}

/**
 * Hook for updating patient sessions
 */
export function useUpdatePatientSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, sessionsUsed }: { patientId: string; sessionsUsed: number }) =>
      PatientService.updatePatientSessions(patientId, sessionsUsed),
    onSuccess: (updatedPatient, { patientId }) => {
      // Update the patient in cache
      queryClient.setQueryData(patientKeys.byId(patientId), updatedPatient);
      
      // Invalidate financial data and stats
      queryClient.invalidateQueries({ queryKey: patientKeys.financial(patientId) });
      queryClient.invalidateQueries({ queryKey: patientKeys.stats() });
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },
  });
}

/**
 * Hook for adding sessions to a patient
 */
export function useAddSessionsToPatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, sessionsToAdd }: { patientId: string; sessionsToAdd: number }) =>
      PatientService.addSessionsToPatient(patientId, sessionsToAdd),
    onSuccess: (updatedPatient, { patientId }) => {
      // Update the patient in cache
      queryClient.setQueryData(patientKeys.byId(patientId), updatedPatient);
      
      // Invalidate financial data and stats
      queryClient.invalidateQueries({ queryKey: patientKeys.financial(patientId) });
      queryClient.invalidateQueries({ queryKey: patientKeys.stats() });
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },
  });
}

/**
 * Hook for deactivating a patient
 */
export function useDeactivatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patientId: string) => PatientService.deactivatePatient(patientId),
    onSuccess: (updatedPatient, patientId) => {
      // Update the patient in cache
      queryClient.setQueryData(patientKeys.byId(patientId), updatedPatient);
      
      // Invalidate patient lists and stats
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
      queryClient.invalidateQueries({ queryKey: patientKeys.stats() });
    },
  });
}

/**
 * Hook for reactivating a patient
 */
export function useReactivatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patientId: string) => PatientService.reactivatePatient(patientId),
    onSuccess: (updatedPatient, patientId) => {
      // Update the patient in cache
      queryClient.setQueryData(patientKeys.byId(patientId), updatedPatient);
      
      // Invalidate patient lists and stats
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
      queryClient.invalidateQueries({ queryKey: patientKeys.stats() });
    },
  });
}

/**
 * Utility hook for invalidating all patient queries
 */
export function useInvalidatePatients() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: patientKeys.all });
  };
}