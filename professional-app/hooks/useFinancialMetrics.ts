import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/auth-api';
import { config } from '@/lib/config';

export interface FinancialMetrics {
  totalRevenue: number;
  import { useQuery } from '@tanstack/react-query';
  import { fetchApi } from '@/lib/api';

  export interface FinancialMetrics {
  ...
    revenueByDay: Array<{ date: string; total: string | number }>;
  }

  export interface UseFinancialMetricsOptions {
    startDate?: string;
    endDate?: string;
    enabled?: boolean;
  }

  /**
   * Hook to fetch financial metrics for reports
   */
  export function useFinancialMetrics(options?: UseFinancialMetricsOptions) {
    const { startDate, endDate, enabled = true } = options || {};

    // Default to current month if not provided
    const start = startDate || new Date(new Date().setDate(1)).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    return useQuery<FinancialMetrics>({
      queryKey: ['financial-metrics', start, end],
      queryFn: () => fetchApi('/api/financial-metrics', {
          params: { startDate: start, endDate: end }
      }),
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

  const chartData = data?.revenueByDay?.map(item => ({
    date: item.date,
    value: typeof item.total === 'string' ? parseFloat(item.total) : item.total,
  })) || [];

  // Calculate totals
  const totalRevenue = data?.totalRevenue || 0;
  const pendingRevenue = data?.pendingRevenue || 0;
  const averagePerSession = data?.sessionsCount 
    ? totalRevenue / data.sessionsCount 
    : 0;

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
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}