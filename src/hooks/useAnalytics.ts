import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

export interface KPIMetric {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  date?: string;
  [key: string]: unknown;
}

export function useKPIMetrics(dateRange: { start: Date; end: Date }) {
  return useQuery({
    queryKey: ['kpi-metrics', dateRange],
    queryFn: async (): Promise<KPIMetric[]> => {
      // Get current month metrics
      const currentMonth = format(new Date(), 'yyyy-MM-01');
      const previousMonth = format(subDays(new Date(), 30), 'yyyy-MM-01');

      // Fetch patients count
      const { data: patients } = await supabase
        .from('patients')
        .select('*')
        .gte('created_at', currentMonth);

      const { data: previousPatients } = await supabase
        .from('patients')
        .select('*')
        .gte('created_at', previousMonth)
        .lt('created_at', currentMonth);

      // Fetch appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .gte('appointment_date', currentMonth);

      // Fetch revenue
      const { data: revenue } = await supabase
        .from('voucher_purchases')
        .select('amount_paid')
        .eq('status', 'active')
        .gte('purchase_date', currentMonth);

      // Calculate metrics
      const totalPatients = patients?.length || 0;
      const previousTotalPatients = previousPatients?.length || 0;
      const patientGrowth = previousTotalPatients > 0 
        ? ((totalPatients - previousTotalPatients) / previousTotalPatients) * 100 
        : 0;

      const totalAppointments = appointments?.length || 0;
      const confirmedAppointments = appointments?.filter(a => a.status === 'Confirmado').length || 0;
      const occupancyRate = totalAppointments > 0 ? (confirmedAppointments / totalAppointments) * 100 : 0;

      const monthlyRevenue = revenue?.reduce((sum, r) => sum + Number(r.amount_paid), 0) || 0;

      return [
        {
          title: 'Faturamento do Mês',
          value: new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
          }).format(monthlyRevenue),
          change: 15.2,
          changeType: 'positive',
          icon: 'DollarSign'
        },
        {
          title: 'Pacientes Ativos',
          value: totalPatients,
          change: patientGrowth,
          changeType: patientGrowth >= 0 ? 'positive' : 'negative',
          icon: 'Users'
        },
        {
          title: 'Taxa de Ocupação',
          value: `${occupancyRate.toFixed(1)}%`,
          change: 8.5,
          changeType: 'positive',
          icon: 'Calendar'
        },
        {
          title: 'Satisfação (NPS)',
          value: '8.7',
          change: -2.1,
          changeType: 'negative',
          icon: 'Heart'
        },
        {
          title: 'Novos Pacientes',
          value: totalPatients,
          change: patientGrowth,
          changeType: patientGrowth >= 0 ? 'positive' : 'negative',
          icon: 'UserPlus'
        },
        {
          title: 'Taxa de Conclusão',
          value: '84.3%',
          change: 3.2,
          changeType: 'positive',
          icon: 'CheckCircle'
        }
      ];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useFinancialAnalytics(months = 12) {
  return useQuery({
    queryKey: ['financial-analytics', months],
    queryFn: async (): Promise<ChartDataPoint[]> => {
      const { data, error } = await supabase.rpc('get_financial_metrics', {
        start_date: format(subDays(new Date(), months * 30), 'yyyy-MM-dd')
      });

      if (error) throw error;

      return data?.map((item: Record<string, unknown>) => ({
         name: format(new Date(String(item.month)), 'MMM/yyyy'),
        value: Number(item.total_revenue) || 0,
        revenue: Number(item.total_revenue) || 0,
        purchases: Number(item.total_purchases) || 0,
        avgTicket: Number(item.avg_ticket) || 0,
        customers: Number(item.unique_customers) || 0
      })) || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useClinicalAnalytics(months = 12) {
  return useQuery({
    queryKey: ['clinical-analytics', months],
    queryFn: async (): Promise<ChartDataPoint[]> => {
      const { data, error } = await supabase.rpc('get_clinical_metrics', {
        start_date: format(subDays(new Date(), months * 30), 'yyyy-MM-dd')
      });

      if (error) throw error;

      return data?.map((item: Record<string, unknown>) => ({
        name: format(new Date(String(item.month)), 'MMM/yyyy'),
        value: Number(item.total_sessions) || 0,
        sessions: Number(item.total_sessions) || 0,
        avgPainLevel: Number(item.avg_pain_level) || 0,
        patients: Number(item.treated_patients) || 0,
        avgDuration: Number(item.avg_session_duration) || 0
      })) || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useOperationalAnalytics() {
  return useQuery({
    queryKey: ['operational-analytics'],
    queryFn: async () => {
      // Get appointment data for operational metrics
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .gte('appointment_date', format(subDays(new Date(), 30), 'yyyy-MM-dd'));

      // Calculate operational metrics
      const totalAppointments = appointments?.length || 0;
      const confirmedAppointments = appointments?.filter(a => a.status === 'Confirmado').length || 0;
      const cancelledAppointments = appointments?.filter(a => a.status === 'Cancelado').length || 0;
      
      const occupancyRate = totalAppointments > 0 ? (confirmedAppointments / totalAppointments) * 100 : 0;
      const noShowRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0;

      // Calculate peak hours
      const hourlyDistribution = appointments?.reduce((acc, apt) => {
        const hour = apt.appointment_time?.split(':')[0] || '00';
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const peakHour = Object.entries(hourlyDistribution || {})
        .sort(([,a], [,b]) => b - a)[0]?.[0] || '09';

      return {
        occupancyRate: Number(occupancyRate.toFixed(1)),
        noShowRate: Number(noShowRate.toFixed(1)),
        avgSessionDuration: 60, // Default value
        peakHour: `${peakHour}:00`,
        totalAppointments,
        confirmedAppointments,
        cancelledAppointments,
        hourlyDistribution
      };
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

export function usePatientDistribution() {
  return useQuery({
    queryKey: ['patient-distribution'],
    queryFn: async (): Promise<ChartDataPoint[]> => {
      const { data, error } = await supabase.rpc('get_patient_analytics');

      if (error) throw error;

      return data?.map((item: Record<string, unknown>) => ({
        name: String(item.status),
        value: Number(item.count) || 0,
        avgAge: Number(item.avg_age) || 0
      })) || [];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useRealtimeMetrics() {
  return useQuery({
    queryKey: ['realtime-metrics'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Today's appointments
      const { data: todayAppointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_date', today);

      // Today's new patients
      const { data: newPatients } = await supabase
        .from('patients')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      // Active treatment sessions
      const { data: activeSessions } = await supabase
        .from('treatment_sessions')
        .select('*')
        .gte('created_at', `${today}T00:00:00`);

      return {
        todayAppointments: todayAppointments?.length || 0,
        newPatients: newPatients?.length || 0,
        activeSessions: activeSessions?.length || 0,
        onlineUsers: Math.floor(Math.random() * 15) + 5 // Mock real-time users
      };
    },
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
    staleTime: 0,
  });
}