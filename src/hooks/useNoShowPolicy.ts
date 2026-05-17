import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schedulingApi, type ScheduleNoShowPolicy } from "@/api/v2/scheduling";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type NoShowAction = "warn" | "block_online" | "suspend" | "charge";

export interface NoShowPolicy {
  thresholdCount: number;
  windowDays: number;
  action: NoShowAction;
  suspendDays: number;
  chargeFee: boolean;
  feeAmount: number;
  notifyAdmin: boolean;
}

const DEFAULTS: NoShowPolicy = {
  thresholdCount: 3,
  windowDays: 90,
  action: "warn",
  suspendDays: 0,
  chargeFee: false,
  feeAmount: 0,
  notifyAdmin: true,
};

const QUERY_KEY = "no-show-policy";

export function useNoShowPolicy() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const organizationId = profile?.organization_id;

  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEY, organizationId],
    queryFn: async (): Promise<NoShowPolicy> => {
      try {
        const res = await schedulingApi.noShowPolicy.get();
        const row = (res?.data ?? null) as ScheduleNoShowPolicy | null;
        if (!row) return DEFAULTS;
        return {
          thresholdCount: Number(row.threshold_count ?? 3),
          windowDays: Number(row.window_days ?? 90),
          action: (row.action ?? "warn") as NoShowAction,
          suspendDays: Number(row.suspend_days ?? 0),
          chargeFee: row.charge_fee === true,
          feeAmount: Number(row.fee_amount ?? 0),
          notifyAdmin: row.notify_admin !== false,
        };
      } catch {
        return DEFAULTS;
      }
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const save = useMutation({
    mutationFn: async (p: NoShowPolicy) => {
      await schedulingApi.noShowPolicy.upsert({
        threshold_count: p.thresholdCount,
        window_days: p.windowDays,
        action: p.action,
        suspend_days: p.suspendDays,
        charge_fee: p.chargeFee,
        fee_amount: p.feeAmount,
        notify_admin: p.notifyAdmin,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
      toast({ title: "Política de faltas salva" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" }),
  });

  return {
    data: data ?? DEFAULTS,
    isLoading,
    save: save.mutate,
    isSaving: save.isPending,
  };
}
