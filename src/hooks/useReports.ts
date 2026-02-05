/**
 * useReports - Migrated to Firebase
 */

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, getCountFromServer, query as firestoreQuery, where, orderBy, limit } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { PatientHelpers } from '@/types';
import { db } from '@/integrations/firebase/app';


// ============================================================================
// TYPES
// ============================================================================

interface SurveyData {
  nps_score?: number | null;
  responded_at?: string | null;
  [key: string]: unknown;
}

interface PaymentData {
  amount?: number;
  date?: string;
  status?: string;
  [key: string]: unknown;
}

interface AppointmentData {
  status?: string;
  date?: string;
  time?: string;
  [key: string]: unknown;
}

interface SessionData {
  pain_level?: number;
  functional_score?: number;
  notes?: string;
  [key: string]: unknown;
}

interface EvolutionSessionData {
  eva_score?: number | null;
  session_date?: string;
  [key: string]: unknown;
}

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

// Helper function to convert Firestore doc
const convertDoc = <T extends Record<string, unknown>>(doc: { id: string; data: () => T }): T & { id: string } => {
  return { id: doc.id, ...doc.data() };
};

// Função auxiliar para calcular NPS
async function calculateNPS(): Promise<number> {
  try {
    const q = firestoreQuery(
      collection(db, 'satisfaction_surveys')
    );
    const snapshot = await getDocs(q);
    const surveys = snapshot.docs.map(doc => doc.data());

    if (!surveys || surveys.length === 0) {
      return 0;
    }

    const total = surveys.length;
    const promotores = surveys.filter((s: SurveyData) => s.nps_score !== null && s.nps_score !== undefined && s.nps_score >= 9).length;
    const detratores = surveys.filter((s: SurveyData) => s.nps_score !== null && s.nps_score !== undefined && s.nps_score <= 6).length;

    const nps = total > 0 ? Math.round(((promotores - detratores) / total) * 100) : 0;
    return nps;
  } catch (error) {
    logger.error('Erro ao calcular NPS', error, 'useReports');
    return 0;
  }
}

// Função auxiliar para calcular adesão de exercícios (baseada em dados reais)
async function calculateExerciseAdherence(patientId?: string): Promise<number> {
  try {
    if (!patientId) return 0;

    // 1. Tentar buscar logs de exercícios (preferencial)
    // Tenta primeiro com patient_id (padrão banco)
    const logsQuery = firestoreQuery(
      collection(db, 'exercise_logs'),
      where('patient_id', '==', patientId),
      orderBy('complete_date', 'desc'),
      limit(100)
    );

    let logsSnapshot;
    try {
      logsSnapshot = await getDocs(logsQuery);
    } catch (e) {
      // Se falhar (ex: coleção não existe ou erro de índice), tenta fallback
      logsSnapshot = { empty: true, size: 0, docs: [] };
    }

    if (!logsSnapshot.empty && logsSnapshot.size > 0) {
      const logs = logsSnapshot.docs.map(d => d.data());
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      const recentLogs = logs.filter((l: any) => {
        const dateStr = l.complete_date || l.timestamp || l.created_at;
        const date = dateStr ? new Date(dateStr) : null;
        return date && date >= thirtyDaysAgo;
      });

      // Se tem logs recentes, calculamos uma pontuação baseada na consistência (meta: 3x/semana = 12/mês)
      if (recentLogs.length > 0) {
        const adherence = Math.min(100, (recentLogs.length / 12) * 100);
        return Math.round(adherence);
      }
    }

    // 2. Fallback: Taxa de Comparecimento (Attendance Rate) usando Agendamentos
    // (Realizado / (Realizado + Faltou + Cancelado))
    const appointmentsQ = firestoreQuery(
      collection(db, 'appointments'),
      where('patient_id', '==', patientId),
      where('start_time', '<=', new Date().toISOString()),
      orderBy('start_time', 'desc'),
      limit(50)
    );

    const apptSnapshot = await getDocs(appointmentsQ);

    if (apptSnapshot.empty) {
      // Se não tem agendamentos, tenta usar sessões antigas como último recurso (lógica original melhorada)
      const sessionsQ = firestoreQuery(
        collection(db, 'sessions'),
        where('patient_id', '==', patientId),
        where('status', '==', 'completed'),
        limit(10)
      );
      const sessionSnap = await getDocs(sessionsQ);
      return sessionSnap.size > 0 ? 50 : 0; // Valor base se tem histórico mas sem agendamentos recentes
    }

    const appts = apptSnapshot.docs.map(doc => doc.data());

    const completed = appts.filter((a: any) =>
      ['concluido', 'atendido', 'completed', 'realizado'].includes((a.status || '').toLowerCase())
    ).length;

    const missed = appts.filter((a: any) =>
      ['faltou', 'cancelado', 'no_show', 'cancelled', 'missed'].includes((a.status || '').toLowerCase())
    ).length;

    const total = completed + missed;

    if (total === 0) return 0;

    return Math.round((completed / total) * 100);

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
      const activePatientsQ = firestoreQuery(
        collection(db, 'patients'),
        where('is_active', '==', true)
      );
      const activePatientsSnap = await getCountFromServer(activePatientsQ);
      const activePatients = activePatientsSnap.data().count;

      // Receita do período
      const paymentsQ = firestoreQuery(
        collection(db, 'payments'),
        where('status', '==', 'paid'),
        where('paid_at', '>=', startDate),
        where('paid_at', '<=', endDate)
      );
      const paymentsSnap = await getDocs(paymentsQ);
      const payments = paymentsSnap.docs.map(doc => doc.data());

      const monthlyRevenue = payments.reduce((sum: number, p: PaymentData) => sum + (p.amount || 0), 0);

      // Agendamentos do período
      const appointmentsQ = firestoreQuery(
        collection(db, 'appointments'),
        where('start_time', '>=', startDate),
        where('start_time', '<=', endDate)
      );
      const appointmentsSnap = await getDocs(appointmentsQ);
      const appointments = appointmentsSnap.docs.map(doc => doc.data());

      const totalAppointments = appointments.length;
      const completedAppointments = appointments.filter((a: AppointmentData) => a.status === 'atendido').length;
      const noShowAppointments = appointments.filter((a: AppointmentData) => a.status === 'faltou').length;
      const confirmedAppointments = appointments.filter((a: AppointmentData) => a.status ? ['confirmado', 'atendido'].includes(a.status) : false).length;

      const occupancyRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;
      const noShowRate = totalAppointments > 0 ? (noShowAppointments / totalAppointments) * 100 : 0;
      const confirmationRate = totalAppointments > 0 ? (confirmedAppointments / totalAppointments) * 100 : 0;

      // Agendamentos de hoje
      const today = new Date().toISOString().split('T')[0];
      const todayQ = firestoreQuery(
        collection(db, 'appointments'),
        where('start_time', '>=', `${today}T00:00:00`),
        where('start_time', '<=', `${today}T23:59:59`)
      );
      const todaySnap = await getCountFromServer(todayQ);
      const appointmentsToday = todaySnap.data().count;

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
      const paymentsQ = firestoreQuery(
        collection(db, 'payments'),
        where('status', '==', 'completed'),
        where('paid_at', '>=', startDate),
        where('paid_at', '<=', endDate + 'T23:59:59')
      );
      const paymentsSnap = await getDocs(paymentsQ);
      const payments = paymentsSnap.docs.map(doc => doc.data());

      const totalRevenue = payments.reduce((sum: number, p: PaymentData) => sum + (p.amount || 0), 0);

      // Por método
      const revenueByMethod: Record<string, number> = {};
      payments.forEach((p: PaymentData) => {
        const method = (p.method as string | undefined) || 'outros';
        revenueByMethod[method] = (revenueByMethod[method] || 0) + (p.amount || 0);
      });

      // Por terapeuta
      const sessionsQ = firestoreQuery(
        collection(db, 'sessions'),
        where('status', '==', 'completed'),
        where('started_at', '>=', startDate),
        where('started_at', '<=', endDate + 'T23:59:59')
      );
      const sessionsSnap = await getDocs(sessionsQ);
      const sessions = sessionsSnap.docs.map(doc => doc.data());

      const therapistMap: Record<string, { name: string; revenue: number; sessions: number }> = {};
      sessions.forEach((s: SessionData) => {
        const id = (s.therapist_id as string | undefined) || 'unassigned';
        const name = (s.therapist_name as string | undefined) || 'Não atribuído';
        if (!therapistMap[id]) {
          therapistMap[id] = { name, revenue: 0, sessions: 0 };
        }
        therapistMap[id].sessions += 1;
      });

      // Estimar receita por terapeuta (dividir proporcional)
      const avgPerSession = sessions.length > 0 ? totalRevenue / sessions.length : 0;
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
      const pendingQ = firestoreQuery(
        collection(db, 'payments'),
        where('status', '==', 'pending'),
        where('created_at', '>=', startDate),
        where('created_at', '<=', endDate + 'T23:59:59')
      );
      const pendingSnap = await getDocs(pendingQ);
      const pendingPayments = pendingSnap.docs.map(doc => doc.data());

      const totalPending = pendingPayments.reduce((sum: number, p: PaymentData) => sum + (p.amount || 0), 0);
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
      const patientQ = firestoreQuery(
        collection(db, 'patients'),
        where('id', '==', patientId),
        limit(1)
      );
      const patientSnap = await getDocs(patientQ);

      if (patientSnap.empty) throw new Error('Paciente não encontrado');
      const patient = convertDoc(patientSnap.docs[0]);

      // Sessões
      const sessionsQ = firestoreQuery(
        collection(db, 'sessions'),
        where('patient_id', '==', patientId),
        where('status', '==', 'completed'),
        orderBy('started_at', 'asc')
      );
      const sessionsSnap = await getDocs(sessionsQ);
      const sessions = sessionsSnap.docs.map(doc => doc.data());

      const totalSessions = sessions.length;

      // Evolução da dor
      const painEvolution = sessions
        .filter((s: EvolutionSessionData) => s.eva_score !== null)
        .map((s: EvolutionSessionData) => ({
          date: (s.session_date as string | undefined)?.split('T')[0] || '',
          averageEva: s.eva_score || 0,
        }));

      // Duração do tratamento
      let treatmentDuration = 'N/A';
      if (sessions.length >= 2) {
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
      const appointmentsQ = firestoreQuery(
        collection(db, 'appointments'),
        where('start_time', '>=', startDate),
        where('start_time', '<=', endDate + 'T23:59:59')
      );
      const appointmentsSnap = await getDocs(appointmentsQ);
      const appointments = appointmentsSnap.docs.map(doc => doc.data());

      const dayOccupancy: Record<string, { total: number; occupied: number }> = {
        'Segunda': { total: 0, occupied: 0 },
        'Terça': { total: 0, occupied: 0 },
        'Quarta': { total: 0, occupied: 0 },
        'Quinta': { total: 0, occupied: 0 },
        'Sexta': { total: 0, occupied: 0 },
        'Sábado': { total: 0, occupied: 0 },
      };

      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

      appointments.forEach((apt: AppointmentData) => {
        const date = new Date(apt.start_time || '');
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
  const q = firestoreQuery(
    collection(db, 'payments'),
    where('status', '==', 'completed'),
    where('paid_at', '>=', startDate),
    where('paid_at', '<=', endDate)
  );
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map(doc => doc.data());

  const revenueByDate: Record<string, number> = {};
  data.forEach((p: PaymentData) => {
    const date = (p.paid_at as string | undefined)?.split('T')[0];
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
        doc.text(`  ${method}: R$ ${(value as number).toFixed(2)}`, 20, y);
        y += 8;
      });
    }

    doc.save(`${fileName}.pdf`);
  };

  return { exportToPDF };
}
