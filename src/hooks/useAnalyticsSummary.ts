import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { queryConfigs } from "@/lib/queryConfig";
import { logger } from "@/lib/errors/logger";

interface AnalyticsSummary {
  totalAppointments: number;
  appointmentGrowth: number;
  activePatients: number;
  patientGrowth: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  occupancyRate: number;
}

// Função auxiliar para criar timeout em promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// Função auxiliar para retry com backoff exponencial
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

export function useAnalyticsSummary() {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: async () => {
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

      try {
        // Carregar todos os dados em paralelo com timeout e retry
        const [
          currentAppointmentsResult,
          lastAppointmentsResult,
          activePatientsResult,
          lastMonthPatientsResult,
          currentPaymentsResult,
          lastPaymentsResult,
        ] = await Promise.allSettled([
          // Agendamentos do mês atual
          retryWithBackoff(() =>
            withTimeout(
              supabase
                .from("appointments")
                .select("*", { count: "exact", head: true })
                .gte("appointment_date", format(currentMonthStart, "yyyy-MM-dd"))
                .lte("appointment_date", format(currentMonthEnd, "yyyy-MM-dd")),
              8000 // 8 segundos de timeout
            ),
          ),
          // Agendamentos do mês passado
          retryWithBackoff(() =>
            withTimeout(
              supabase
                .from("appointments")
                .select("*", { count: "exact", head: true })
                .gte("appointment_date", format(lastMonthStart, "yyyy-MM-dd"))
                .lte("appointment_date", format(lastMonthEnd, "yyyy-MM-dd")),
              8000
            ),
          ),
          // Pacientes ativos (com agendamento nos últimos 30 dias)
          retryWithBackoff(() =>
            withTimeout(
              supabase
                .from("appointments")
                .select("patient_id")
                .gte("appointment_date", format(subMonths(now, 1), "yyyy-MM-dd"))
                .lte("appointment_date", format(now, "yyyy-MM-dd")),
              8000
            ),
          ),
          // Pacientes do mês anterior
          retryWithBackoff(() =>
            withTimeout(
              supabase
                .from("appointments")
                .select("patient_id")
                .gte("appointment_date", format(subMonths(now, 2), "yyyy-MM-dd"))
                .lte("appointment_date", format(lastMonthEnd, "yyyy-MM-dd")),
              8000
            ),
          ),
          // Receita do mês atual
          retryWithBackoff(() =>
            withTimeout(
              supabase
                .from("appointments")
                .select("payment_amount")
                .gte("appointment_date", format(currentMonthStart, "yyyy-MM-dd"))
                .lte("appointment_date", format(currentMonthEnd, "yyyy-MM-dd"))
                .eq("payment_status", "pago"),
              8000
            ),
          ),
          // Receita do mês passado
          retryWithBackoff(() =>
            withTimeout(
              supabase
                .from("appointments")
                .select("payment_amount")
                .gte("appointment_date", format(lastMonthStart, "yyyy-MM-dd"))
                .lte("appointment_date", format(lastMonthEnd, "yyyy-MM-dd"))
                .eq("payment_status", "pago"),
              8000
            ),
          ),
        ]);

        // Extrair dados com fallback para valores padrão
        const currentAppointments = currentAppointmentsResult.status === "fulfilled" 
          ? currentAppointmentsResult.value.count || 0 
          : 0;
        
        const lastAppointments = lastAppointmentsResult.status === "fulfilled"
          ? lastAppointmentsResult.value.count || 0
          : 0;

        const activePatients = activePatientsResult.status === "fulfilled"
          ? new Set(activePatientsResult.value.data?.map(a => a.patient_id) || []).size
          : 0;

        const lastMonthUniquePatients = lastMonthPatientsResult.status === "fulfilled"
          ? new Set(lastMonthPatientsResult.value.data?.map(a => a.patient_id) || []).size
          : 0;

        const monthlyRevenue = currentPaymentsResult.status === "fulfilled"
          ? currentPaymentsResult.value.data?.reduce((sum, p) => sum + (p.payment_amount || 0), 0) || 0
          : 0;

        const lastMonthRevenue = lastPaymentsResult.status === "fulfilled"
          ? lastPaymentsResult.value.data?.reduce((sum, p) => sum + (p.payment_amount || 0), 0) || 0
          : 0;

        // Taxa de ocupação (simplificado: 160 slots por mês)
        const totalSlots = 160;
        const occupancyRate = currentAppointments 
          ? Math.round((currentAppointments / totalSlots) * 100) 
          : 0;

        const appointmentGrowth = lastAppointments 
          ? Math.round(((currentAppointments - lastAppointments) / lastAppointments) * 100)
          : 0;

        const patientGrowth = lastMonthUniquePatients
          ? Math.round(((activePatients - lastMonthUniquePatients) / lastMonthUniquePatients) * 100)
          : 0;

        const revenueGrowth = lastMonthRevenue
          ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
          : 0;

        return {
          totalAppointments: currentAppointments,
          appointmentGrowth,
          activePatients,
          patientGrowth,
          monthlyRevenue,
          revenueGrowth,
          occupancyRate: Math.min(occupancyRate, 100), // Limitar a 100%
        } as AnalyticsSummary;
      } catch (error) {
        logger.error("Erro ao carregar analytics summary", error, "useAnalyticsSummary");
        // Retornar valores padrão em caso de erro
        return {
          totalAppointments: 0,
          appointmentGrowth: 0,
          activePatients: 0,
          patientGrowth: 0,
          monthlyRevenue: 0,
          revenueGrowth: 0,
          occupancyRate: 0,
        } as AnalyticsSummary;
      }
    },
    ...queryConfigs.dynamic,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 5, // 5 minutos
  });

  return {
    summary: summary || {
      totalAppointments: 0,
      appointmentGrowth: 0,
      activePatients: 0,
      patientGrowth: 0,
      monthlyRevenue: 0,
      revenueGrowth: 0,
      occupancyRate: 0,
    },
    isLoading,
    error,
  };
}
