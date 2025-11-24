import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

interface AnalyticsSummary {
  totalAppointments: number;
  appointmentGrowth: number;
  activePatients: number;
  patientGrowth: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  occupancyRate: number;
}

export function useAnalyticsSummary() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: async () => {
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

      // Agendamentos do mês atual
      const { count: currentAppointments } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("appointment_date", format(currentMonthStart, "yyyy-MM-dd"))
        .lte("appointment_date", format(currentMonthEnd, "yyyy-MM-dd"));

      // Agendamentos do mês passado
      const { count: lastAppointments } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("appointment_date", format(lastMonthStart, "yyyy-MM-dd"))
        .lte("appointment_date", format(lastMonthEnd, "yyyy-MM-dd"));

      // Pacientes ativos (com agendamento nos últimos 30 dias)
      const { data: activePatients } = await supabase
        .from("appointments")
        .select("patient_id")
        .gte("appointment_date", format(subMonths(now, 1), "yyyy-MM-dd"))
        .lte("appointment_date", format(now, "yyyy-MM-dd"));

      const uniquePatients = new Set(activePatients?.map(a => a.patient_id) || []).size;

      // Pacientes do mês anterior
      const { data: lastMonthPatients } = await supabase
        .from("appointments")
        .select("patient_id")
        .gte("appointment_date", format(subMonths(now, 2), "yyyy-MM-dd"))
        .lte("appointment_date", format(lastMonthEnd, "yyyy-MM-dd"));

      const lastMonthUniquePatients = new Set(lastMonthPatients?.map(a => a.patient_id) || []).size;

      // Receita do mês atual
      const { data: currentPayments } = await supabase
        .from("appointments")
        .select("payment_amount")
        .gte("appointment_date", format(currentMonthStart, "yyyy-MM-dd"))
        .lte("appointment_date", format(currentMonthEnd, "yyyy-MM-dd"))
        .eq("payment_status", "pago");

      const monthlyRevenue = currentPayments?.reduce((sum, p) => sum + (p.payment_amount || 0), 0) || 0;

      // Receita do mês passado
      const { data: lastPayments } = await supabase
        .from("appointments")
        .select("payment_amount")
        .gte("appointment_date", format(lastMonthStart, "yyyy-MM-dd"))
        .lte("appointment_date", format(lastMonthEnd, "yyyy-MM-dd"))
        .eq("payment_status", "pago");

      const lastMonthRevenue = lastPayments?.reduce((sum, p) => sum + (p.payment_amount || 0), 0) || 0;

      // Taxa de ocupação (simplificado: 160 slots por mês)
      const totalSlots = 160;
      const occupancyRate = currentAppointments ? Math.round((currentAppointments / totalSlots) * 100) : 0;

      const appointmentGrowth = lastAppointments 
        ? Math.round(((currentAppointments || 0) - lastAppointments) / lastAppointments * 100)
        : 0;

      const patientGrowth = lastMonthUniquePatients
        ? Math.round((uniquePatients - lastMonthUniquePatients) / lastMonthUniquePatients * 100)
        : 0;

      const revenueGrowth = lastMonthRevenue
        ? Math.round((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100)
        : 0;

      return {
        totalAppointments: currentAppointments || 0,
        appointmentGrowth,
        activePatients: uniquePatients,
        patientGrowth,
        monthlyRevenue,
        revenueGrowth,
        occupancyRate,
      } as AnalyticsSummary;
    },
  });

  return {
    summary,
    isLoading,
  };
}
