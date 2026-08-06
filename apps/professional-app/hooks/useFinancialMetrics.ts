import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import type { ApiResponse, ApiInsightsDashboard } from "@/types/api";

export interface FinancialMetrics {
  totalRevenue: number;
  pendingRevenue: number;
  paidRevenue: number;
  sessionsCount: number;
  patientsCount: number;
  newPatientsThisMonth: number;
  revenueByDay: Array<{ date: string; total: string | number }>;
}

export interface UseFinancialMetricsOptions {
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}

interface InsightsFinancial {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    pendingPayments: number;
  };
  details: Array<{ category: string; amount: number; percentage: number }>;
  revenueByDay: Array<{ date: string; total: number }>;
}

/**
 * Métricas financeiras do período.
 *
 * Até 08/2026 este hook chamava `/api/financial-metrics`, rota que não existe no
 * Worker (404) — a aba Financeiro dos relatórios sempre mostrou "Erro ao carregar
 * dados financeiros". Os números vêm de dois endpoints que existem:
 * `/api/insights/financial` (receita, pendente e série diária, por intervalo) e
 * `/api/insights/dashboard` (sessões e pacientes, por período).
 */
export function useFinancialMetrics(options?: UseFinancialMetricsOptions) {
  const { startDate, endDate, enabled = true } = options || {};

  // Default to current month if not provided
  const start = startDate || new Date(new Date().setDate(1)).toISOString().split("T")[0];
  const end = endDate || new Date().toISOString().split("T")[0];

  return useQuery<FinancialMetrics>({
    queryKey: ["financial-metrics", start, end],
    queryFn: async () => {
      const [financial, dashboard] = await Promise.all([
        fetchApi<ApiResponse<InsightsFinancial>>("/api/insights/financial", {
          params: { startDate: start, endDate: end },
        }),
        fetchApi<ApiResponse<ApiInsightsDashboard>>("/api/insights/dashboard", {
          params: { period: "month" },
        }),
      ]);

      const summary = financial.data?.summary;
      const totalRevenue = Number(summary?.totalRevenue ?? 0);

      return {
        totalRevenue,
        pendingRevenue: Number(summary?.pendingPayments ?? 0),
        paidRevenue: totalRevenue,
        sessionsCount: Number(dashboard.data?.appointments?.completed ?? 0),
        patientsCount: Number(dashboard.data?.active_patients ?? 0),
        newPatientsThisMonth: Number(dashboard.data?.new_patients ?? 0),
        revenueByDay: financial.data?.revenueByDay ?? [],
      };
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to get formatted revenue data for charts
 */
export function useRevenueChartData(options?: UseFinancialMetricsOptions) {
  const { data, isLoading, error } = useFinancialMetrics(options);

  const chartData =
    data?.revenueByDay?.map((item) => ({
      date: item.date,
      value: typeof item.total === "string" ? parseFloat(item.total) : item.total,
    })) || [];

  // Calculate totals
  const totalRevenue = data?.totalRevenue || 0;
  const pendingRevenue = data?.pendingRevenue || 0;
  const averagePerSession = data?.sessionsCount ? totalRevenue / data.sessionsCount : 0;

  return {
    chartData,
    metrics: {
      totalRevenue,
      pendingRevenue,
      paidRevenue: data?.paidRevenue || 0,
      sessionsCount: data?.sessionsCount || 0,
      patientsCount: data?.patientsCount || 0,
      newPatientsThisMonth: data?.newPatientsThisMonth || 0,
      averagePerSession,
    },
    isLoading,
    error,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}
