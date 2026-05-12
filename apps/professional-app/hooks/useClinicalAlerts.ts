import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClinicalAlerts, resolveClinicalAlert, type ApiClinicalAlert } from "@/lib/api";

export function useClinicalAlerts() {
  const queryClient = useQueryClient();

  const {
    data: alerts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["clinicalAlerts"],
    queryFn: () => getClinicalAlerts({ status: "pending" }),
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 5, // Auto refresh every 5 mins
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => resolveClinicalAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinicalAlerts"] });
    },
  });

  const highSeverityCount = alerts.filter(a => a.severity === 'high').length;

  return {
    alerts,
    isLoading,
    highSeverityCount,
    resolveAlert: resolveMutation.mutateAsync,
    isResolving: resolveMutation.isPending,
    refetch,
  };
}
