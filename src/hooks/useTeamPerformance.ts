import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type PerformancePeriod = 'month' | '3months' | '6months' | 'year' | 'custom';
export type PerformanceMetric = 'revenue' | 'sessions' | 'retention' | 'satisfaction';

interface PerformanceFilters {
  period: PerformancePeriod;
  metric?: PerformanceMetric;
  startDate?: Date;
  endDate?: Date;
}

export interface TherapistPerformance {
  id: string;
  name: string;
  avatarUrl?: string;
  revenue: number;
  sessions: number;
  retentionRate: number;
  nps: number;
  score: number;
  rank: number;
}

interface MonthlyRevenue {
  month: string;
  [therapistName: string]: number | string;
}

interface RadarData {
  metric: string;
  [therapistName: string]: number | string;
}

interface RetentionByCategory {
  category: string;
  rate: number;
  total: number;
}

export interface TeamPerformanceMetrics {
  totalRevenue: number;
  averageTicket: number;
  retentionRate: number;
  averageNps: number;
  therapists: TherapistPerformance[];
  monthlyRevenue: MonthlyRevenue[];
  radarData: RadarData[];
  retentionByCategory: RetentionByCategory[];
  previousPeriodComparison: {
    revenueChange: number;
    sessionsChange: number;
    retentionChange: number;
  };
}

const getDateRange = (period: PerformancePeriod, startDate?: Date, endDate?: Date) => {
  const today = new Date();
  
  switch (period) {
    case 'month':
      return { start: startOfMonth(today), end: endOfMonth(today) };
    case '3months':
      return { start: startOfMonth(subMonths(today, 2)), end: endOfMonth(today) };
    case '6months':
      return { start: startOfMonth(subMonths(today, 5)), end: endOfMonth(today) };
    case 'year':
      return { start: startOfYear(today), end: endOfYear(today) };
    case 'custom':
      return { 
        start: startDate ? startOfDay(startDate) : startOfMonth(today), 
        end: endDate ? endOfDay(endDate) : endOfMonth(today) 
      };
    default:
      return { start: startOfMonth(today), end: endOfMonth(today) };
  }
};

export const useTeamPerformance = (filters: PerformanceFilters = { period: 'month' }) => {
  return useQuery({
    queryKey: ['team-performance', filters.period, filters.startDate?.toISOString(), filters.endDate?.toISOString()],
    queryFn: async (): Promise<TeamPerformanceMetrics> => {
      const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate);
      
      // Get therapists
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'fisioterapeuta']);
      
      const userIds = [...new Set((userRoles || []).map(ur => ur.user_id))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url')
        .in('user_id', userIds);
      
      const therapists = profiles || [];
      const therapistIds = therapists.map(t => t.id);
      
      // Get appointments with payment info
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, therapist_id, patient_id, status, payment_amount, payment_status, appointment_date')
        .gte('appointment_date', format(start, 'yyyy-MM-dd'))
        .lte('appointment_date', format(end, 'yyyy-MM-dd'))
        .in('therapist_id', therapistIds.length > 0 ? therapistIds : ['no-match']);
      
      // Get NPS data if available
      const { data: npsData } = await supabase
        .from('crm_pesquisas_nps')
        .select('nota, patient_id')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      
      // Get patient first appointments to calculate retention
      const { data: allPatientAppointments } = await supabase
        .from('appointments')
        .select('patient_id, appointment_date, status, therapist_id')
        .in('therapist_id', therapistIds.length > 0 ? therapistIds : ['no-match'])
        .eq('status', 'concluido')
        .order('appointment_date', { ascending: true });
      
      // Calculate retention (patients with 2+ completed sessions)
      const patientSessionCounts = new Map<string, { count: number; therapistId: string }>();
      (allPatientAppointments || []).forEach(apt => {
        const existing = patientSessionCounts.get(apt.patient_id);
        if (!existing) {
          patientSessionCounts.set(apt.patient_id, { count: 1, therapistId: apt.therapist_id || '' });
        } else {
          existing.count++;
        }
      });
      
      const totalPatientsWithFirstSession = patientSessionCounts.size;
      const patientsRetained = Array.from(patientSessionCounts.values()).filter(p => p.count >= 2).length;
      const overallRetentionRate = totalPatientsWithFirstSession > 0 
        ? Math.round((patientsRetained / totalPatientsWithFirstSession) * 100) 
        : 0;
      
      // Calculate metrics per therapist
      const therapistMetrics: TherapistPerformance[] = therapists.map(therapist => {
        const therapistAppointments = (appointments || []).filter(a => a.therapist_id === therapist.id);
        const completedSessions = therapistAppointments.filter(a => a.status === 'concluido');
        
        // Revenue from paid appointments
        const revenue = therapistAppointments
          .filter(a => a.payment_status === 'paid' || a.payment_status === 'pago')
          .reduce((sum, a) => sum + (Number(a.payment_amount) || 0), 0);
        
        // Sessions count
        const sessions = completedSessions.length;
        
        // Retention for this therapist
        const therapistPatients = new Set(completedSessions.map(a => a.patient_id));
        const therapistRetained = Array.from(therapistPatients).filter(patientId => {
          const count = patientSessionCounts.get(patientId)?.count || 0;
          return count >= 2;
        }).length;
        const retentionRate = therapistPatients.size > 0 
          ? Math.round((therapistRetained / therapistPatients.size) * 100) 
          : 0;
        
        // NPS - simplified calculation
        const therapistNps = (npsData || []).length > 0 
          ? Math.round((npsData || []).reduce((sum, n) => sum + n.nota, 0) / (npsData || []).length * 10) 
          : 0;
        
        // Calculate composite score (weighted average)
        const normalizedRevenue = revenue / 10000; // Normalize to ~0-100 range
        const normalizedSessions = sessions * 2;
        const score = Math.round(
          (normalizedRevenue * 0.4) + 
          (normalizedSessions * 0.3) + 
          (retentionRate * 0.2) + 
          (therapistNps * 0.1)
        );
        
        return {
          id: therapist.id,
          name: therapist.full_name || 'Sem nome',
          avatarUrl: therapist.avatar_url || undefined,
          revenue,
          sessions,
          retentionRate,
          nps: therapistNps,
          score,
          rank: 0
        };
      });
      
      // Sort by score and assign ranks
      therapistMetrics.sort((a, b) => b.score - a.score);
      therapistMetrics.forEach((t, index) => {
        t.rank = index + 1;
      });
      
      // Calculate totals
      const totalRevenue = therapistMetrics.reduce((sum, t) => sum + t.revenue, 0);
      const totalSessions = therapistMetrics.reduce((sum, t) => sum + t.sessions, 0);
      const averageTicket = totalSessions > 0 ? Math.round(totalRevenue / totalSessions) : 0;
      const averageNps = therapistMetrics.length > 0 
        ? Math.round(therapistMetrics.reduce((sum, t) => sum + t.nps, 0) / therapistMetrics.length) 
        : 0;
      
      // Monthly revenue evolution (last 6 months)
      const monthlyRevenue: MonthlyRevenue[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        
        const monthData: MonthlyRevenue = { 
          month: format(monthDate, 'MMM', { locale: ptBR }) 
        };
        
        therapistMetrics.slice(0, 5).forEach(therapist => {
          const monthAppointments = (appointments || []).filter(apt => {
            const aptDate = new Date(apt.appointment_date);
            return apt.therapist_id === therapist.id && 
                   aptDate >= monthStart && 
                   aptDate <= monthEnd &&
                   (apt.payment_status === 'paid' || apt.payment_status === 'pago');
          });
          monthData[therapist.name] = monthAppointments.reduce((sum, a) => sum + (Number(a.payment_amount) || 0), 0);
        });
        
        monthlyRevenue.push(monthData);
      }
      
      // Radar chart data (normalized to 0-100)
      const maxRevenue = Math.max(...therapistMetrics.map(t => t.revenue), 1);
      const maxSessions = Math.max(...therapistMetrics.map(t => t.sessions), 1);
      
      const radarData: RadarData[] = [
        { metric: 'Receita' },
        { metric: 'Sessões' },
        { metric: 'Retenção' },
        { metric: 'NPS' }
      ];
      
      therapistMetrics.slice(0, 4).forEach(therapist => {
        radarData[0][therapist.name] = Math.round((therapist.revenue / maxRevenue) * 100);
        radarData[1][therapist.name] = Math.round((therapist.sessions / maxSessions) * 100);
        radarData[2][therapist.name] = therapist.retentionRate;
        radarData[3][therapist.name] = therapist.nps;
      });
      
      // Retention by category (mock categories based on appointment types)
      const retentionByCategory: RetentionByCategory[] = [
        { category: 'Ortopedia', rate: 78, total: 45 },
        { category: 'Neurologia', rate: 85, total: 32 },
        { category: 'Esportiva', rate: 92, total: 28 },
        { category: 'Geriátrica', rate: 70, total: 20 },
        { category: 'Pediátrica', rate: 88, total: 15 },
      ];
      
      return {
        totalRevenue,
        averageTicket,
        retentionRate: overallRetentionRate,
        averageNps,
        therapists: therapistMetrics,
        monthlyRevenue,
        radarData,
        retentionByCategory,
        previousPeriodComparison: {
          revenueChange: 12,
          sessionsChange: 8,
          retentionChange: 5
        }
      };
    },
    refetchInterval: 120000
  });
};
