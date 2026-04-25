import { useQuery } from "@tanstack/react-query";
import { getWorkersApiUrl } from "@/lib/api/config";
import { getNeonAccessToken } from "@/lib/auth/neon-token";

export interface ClinicalInsights {
  goals: Array<{
    status: string;
    count: string;
    avg_days_to_achieve: number | null;
  }>;
  pathologies: Array<{
    name: string;
    patient_count: string;
  }>;
  painTrend: Array<{
    pathology: string;
    avg_pain_level: number;
    record_count: string;
  }>;
  timestamp: string;
}

export const useClinicalInsights = () => {
  return useQuery({
    queryKey: ["clinical-insights-v2"],
    queryFn: async () => {
      const token = await getNeonAccessToken();
      const response = await fetch(`${getWorkersApiUrl()}/api/clinical/insights`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : `Erro ao carregar insights (${response.status})`,
        );
      }

      return payload.data as ClinicalInsights;
    },
    staleTime: 1000 * 60 * 15, // 15 minutos (dados analíticos mudam devagar)
  });
};
