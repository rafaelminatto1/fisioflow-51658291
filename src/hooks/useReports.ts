import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/errors/logger';
import { PatientHelpers } from '@/types';

export interface DashboardKPIs {
  activePatients: number;
  monthlyRevenue: number;
  occupancyRate: number;
  noShowRate: number;
  confirmationRate: number;
  npsScore: number;
  appointmentsToday: number;
  revenueChart: { date: string; revenue: number }[];
}

export interface FinancialReport {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  revenueByMethod: Record<string, number>;
  revenueByTherapist: {
    therapistId: string;
    therapistName: string;
    revenue: number;
    sessions: number;
  }[];
  delinquencyRate: number;
}

export interface PatientEvolutionReport {
  patientId: string;
  patientName: string;
  totalSessions: number;
  treatmentDuration: string;
  painEvolution: { date: string; averageEva: number }[];
  exerciseAdherence: number;
  recommendations: string;
}

export interface OccupancyReport {
  period: { startDate: string; endDate: string };
  occupancyByDay: { day: string; rate: number; appointments: number }[];
  averageOccupancy: number;
}

// Função auxiliar para calcular NPS
async function calculateNPS(): Promise<number> {
  try {
    const { data: surveys, error } = await supabase
      .from('satisfaction_surveys')
      .select('nps_score')
      .not('nps_score', 'is', null)
      .not('responded_at', 'is', null);

    if (error || !surveys || surveys.length === 0) {
      return 0;
    }

    const total = surveys.length;
    const promotores = surveys.filter(s => s.nps_score && s.nps_score >= 9).length;
    const detratores = surveys.filter(s => s.nps_score && s.nps_score <= 6).length;

    const nps = total > 0 ? Math.round(((promotores - detratores) / total) * 100) : 0;
    return nps;
  } catch (error) {
    logger.error('Erro ao calcular NPS', error, 'useReports');
    return 0;
  }
}

// Função auxiliar para calcular adesão de exercícios (simplificada)
async function calculateExerciseAdherence(patientId?: string): Promise<number> {
  try {
    // Adesão simplificada baseada em sessões completadas
    let query = supabase
      .from('sessions')
      .select('id, status')
      .eq('status', 'completed');

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    const { data: sessions, error } = await query.limit(100);

    if (error || !sessions) {
      return 0;
    }

    // Estimar adesão baseada em sessões
    return sessions.length > 0 ? Math.min(85, 50 + sessions.length) : 0;
  } catch (error) {
    logger.error('Erro ao calcular adesão de exercícios', error, 'useReports');
    return 0;
  }
}

// Hook para KPIs do Dashboard
export function useDashboardKPIs(period: string = 'month') {
  return useQuery({
    queryKey: ['reports', 'dashboard', period],
    queryFn: async () => {
      const { startDate, endDate } = getPeriodDates(period);
      
      // Pacientes ativos
      const { count: activePatients } = await supabase
        .from('patients')
        .select('id', { count: 'exact' })
        .eq('is_active', true);

      // Receita do período
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('paid_at', startDate)
        .lte('paid_at', endDate);

      const monthlyRevenue = (payments || []).reduce((sum: number, p: { amount?: number }) => sum + (p.amount || 0), 0);

      // Agendamentos do período
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, status')
        .gte('start_time', startDate)
        .lte('start_time', endDate);

      const totalAppointments = appointments?.length || 0;
      const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0;
      const noShowAppointments = appointments?.filter(a => a.status === 'no_show').length || 0;
      const confirmedAppointments = appointments?.filter(a => ['confirmed', 'completed'].includes(a.status)).length || 0;

      const occupancyRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;
      const noShowRate = totalAppointments > 0 ? (noShowAppointments / totalAppointments) * 100 : 0;
      const confirmationRate = totalAppointments > 0 ? (confirmedAppointments / totalAppointments) * 100 : 0;

      // Agendamentos de hoje
      const today = new Date().toISOString().split('T')[0];
      const { count: appointmentsToday } = await supabase
        .from('appointments')
        .select('id', { count: 'exact' })
        .gte('start_time', `${today}T00:00:00`)
        .lt('start_time', `${today}T23:59:59`)
        .neq('status', 'cancelled');

      // Gráfico de receita
      const revenueChart = await getRevenueChart(startDate, endDate);

      return {
        activePatients: activePatients || 0,
        monthlyRevenue,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        noShowRate: Math.round(noShowRate * 10) / 10,
        confirmationRate: Math.round(confirmationRate * 10) / 10,
        npsScore: await calculateNPS(),
        appointmentsToday: appointmentsToday || 0,
        revenueChart,
      } as DashboardKPIs;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para Relatório Financeiro
export function useFinancialReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['reports', 'financial', startDate, endDate],
    queryFn: async () => {
      // Receitas
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, method')
        .eq('status', 'completed')
        .gte('paid_at', startDate)
        .lte('paid_at', endDate + 'T23:59:59');

      const totalRevenue = (payments || []).reduce((sum, p: { amount?: number }) => sum + (p.amount || 0), 0);

      // Por método
      const revenueByMethod: Record<string, number> = {};
      (payments || []).forEach((p: { amount?: number; method?: string }) => {
        const method = p.method || 'outros';
        revenueByMethod[method] = (revenueByMethod[method] || 0) + (p.amount || 0);
      });

      // Por terapeuta
      const { data: sessions } = await supabase
        .from('sessions')
        .select(`
          therapist_id,
          therapist:profiles(id, name)
        `)
        .eq('status', 'completed')
        .gte('started_at', startDate)
        .lte('started_at', endDate + 'T23:59:59');

      const therapistMap: Record<string, { name: string; revenue: number; sessions: number }> = {};
      (sessions || []).forEach((s: { therapist_id?: string; therapist?: { name?: string } }) => {
        const id = s.therapist_id || 'unassigned';
        const name = s.therapist?.name || 'Não atribuído';
        if (!therapistMap[id]) {
          therapistMap[id] = { name, revenue: 0, sessions: 0 };
        }
        therapistMap[id].sessions += 1;
      });

      // Estimar receita por terapeuta (dividir proporcional)
      const avgPerSession = sessions?.length > 0 ? totalRevenue / sessions.length : 0;
      Object.values(therapistMap).forEach(t => {
        t.revenue = t.sessions * avgPerSession;
      });

      const revenueByTherapist = Object.entries(therapistMap)
        .map(([id, data]) => ({
          therapistId: id,
          therapistName: data.name,
          revenue: Math.round(data.revenue * 100) / 100,
          sessions: data.sessions,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // Taxa de inadimplência
      const { data: pendingPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'pending')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59');

      const totalPending = (pendingPayments || []).reduce((sum: number, p: { amount?: number }) => sum + (p.amount || 0), 0);
      const delinquencyRate = (totalRevenue + totalPending) > 0 
        ? (totalPending / (totalRevenue + totalPending)) * 100 
        : 0;

      return {
        totalRevenue,
        totalExpenses: 0,
        netIncome: totalRevenue,
        revenueByMethod,
        revenueByTherapist,
        delinquencyRate: Math.round(delinquencyRate * 10) / 10,
      } as FinancialReport;
    },
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook para Evolução do Paciente
export function usePatientEvolution(patientId: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'patient-evolution', patientId],
    queryFn: async () => {
      if (!patientId) return null;

      // Dados do paciente
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id, name')
        .eq('id', patientId)
        .single();

      if (patientError || !patient) throw new Error('Paciente não encontrado');

      // Sessões
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, eva_score, started_at, completed_at')
        .eq('patient_id', patientId)
        .eq('status', 'completed')
        .order('started_at', { ascending: true });

      const totalSessions = sessions?.length || 0;

      // Evolução da dor
      const painEvolution = (sessions || [])
        .filter((s: { eva_score?: number | null }) => s.eva_score !== null)
        .map((s: { started_at?: string; eva_score?: number }) => ({
          date: s.started_at?.split('T')[0] || '',
          averageEva: s.eva_score || 0,
        }));

      // Duração do tratamento
      let treatmentDuration = 'N/A';
      if (sessions && sessions.length >= 2) {
        const firstSession = new Date(sessions[0].started_at);
        const lastSession = new Date(sessions[sessions.length - 1].started_at);
        const diffDays = Math.ceil((lastSession.getTime() - firstSession.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 30) {
          treatmentDuration = `${Math.round(diffDays / 30)} meses`;
        } else {
          treatmentDuration = `${diffDays} dias`;
        }
      }

      // Recomendações
      let recommendations = '';
      if (painEvolution.length >= 2) {
        const firstEva = painEvolution[0].averageEva;
        const lastEva = painEvolution[painEvolution.length - 1].averageEva;
        const improvement = firstEva - lastEva;

        if (improvement > 3) {
          recommendations = 'Excelente evolução! Considerar redução gradual da frequência de sessões.';
        } else if (improvement > 0) {
          recommendations = 'Evolução positiva. Manter protocolo atual e reforçar exercícios domiciliares.';
        } else {
          recommendations = 'Reavaliar protocolo de tratamento. Considerar ajustes na abordagem terapêutica.';
        }
      }

      return {
        patientId,
        patientName: PatientHelpers.getName(patient),
        totalSessions,
        treatmentDuration,
        painEvolution,
        exerciseAdherence: await calculateExerciseAdherence(),
        recommendations,
      } as PatientEvolutionReport;
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook para Ocupação
export function useOccupancyReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['reports', 'occupancy', startDate, endDate],
    queryFn: async () => {
      const { data: appointments } = await supabase
        .from('appointments')
        .select('start_time, status')
        .gte('start_time', startDate)
        .lte('start_time', endDate + 'T23:59:59');

      const dayOccupancy: Record<string, { total: number; occupied: number }> = {
        'Segunda': { total: 0, occupied: 0 },
        'Terça': { total: 0, occupied: 0 },
        'Quarta': { total: 0, occupied: 0 },
        'Quinta': { total: 0, occupied: 0 },
        'Sexta': { total: 0, occupied: 0 },
        'Sábado': { total: 0, occupied: 0 },
      };

      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

      (appointments || []).forEach(apt => {
        const date = new Date(apt.start_time);
        const dayName = dayNames[date.getDay()];
        
        if (dayOccupancy[dayName]) {
          dayOccupancy[dayName].total += 1;
          if (apt.status !== 'cancelled') {
            dayOccupancy[dayName].occupied += 1;
          }
        }
      });

      const occupancyByDay = Object.entries(dayOccupancy).map(([day, data]) => ({
        day,
        rate: data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0,
        appointments: data.occupied,
      }));

      const validDays = occupancyByDay.filter(d => d.rate > 0);
      const averageOccupancy = validDays.length > 0
        ? Math.round(validDays.reduce((sum, d) => sum + d.rate, 0) / validDays.length)
        : 0;

      return {
        period: { startDate, endDate },
        occupancyByDay,
        averageOccupancy,
      } as OccupancyReport;
    },
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
}

// Helpers
function getPeriodDates(period: string): { startDate: string; endDate: string } {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return {
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
  };
}

async function getRevenueChart(
  startDate: string,
  endDate: string
): Promise<{ date: string; revenue: number }[]> {
  const { data } = await supabase
    .from('payments')
    .select('amount, paid_at')
    .eq('status', 'completed')
    .gte('paid_at', startDate)
    .lte('paid_at', endDate);

  const revenueByDate: Record<string, number> = {};
  (data || []).forEach((p: { amount?: number; paid_at?: string }) => {
    const date = p.paid_at?.split('T')[0];
    if (date) {
      revenueByDate[date] = (revenueByDate[date] || 0) + (p.amount || 0);
    }
  });

  return Object.entries(revenueByDate)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Hook para exportar relatório em PDF
export function useExportReport() {
  const exportToPDF = async (
    reportType: string,
    data: FinancialReport | Record<string, unknown>,
    fileName: string
  ) => {
    // Importar jspdf dinamicamente
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`Relatório: ${reportType}`, 20, 20);

    doc.setFontSize(12);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);

    // Adicionar dados baseado no tipo
    let y = 50;
    
    if (reportType === 'Financeiro' && data as FinancialReport) {
      const report = data as FinancialReport;
      doc.text(`Receita Total: R$ ${report.totalRevenue.toFixed(2)}`, 20, y);
      y += 10;
      doc.text(`Taxa de Inadimplência: ${report.delinquencyRate}%`, 20, y);
      y += 20;
      
      doc.text('Receita por Método:', 20, y);
      y += 10;
      Object.entries(report.revenueByMethod).forEach(([method, value]) => {
        doc.text(`  ${method}: R$ ${value.toFixed(2)}`, 20, y);
        y += 8;
      });
    }

    doc.save(`${fileName}.pdf`);
  };

  return { exportToPDF };
}

