import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { clinicMetricsApi } from "@/api/v2/clinicMetrics";
import { format } from "date-fns";

export const useClinicHealthKPIs = (month?: string) => {
  const { organizationId } = useAuth();

  // Default to current month if not provided (YYYY-MM)
  const targetMonth = month || format(new Date(), "yyyy-MM");

  return useQuery({
    queryKey: ["clinic-health-kpis", organizationId, targetMonth],
    queryFn: async () => {
      const response = await clinicMetricsApi.getKPIs({ month: targetMonth });
      return response.data;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};
