/**
 * Hook for managing patient financial records
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import {
  getPatientFinancialRecords,
  getPatientFinancialSummary,
  getAllFinancialRecords,
  createFinancialRecord,
  updateFinancialRecord,
  deleteFinancialRecord,
  markFinancialRecordAsPaid,
  ApiFinancialRecord,
  ApiFinancialSummary,
} from '@/lib/api';

export function usePatientFinancialRecords(patientId: string, options?: { status?: string }) {
  return useQuery({
    queryKey: ['patientFinancialRecords', patientId, options?.status],
    queryFn: () => getPatientFinancialRecords(patientId, options),
    enabled: !!patientId,
  }) as UseQueryResult<ApiFinancialRecord[], Error>;
}

export function usePatientFinancialSummary(patientId: string) {
  return useQuery({
    queryKey: ['patientFinancialSummary', patientId],
    queryFn: () => getPatientFinancialSummary(patientId),
    enabled: !!patientId,
  }) as UseQueryResult<ApiFinancialSummary | null, Error>;
}

export function useAllFinancialRecords(options?: { startDate?: string, endDate?: string }) {
    return useQuery({
        queryKey: ['allFinancialRecords', options],
        queryFn: () => getAllFinancialRecords(options),
    }) as UseQueryResult<(ApiFinancialRecord & { patient_name: string })[], Error>;
}

export function useCreateFinancialRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof createFinancialRecord>[0]) => createFinancialRecord(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patientFinancialRecords', variables.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['patientFinancialSummary', variables.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['allFinancialRecords'] });
    },
  });
}

export function useUpdateFinancialRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, data }: { recordId: string; data: Partial<ApiFinancialRecord> }) =>
      updateFinancialRecord(recordId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientFinancialRecords'] });
      queryClient.invalidateQueries({ queryKey: ['patientFinancialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['allFinancialRecords'] });
    },
  });
}

export function useDeleteFinancialRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordId: string) => deleteFinancialRecord(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientFinancialRecords'] });
      queryClient.invalidateQueries({ queryKey: ['patientFinancialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['allFinancialRecords'] });
    },
  });
}

export function useMarkAsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, paymentMethod, paidDate }: {
      recordId: string;
      paymentMethod: string;
      paidDate?: string;
    }) => markFinancialRecordAsPaid(recordId, paymentMethod, paidDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientFinancialRecords'] });
      queryClient.invalidateQueries({ queryKey: ['patientFinancialSummary'] });
      queryClient.invalidateQueries({ queryKey: ['allFinancialRecords'] });
    },
  });
}
