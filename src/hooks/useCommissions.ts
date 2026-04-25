import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { request } from "@/api/v2";

export interface CommissionSummaryRow {
  therapist_id: string;
  total_sessions: number;
  total_revenue: number;
  commission_rate: number;
  commission_amount: number;
  payout_status: "pendente" | "pago";
}

export interface CommissionConfig {
  id: string;
  therapist_id: string;
  commission_rate: number;
  effective_from: string;
  notes?: string;
}

export interface CommissionPayout {
  id: string;
  therapist_id: string;
  period_start: string;
  period_end: string;
  total_sessions: number;
  total_revenue: number;
  commission_rate: number;
  commission_amount: number;
  status: "pendente" | "pago";
  paid_at?: string;
  notes?: string;
}

export function useCommissionSummary(month: string) {
  return useQuery<{
    data: CommissionSummaryRow[];
    period: { start: string; end: string };
  }>({
    queryKey: ["commissions-summary", month],
    queryFn: () => request(`/api/commissions/summary?month=${month}`),
    enabled: Boolean(month),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCommissionConfig() {
  return useQuery<{ data: CommissionConfig[] }>({
    queryKey: ["commissions-config"],
    queryFn: () => request("/api/commissions/config"),
    staleTime: 10 * 60 * 1000,
  });
}

export function useTherapistPayouts(therapistId: string | undefined) {
  return useQuery<{ data: CommissionPayout[] }>({
    queryKey: ["commissions-therapist", therapistId],
    queryFn: () => request(`/api/commissions/therapist/${therapistId}`),
    enabled: Boolean(therapistId),
  });
}

export function useSetCommissionRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { therapist_id: string; commission_rate: number; notes?: string }) =>
      request("/api/commissions/config", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions-config"] });
      toast.success("Taxa de comissão configurada!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useMarkCommissionPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      therapist_id: string;
      period_start: string;
      period_end: string;
      total_sessions: number;
      total_revenue: number;
      commission_rate: number;
      commission_amount: number;
      notes?: string;
    }) =>
      request("/api/commissions/payout", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["commissions-summary"] });
      queryClient.invalidateQueries({
        queryKey: ["commissions-therapist", variables.therapist_id],
      });
      toast.success("Pagamento registrado!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
