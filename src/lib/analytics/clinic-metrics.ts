/**
 * Biblioteca de métricas e analytics para clínica
 * @module lib/analytics/clinic-metrics
 */
import {

  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  differenceInDays,
  subDays,
  format,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// =====================================================================
// TYPES
// =====================================================================

export interface AppointmentMetrics {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  scheduled: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
}

export interface RevenueMetrics {
  total: number;
  collected: number;
  pending: number;
  overdue: number;
  averagePerAppointment: number;
  growthRate: number;
  previousPeriodTotal?: number; // Total do período anterior para contexto
}

export interface PatientMetrics {
  total: number;
  newPatients: number;
  activePatients: number;
  inactivePatients: number;
  retentionRate: number;
  churnRate: number;
}

export interface TherapistMetrics {
  total: number;
  active: number;
  averageAppointmentsPerDay: number;
  averageRevenuePerDay: number;
  occupancyRate: number;
}

export interface TimeSlotMetrics {
  totalSlots: number;
  occupiedSlots: number;
  availableSlots: number;
  occupancyRate: number;
  peakHours: string[];
  lowDemandHours: string[];
}

export interface ClinicDashboardMetrics {
  appointments: AppointmentMetrics;
  revenue: RevenueMetrics;
  patients: PatientMetrics;
  therapists: TherapistMetrics;
  timeSlots: TimeSlotMetrics;
  period: {
    start: Date;
    end: Date;
    days: number;
  };
}

export interface TrendData {
  date: string;
  value: number;
  label: string;
}

export interface ComparisonMetrics {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'neutral';
}

// =====================================================================
// APPOINTMENT METRICS
// =====================================================================

/**
 * Calcula métricas de agendamentos
 */
export function calculateAppointmentMetrics(
  appointments: Array<{
    date: string;
    time: string;
    status: string;
    duration?: number;
  }>,
  startDate: Date,
  endDate: Date
): AppointmentMetrics {
  const filtered = appointments.filter(apt => {
    const aptDate = parseISO(apt.date);
    return aptDate >= startOfDay(startDate) && aptDate <= endOfDay(endDate);
  });

  const completed = filtered.filter(a => a.status === 'completed').length;
  const cancelled = filtered.filter(a => a.status === 'cancelled').length;
  const noShow = filtered.filter(a => a.status === 'no_show').length;
  const scheduled = filtered.filter(a => a.status === 'scheduled').length;

  const total = filtered.length;
  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0;
  const noShowRate = total > 0 ? (noShow / total) * 100 : 0;

  return {
    total,
    completed,
    cancelled,
    noShow,
    scheduled,
    completionRate: Math.round(completionRate * 10) / 10,
    cancellationRate: Math.round(cancellationRate * 10) / 10,
    noShowRate: Math.round(noShowRate * 10) / 10,
  };
}

/**
 * Calcula métricas de comparação de agendamentos
 */
export function compareAppointmentMetrics(
  currentPeriod: AppointmentMetrics,
  previousPeriod: AppointmentMetrics
): ComparisonMetrics {
  const change = currentPeriod.total - previousPeriod.total;
  const changePercent = previousPeriod.total > 0
    ? ((change / previousPeriod.total) * 100)
    : 0;

  let trend: 'up' | 'down' | 'neutral' = 'neutral';
  if (changePercent > 5) trend = 'up';
  if (changePercent < -5) trend = 'down';

  return {
    current: currentPeriod.total,
    previous: previousPeriod.total,
    change,
    changePercent: Math.round(changePercent * 10) / 10,
    trend,
  };
}

// =====================================================================
// REVENUE METRICS
// =====================================================================

/**
 * Calcula métricas de receita
 */
export function calculateRevenueMetrics(
  payments: Array<{
    date: string;
    amount: number;
    status: 'paid' | 'pending' | 'overdue';
    appointment_id?: string;
  }>,
  startDate: Date,
  endDate: Date
): RevenueMetrics {
  const filtered = payments.filter(p => {
    const payDate = parseISO(p.date);
    return payDate >= startOfDay(startDate) && payDate <= endOfDay(endDate);
  });

  const total = filtered.reduce((sum, p) => sum + p.amount, 0);
  const collected = filtered.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const pending = filtered.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const overdue = filtered.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);

  const appointmentCount = new Set(filtered.filter(p => p.appointment_id).map(p => p.appointment_id)).size;
  const averagePerAppointment = appointmentCount > 0 ? total / appointmentCount : 0;

  // Calculate growth rate by comparing with previous period
  // Previous period is the same duration immediately before startDate
  const periodDuration = differenceInDays(endDate, startDate) + 1;
  const previousPeriodStart = subDays(startDate, periodDuration);
  const previousPeriodEnd = subDays(startDate, 1);

  const previousPeriodPayments = payments.filter(p => {
    const payDate = parseISO(p.date);
    return payDate >= startOfDay(previousPeriodStart) && payDate <= endOfDay(previousPeriodEnd);
  });

  const previousPeriodTotal = previousPeriodPayments.reduce((sum, p) => sum + p.amount, 0);

  // Calculate growth rate as percentage
  let growthRate = 0;
  if (previousPeriodTotal > 0) {
    growthRate = ((total - previousPeriodTotal) / previousPeriodTotal) * 100;
  } else if (total > 0) {
    // If previous period was 0 and current is positive, it's infinite growth (represented as 100%)
    growthRate = 100;
  }

  return {
    total: Math.round(total * 100) / 100,
    collected: Math.round(collected * 100) / 100,
    pending: Math.round(pending * 100) / 100,
    overdue: Math.round(overdue * 100) / 100,
    averagePerAppointment: Math.round(averagePerAppointment * 100) / 100,
    growthRate: Math.round(growthRate * 10) / 10,
    previousPeriodTotal: Math.round(previousPeriodTotal * 100) / 100, // Include for transparency
  };
}

// =====================================================================
// PATIENT METRICS
// =====================================================================

/**
 * Calcula métricas de pacientes
 */
export function calculatePatientMetrics(
  patients: Array<{
    id: string;
    created_at: string;
    last_appointment?: string;
    status?: 'active' | 'inactive';
  }>,
  appointments: Array<{ patient_id: string; date: string; status: string }>,
  startDate: Date,
  endDate: Date
): PatientMetrics {
  const start = startOfDay(startDate);
  const end = endOfDay(endDate);

  // Total patients
  const total = patients.length;

  // New patients in period
  const newPatients = patients.filter(p => {
    const createdAt = parseISO(p.created_at);
    return createdAt >= start && createdAt <= end;
  }).length;

  // Active patients (had appointment in last 90 days)
  const ninetyDaysAgo = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
  const activePatients = patients.filter(p => {
    if (p.last_appointment) {
      const lastApt = parseISO(p.last_appointment);
      return lastApt >= ninetyDaysAgo;
    }
    return false;
  }).length;

  const inactivePatients = total - activePatients;

  // Retention rate (patients who had more than one appointment)
  const patientAppointmentCounts = new Map<string, number>();
  appointments.filter(a => a.status === 'completed').forEach(apt => {
    patientAppointmentCounts.set(
      apt.patient_id,
      (patientAppointmentCounts.get(apt.patient_id) || 0) + 1
    );
  });

  const returningPatients = Array.from(patientAppointmentCounts.values()).filter(c => c > 1).length;
  const retentionRate = total > 0 ? (returningPatients / total) * 100 : 0;

  // Churn rate (patients with no appointments in 90 days but had before)
  const churnPatients = patients.filter(p => {
    if (!p.last_appointment) return false;
    const lastApt = parseISO(p.last_appointment);
    const createdAt = parseISO(p.created_at);
    return lastApt < ninetyDaysAgo && lastApt > createdAt;
  }).length;

  const churnRate = total > 0 ? (churnPatients / total) * 100 : 0;

  return {
    total,
    newPatients,
    activePatients,
    inactivePatients,
    retentionRate: Math.round(retentionRate * 10) / 10,
    churnRate: Math.round(churnRate * 10) / 10,
  };
}

// =====================================================================
// THERAPIST METRICS
// =====================================================================

/**
 * Calcula métricas de terapeutas
 */
export function calculateTherapistMetrics(
  therapists: Array<{ id: string; name: string }>,
  appointments: Array<{
    therapist_id: string;
    date: string;
    status: string;
    amount?: number;
  }>,
  startDate: Date,
  endDate: Date
): TherapistMetrics {
  const start = startOfDay(startDate);
  const end = endOfDay(endDate);
  const days = Math.max(1, differenceInDays(end, start) + 1);

  const filtered = appointments.filter(apt => {
    const aptDate = parseISO(apt.date);
    return aptDate >= start && aptDate <= end;
  });

  const total = therapists.length;
  const active = new Set(filtered.map(a => a.therapist_id)).size;

  const totalAppointments = filtered.filter(a => a.status === 'completed').length;
  const averageAppointmentsPerDay = (totalAppointments / days) / Math.max(1, active);

  const totalRevenue = filtered.reduce((sum, a) => sum + (a.amount || 0), 0);
  const averageRevenuePerDay = totalRevenue / days / Math.max(1, active);

  // Occupancy rate (completed / completed + cancelled + no_show)
  const completed = filtered.filter(a => a.status === 'completed').length;
  const missed = filtered.filter(a => a.status === 'cancelled' || a.status === 'no_show').length;
  const occupancyRate = (completed + missed) > 0
    ? (completed / (completed + missed)) * 100
    : 0;

  return {
    total,
    active,
    averageAppointmentsPerDay: Math.round(averageAppointmentsPerDay * 10) / 10,
    averageRevenuePerDay: Math.round(averageRevenuePerDay * 100) / 100,
    occupancyRate: Math.round(occupancyRate * 10) / 10,
  };
}

// =====================================================================
// TIME SLOT METRICS
// =====================================================================

/**
 * Calcula métricas de horários
 */
export function calculateTimeSlotMetrics(
  appointments: Array<{ date: string; time: string; status: string }>,
  startDate: Date,
  endDate: Date,
  businessHours: { start: number; end: number; slotDuration: number }
): TimeSlotMetrics {
  const start = startOfDay(startDate);
  const end = endOfDay(endDate);
  const days = Math.max(1, differenceInDays(end, start) + 1);

  // Calculate total possible slots
  const hoursPerDay = businessHours.end - businessHours.start;
  const slotsPerHour = 60 / businessHours.slotDuration;
  const slotsPerDay = hoursPerDay * slotsPerHour;
  const totalSlots = days * slotsPerDay;

  // Calculate occupied slots (completed appointments)
  const occupiedSlots = appointments.filter(apt => {
    const aptDate = parseISO(apt.date);
    return aptDate >= start && aptDate <= end && apt.status === 'completed';
  }).length;

  const availableSlots = totalSlots - occupiedSlots;
  const occupancyRate = totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0;

  // Find peak and low demand hours
  const hourCounts = new Map<number, number>();
  appointments.forEach(apt => {
    const [hour] = apt.time.split(':').map(Number);
    if (apt.status === 'completed') {
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }
  });

  const sortedHours = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1]);
  const peakHours = sortedHours.slice(0, 3).map(([h]) => `${String(h).padStart(2, '0')}:00`);
  const lowDemandHours = sortedHours.slice(-3).reverse().map(([h]) => `${String(h).padStart(2, '0')}:00`);

  return {
    totalSlots,
    occupiedSlots,
    availableSlots,
    occupancyRate: Math.round(occupancyRate * 10) / 10,
    peakHours,
    lowDemandHours,
  };
}

// =====================================================================
// DASHBOARD METRICS
// =====================================================================

/**
 * Gera métricas completas do dashboard
 */
export function generateDashboardMetrics(
  appointments: Array<{ date: string; time: string; status: string; duration?: number; therapist_id?: string }>,
  patients: Array<{ id: string; created_at: string; last_appointment?: string; status?: string }>,
  therapists: Array<{ id: string; name: string }>,
  payments: Array<{ date: string; amount: number; status: string; appointment_id?: string }>,
  startDate: Date,
  endDate: Date,
  businessHours: { start: number; end: number; slotDuration: number }
): ClinicDashboardMetrics {
  return {
    appointments: calculateAppointmentMetrics(appointments, startDate, endDate),
    revenue: calculateRevenueMetrics(payments, startDate, endDate),
    patients: calculatePatientMetrics(patients, appointments, startDate, endDate),
    therapists: calculateTherapistMetrics(therapists, appointments, startDate, endDate),
    timeSlots: calculateTimeSlotMetrics(appointments, startDate, endDate, businessHours),
    period: {
      start,
      end: endDate,
      days: differenceInDays(endDate, startDate) + 1,
    },
  };
}

// =====================================================================
// TREND DATA GENERATION
// =====================================================================

/**
 * Gera dados de tendência para gráficos
 */
export function generateTrendData(
  data: Array<{ date: string; value?: number }>,
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month' = 'day'
): TrendData[] {
  const result: TrendData[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const key = format(current, 'yyyy-MM-dd');

    let label: string;
    if (groupBy === 'day') {
      label = format(current, 'dd/MM', { locale: ptBR });
    } else if (groupBy === 'week') {
      label = format(current, "'Sem' w", { locale: ptBR });
    } else {
      label = format(current, 'MMM/yyyy', { locale: ptBR });
    }

    // Aggregate values for this period
    const periodData = data.filter(d => {
      const dDate = parseISO(d.date);
      if (groupBy === 'day') {
        return format(dDate, 'yyyy-MM-dd') === key;
      } else if (groupBy === 'week') {
        const dWeek = format(dDate, 'yyyy-ww');
        const cWeek = format(current, 'yyyy-ww');
        return dWeek === cWeek;
      } else {
        const dMonth = format(dDate, 'yyyy-MM');
        const cMonth = format(current, 'yyyy-MM');
        return dMonth === cMonth;
      }
    });

    const value = periodData.reduce((sum, d) => sum + (d.value || 1), 0);

    result.push({
      date: key,
      value,
      label,
    });

    // Advance to next period
    if (groupBy === 'day') {
      current.setDate(current.getDate() + 1);
    } else if (groupBy === 'week') {
      current.setDate(current.getDate() + 7);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
  }

  return result;
}

// =====================================================================
// EXPORTS
// =====================================================================

export default {
  calculateAppointmentMetrics,
  compareAppointmentMetrics,
  calculateRevenueMetrics,
  calculatePatientMetrics,
  calculateTherapistMetrics,
  calculateTimeSlotMetrics,
  generateDashboardMetrics,
  generateTrendData,
};
