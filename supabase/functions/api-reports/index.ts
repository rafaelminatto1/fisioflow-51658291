import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  successResponse,
  errorResponse,
  optionsResponse,
  createSupabaseClient,
  validateAuth,
  isValidUUID,
  methodNotAllowed,
  logRequest,
  handleSupabaseError,
} from '../_shared/api-helpers.ts';
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limit.ts';

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  logRequest(req, 'Reports API');

  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  if (req.method !== 'GET') {
    return methodNotAllowed(['GET']);
  }

  // Rate limiting
  const rateLimitResult = await checkRateLimit(req, 'api-reports', { maxRequests: 60, windowMinutes: 1 });
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, {});
  }

  // Autenticação
  const { user, error: authError } = await validateAuth(req);
  if (authError) return authError;

  const supabase = createSupabaseClient(req);

  try {
    // Rota: GET /api-reports/dashboard
    if (pathname.endsWith('/dashboard')) {
      return await getDashboardKPIs(url, supabase, user!.organization_id);
    }

    // Rota: GET /api-reports/financial
    if (pathname.endsWith('/financial')) {
      return await getFinancialReport(url, supabase, user!.organization_id);
    }

    // Rota: GET /api-reports/patient/:patientId/evolution
    const evolutionMatch = pathname.match(/\/patient\/([^/]+)\/evolution/);
    if (evolutionMatch) {
      const patientId = evolutionMatch[1];
      if (!isValidUUID(patientId)) {
        return errorResponse('ID de paciente inválido', 400);
      }
      return await getPatientEvolution(supabase, patientId, user!.organization_id);
    }

    // Rota: GET /api-reports/occupancy
    if (pathname.endsWith('/occupancy')) {
      return await getOccupancyReport(url, supabase, user!.organization_id);
    }

    // Rota: GET /api-reports/therapists
    if (pathname.endsWith('/therapists')) {
      return await getTherapistReport(url, supabase, user!.organization_id);
    }

    return errorResponse('Rota não encontrada', 404);
  } catch (error) {
    console.error('Reports API Error:', error);
    return errorResponse('Erro interno do servidor', 500);
  }
});

// ========== DASHBOARD KPIs ==========
async function getDashboardKPIs(url: URL, supabase: any, organizationId?: string) {
  const period = url.searchParams.get('period') || 'month';
  
  const { startDate, endDate } = getPeriodDates(period);

  // Pacientes ativos
  let patientsQuery = supabase
    .from('patients')
    .select('id', { count: 'exact' })
    .eq('is_active', true);
  
  if (organizationId) {
    patientsQuery = patientsQuery.eq('organization_id', organizationId);
  }

  const { count: activePatients } = await patientsQuery;

  // Receita do período
  let revenueQuery = supabase
    .from('payments')
    .select('amount')
    .eq('status', 'completed')
    .gte('paid_at', startDate)
    .lte('paid_at', endDate);

  if (organizationId) {
    revenueQuery = revenueQuery.eq('organization_id', organizationId);
  }

  const { data: payments } = await revenueQuery;
  const monthlyRevenue = (payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  // Agendamentos do período
  let appointmentsQuery = supabase
    .from('appointments')
    .select('id, status')
    .gte('start_time', startDate)
    .lte('start_time', endDate);

  if (organizationId) {
    appointmentsQuery = appointmentsQuery.eq('organization_id', organizationId);
  }

  const { data: appointments } = await appointmentsQuery;
  
  const totalAppointments = appointments?.length || 0;
  const completedAppointments = appointments?.filter((a: any) => a.status === 'completed').length || 0;
  const noShowAppointments = appointments?.filter((a: any) => a.status === 'no_show').length || 0;
  const confirmedAppointments = appointments?.filter((a: any) => ['confirmed', 'completed'].includes(a.status)).length || 0;

  const occupancyRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;
  const noShowRate = totalAppointments > 0 ? (noShowAppointments / totalAppointments) * 100 : 0;
  const confirmationRate = totalAppointments > 0 ? (confirmedAppointments / totalAppointments) * 100 : 0;

  // Agendamentos de hoje
  const today = new Date().toISOString().split('T')[0];
  let todayQuery = supabase
    .from('appointments')
    .select('id', { count: 'exact' })
    .gte('start_time', `${today}T00:00:00`)
    .lt('start_time', `${today}T23:59:59`)
    .neq('status', 'cancelled');

  if (organizationId) {
    todayQuery = todayQuery.eq('organization_id', organizationId);
  }

  const { count: appointmentsToday } = await todayQuery;

  // Gráfico de receita (últimos 7/30 dias)
  const revenueChart = await getRevenueChart(supabase, startDate, endDate, organizationId);

  return successResponse({
    activePatients: activePatients || 0,
    monthlyRevenue,
    occupancyRate: Math.round(occupancyRate * 10) / 10,
    noShowRate: Math.round(noShowRate * 10) / 10,
    confirmationRate: Math.round(confirmationRate * 10) / 10,
    npsScore: 8.5, // TODO: Implementar cálculo real de NPS
    appointmentsToday: appointmentsToday || 0,
    revenueChart,
  });
}

// ========== FINANCIAL REPORT ==========
async function getFinancialReport(url: URL, supabase: any, organizationId?: string) {
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  if (!startDate || !endDate) {
    return errorResponse('startDate e endDate são obrigatórios', 400);
  }

  // Receitas
  let revenueQuery = supabase
    .from('payments')
    .select('amount, method, patient_id')
    .eq('status', 'completed')
    .gte('paid_at', startDate)
    .lte('paid_at', endDate + 'T23:59:59');

  if (organizationId) {
    revenueQuery = revenueQuery.eq('organization_id', organizationId);
  }

  const { data: payments } = await revenueQuery;

  const totalRevenue = (payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  // Receita por método
  const revenueByMethod: Record<string, number> = {};
  (payments || []).forEach((p: any) => {
    const method = p.method || 'outros';
    revenueByMethod[method] = (revenueByMethod[method] || 0) + (p.amount || 0);
  });

  // Receita por terapeuta
  let sessionsQuery = supabase
    .from('sessions')
    .select(`
      therapist_id,
      therapist:profiles(id, name),
      appointment:appointments(
        payments(amount, status)
      )
    `)
    .eq('status', 'completed')
    .gte('started_at', startDate)
    .lte('started_at', endDate + 'T23:59:59');

  if (organizationId) {
    sessionsQuery = sessionsQuery.eq('organization_id', organizationId);
  }

  const { data: sessions } = await sessionsQuery;

  const revenueByTherapist: { therapistId: string; therapistName: string; revenue: number; sessions: number }[] = [];
  const therapistMap: Record<string, { name: string; revenue: number; sessions: number }> = {};

  (sessions || []).forEach((s: any) => {
    const therapistId = s.therapist_id;
    const therapistName = s.therapist?.name || 'Não atribuído';
    
    if (!therapistMap[therapistId]) {
      therapistMap[therapistId] = { name: therapistName, revenue: 0, sessions: 0 };
    }
    therapistMap[therapistId].sessions += 1;

    // Soma pagamentos relacionados
    const appointmentPayments = s.appointment?.payments || [];
    appointmentPayments.forEach((p: any) => {
      if (p.status === 'completed') {
        therapistMap[therapistId].revenue += p.amount || 0;
      }
    });
  });

  Object.entries(therapistMap).forEach(([id, data]) => {
    revenueByTherapist.push({
      therapistId: id,
      therapistName: data.name,
      revenue: data.revenue,
      sessions: data.sessions,
    });
  });

  // Taxa de inadimplência
  let pendingQuery = supabase
    .from('payments')
    .select('amount')
    .eq('status', 'pending')
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59');

  if (organizationId) {
    pendingQuery = pendingQuery.eq('organization_id', organizationId);
  }

  const { data: pendingPayments } = await pendingQuery;
  const totalPending = (pendingPayments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const delinquencyRate = (totalRevenue + totalPending) > 0 
    ? (totalPending / (totalRevenue + totalPending)) * 100 
    : 0;

  return successResponse({
    totalRevenue,
    totalExpenses: 0, // TODO: Implementar despesas
    netIncome: totalRevenue,
    revenueByMethod,
    revenueByTherapist: revenueByTherapist.sort((a, b) => b.revenue - a.revenue),
    delinquencyRate: Math.round(delinquencyRate * 10) / 10,
  });
}

// ========== PATIENT EVOLUTION REPORT ==========
async function getPatientEvolution(supabase: any, patientId: string, organizationId?: string) {
  // Dados do paciente
  let patientQuery = supabase
    .from('patients')
    .select('id, name')
    .eq('id', patientId);

  if (organizationId) {
    patientQuery = patientQuery.eq('organization_id', organizationId);
  }

  const { data: patient, error: patientError } = await patientQuery.single();

  if (patientError || !patient) {
    return errorResponse('Paciente não encontrado', 404);
  }

  // Sessões do paciente
  let sessionsQuery = supabase
    .from('sessions')
    .select(`
      id,
      eva_score,
      started_at,
      completed_at
    `)
    .eq('patient_id', patientId)
    .eq('status', 'completed')
    .order('started_at', { ascending: true });

  if (organizationId) {
    sessionsQuery = sessionsQuery.eq('organization_id', organizationId);
  }

  const { data: sessions } = await sessionsQuery;

  const totalSessions = sessions?.length || 0;

  // Evolução da dor (EVA)
  const painEvolution = (sessions || [])
    .filter((s: any) => s.eva_score !== null)
    .map((s: any) => ({
      date: s.started_at?.split('T')[0],
      averageEva: s.eva_score,
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

  // Aderência a exercícios (simplificado)
  const exerciseAdherence = 75; // TODO: Calcular baseado em dados reais

  // Recomendações baseadas na evolução
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

  return successResponse({
    patientId,
    patientName: patient.name,
    totalSessions,
    treatmentDuration,
    painEvolution,
    exerciseAdherence,
    recommendations,
  });
}

// ========== OCCUPANCY REPORT ==========
async function getOccupancyReport(url: URL, supabase: any, organizationId?: string) {
  const startDate = url.searchParams.get('startDate') || new Date().toISOString().split('T')[0];
  const endDate = url.searchParams.get('endDate') || new Date().toISOString().split('T')[0];

  let query = supabase
    .from('appointments')
    .select('start_time, end_time, status, therapist_id')
    .gte('start_time', startDate)
    .lte('start_time', endDate + 'T23:59:59');

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data: appointments, error } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  // Calcular ocupação por dia da semana
  const dayOccupancy: Record<string, { total: number; occupied: number }> = {
    'Segunda': { total: 0, occupied: 0 },
    'Terça': { total: 0, occupied: 0 },
    'Quarta': { total: 0, occupied: 0 },
    'Quinta': { total: 0, occupied: 0 },
    'Sexta': { total: 0, occupied: 0 },
    'Sábado': { total: 0, occupied: 0 },
  };

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  (appointments || []).forEach((apt: any) => {
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

  return successResponse({
    period: { startDate, endDate },
    occupancyByDay,
    averageOccupancy: Math.round(
      occupancyByDay.reduce((sum, d) => sum + d.rate, 0) / occupancyByDay.filter(d => d.rate > 0).length || 0
    ),
  });
}

// ========== THERAPIST REPORT ==========
async function getTherapistReport(url: URL, supabase: any, organizationId?: string) {
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  if (!startDate || !endDate) {
    return errorResponse('startDate e endDate são obrigatórios', 400);
  }

  let query = supabase
    .from('appointments')
    .select(`
      therapist_id,
      therapist:profiles(id, name),
      status
    `)
    .gte('start_time', startDate)
    .lte('start_time', endDate + 'T23:59:59');

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data: appointments, error } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  const therapistStats: Record<string, {
    name: string;
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
  }> = {};

  (appointments || []).forEach((apt: any) => {
    const id = apt.therapist_id || 'unassigned';
    const name = apt.therapist?.name || 'Não atribuído';

    if (!therapistStats[id]) {
      therapistStats[id] = { name, total: 0, completed: 0, cancelled: 0, noShow: 0 };
    }

    therapistStats[id].total += 1;
    if (apt.status === 'completed') therapistStats[id].completed += 1;
    if (apt.status === 'cancelled') therapistStats[id].cancelled += 1;
    if (apt.status === 'no_show') therapistStats[id].noShow += 1;
  });

  const report = Object.entries(therapistStats).map(([id, stats]) => ({
    therapistId: id,
    therapistName: stats.name,
    totalAppointments: stats.total,
    completedAppointments: stats.completed,
    cancelledAppointments: stats.cancelled,
    noShowAppointments: stats.noShow,
    completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
  }));

  return successResponse(report.sort((a, b) => b.totalAppointments - a.totalAppointments));
}

// ========== HELPER FUNCTIONS ==========

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
  supabase: any,
  startDate: string,
  endDate: string,
  organizationId?: string
): Promise<{ date: string; revenue: number }[]> {
  let query = supabase
    .from('payments')
    .select('amount, paid_at')
    .eq('status', 'completed')
    .gte('paid_at', startDate)
    .lte('paid_at', endDate);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data } = await query;

  // Agrupar por dia
  const revenueByDate: Record<string, number> = {};
  (data || []).forEach((p: any) => {
    const date = p.paid_at?.split('T')[0];
    if (date) {
      revenueByDate[date] = (revenueByDate[date] || 0) + (p.amount || 0);
    }
  });

  return Object.entries(revenueByDate)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

