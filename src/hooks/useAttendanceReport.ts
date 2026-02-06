/**
 * useAttendanceReport - Migrated to Firebase
 *
 */

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, doc, getDoc, query as firestoreQuery, where, orderBy, db } from '@/integrations/firebase/app';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizeFirestoreData } from '@/utils/firestoreData';

export type PeriodFilter = 'week' | 'month' | 'quarter' | 'year' | 'custom';
export type StatusFilter = 'all' | 'concluido' | 'faltou' | 'cancelado';

interface AttendanceFilters {
  period: PeriodFilter;
  therapistId?: string;
  status?: StatusFilter;
  startDate?: Date;
  endDate?: Date;
}

interface TherapistAttendance {
  id: string;
  name: string;
  total: number;
  attended: number;
  noShow: number;
  cancelled: number;
  rate: number;
}

interface DayOfWeekData {
  day: string;
  dayIndex: number;
  total: number;
  attended: number;
  noShow: number;
  cancelled: number;
  attendanceRate: number;
  noShowRate: number;
}

interface MonthlyEvolution {
  month: string;
  attendanceRate: number;
  total: number;
}

interface HourlyAnalysis {
  hour: string;
  total: number;
  noShow: number;
  noShowRate: number;
}

interface AppointmentDetail {
  id: string;
  patientName: string;
  patientPhone?: string;
  date: string;
  time: string;
  therapistName: string;
  status: string;
  notes?: string;
}

interface Insight {
  type: 'success' | 'warning' | 'info';
  message: string;
}

export interface AttendanceMetrics {
  totalAppointments: number;
  attended: number;
  noShow: number;
  cancelled: number;
  attendanceRate: number;
  cancellationRate: number;
  noShowRate: number;
  pieChartData: { name: string; value: number; color: string }[];
  dayOfWeekData: DayOfWeekData[];
  monthlyEvolution: MonthlyEvolution[];
  therapistData: TherapistAttendance[];
  hourlyAnalysis: HourlyAnalysis[];
  appointments: AppointmentDetail[];
  insights: Insight[];
}

const DAYS_OF_WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// ============================================================================
// TYPES
// ============================================================================

interface AppointmentFirestore {
  id: string;
  patient_id?: string | null;
  therapist_id?: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface PatientData {
  id: string;
  full_name?: string;
  name?: string;
  phone?: string;
  email?: string;
  [key: string]: unknown;
}

interface UserRole {
  user_id: string;
  role: string;
  [key: string]: unknown;
}

interface AppointmentWithPatient extends AppointmentFirestore {
  patients?: PatientData | null;
}

interface _Profile {
  id: string;
  full_name?: string;
  [key: string]: unknown;
}

const getDateRange = (period: PeriodFilter, startDate?: Date, endDate?: Date) => {
  const today = new Date();

  switch (period) {
    case 'week':
      return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(today), end: endOfMonth(today) };
    case 'quarter':
      return { start: startOfQuarter(today), end: endOfQuarter(today) };
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

export const useAttendanceReport = (filters: AttendanceFilters = { period: 'month' }) => {
  return useQuery({
    queryKey: ['attendance-report', filters.period, filters.therapistId, filters.status, filters.startDate?.toISOString(), filters.endDate?.toISOString()],
    queryFn: async (): Promise<AttendanceMetrics> => {
      const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate);
      const startDateStr = format(start, 'yyyy-MM-dd');
      const endDateStr = format(end, 'yyyy-MM-dd');

      // Build base query
      const baseQuery = firestoreQuery(
        collection(db, 'appointments'),
        where('appointment_date', '>=', startDateStr),
        where('appointment_date', '<=', endDateStr),
        orderBy('appointment_date', 'desc')
      );

      const snapshot = await getDocs(baseQuery);
      let appointmentsList = snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));

      // Apply therapist filter
      if (filters.therapistId && filters.therapistId !== 'all') {
        appointmentsList = appointmentsList.filter((a: AppointmentFirestore) => a.therapist_id === filters.therapistId);
      }

      // Apply status filter
      if (filters.status && filters.status !== 'all') {
        appointmentsList = appointmentsList.filter((a: AppointmentFirestore) => a.status === filters.status);
      }

      // Fetch patient data for all appointments
      const patientIds = appointmentsList
        .map((a: AppointmentFirestore) => a.patient_id)
        .filter((id: string | null): id is string => id !== null);

      const patientMap = new Map<string, PatientData>();
      await Promise.all([...new Set(patientIds)].map(async (patientId) => {
        const patientDoc = await getDoc(doc(db, 'patients', patientId));
        if (patientDoc.exists()) {
          patientMap.set(patientId, {
            id: patientDoc.id,
            ...patientDoc.data(),
          });
        }
      }));

      // Attach patient data to appointments
      appointmentsList = appointmentsList.map((a: AppointmentFirestore): AppointmentWithPatient => ({
        ...a,
        patients: patientMap.get(a.patient_id || '') || null,
      }));

      // Fetch therapist names from Firestore
      const therapistNames = new Map<string, string>();
      const uniqueTherapistIds = [...new Set(appointmentsList.map((a: AppointmentWithPatient) => a.therapist_id).filter((id): id is string => id !== null))];

      await Promise.all(uniqueTherapistIds.map(async (tid) => {
        if (!tid) return;
        const profileDoc = await getDoc(doc(db, 'profiles', tid));
        if (profileDoc.exists()) {
          therapistNames.set(tid, profileDoc.data().full_name || 'Sem nome');
        } else {
          therapistNames.set(tid, 'Não encontrado');
        }
      }));

      // Calculate basic metrics
      const total = appointmentsList.length;
      const attended = appointmentsList.filter((a: AppointmentWithPatient) => a.status === 'concluido').length;
      const noShow = appointmentsList.filter((a: AppointmentWithPatient) => a.status === 'faltou').length;
      const cancelled = appointmentsList.filter((a: AppointmentWithPatient) => a.status === 'cancelado').length;

      const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;
      const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
      const noShowRate = total > 0 ? Math.round((noShow / total) * 100) : 0;

      // Pie chart data
      const pieChartData = [
        { name: 'Realizado', value: attended, color: 'hsl(142, 76%, 36%)' },
        { name: 'Faltou', value: noShow, color: 'hsl(0, 84%, 60%)' },
        { name: 'Cancelado', value: cancelled, color: 'hsl(45, 93%, 47%)' },
      ].filter(d => d.value > 0);

      // Day of week analysis
      const dayOfWeekMap = new Map<number, { total: number; attended: number; noShow: number; cancelled: number }>();
      for (let i = 0; i < 7; i++) {
        dayOfWeekMap.set(i, { total: 0, attended: 0, noShow: 0, cancelled: 0 });
      }

      appointmentsList.forEach((apt: AppointmentWithPatient) => {
        const dayIndex = getDay(new Date(apt.appointment_date + 'T12:00:00'));
        const dayData = dayOfWeekMap.get(dayIndex)!;
        dayData.total++;
        if (apt.status === 'concluido') dayData.attended++;
        if (apt.status === 'faltou') dayData.noShow++;
        if (apt.status === 'cancelado') dayData.cancelled++;
      });

      const dayOfWeekData: DayOfWeekData[] = Array.from(dayOfWeekMap.entries())
        .map(([dayIndex, data]) => ({
          day: DAYS_OF_WEEK[dayIndex],
          dayIndex,
          ...data,
          attendanceRate: data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0,
          noShowRate: data.total > 0 ? Math.round((data.noShow / data.total) * 100) : 0
        }))
        .sort((a, b) => (a.dayIndex === 0 ? 7 : a.dayIndex) - (b.dayIndex === 0 ? 7 : b.dayIndex));

      // Monthly evolution (last 6 months)
      const monthlyEvolution: MonthlyEvolution[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const monthAppointments = appointmentsList.filter((apt: AppointmentWithPatient) => {
          const aptDate = new Date(apt.appointment_date);
          return aptDate >= monthStart && aptDate <= monthEnd;
        });

        const monthTotal = monthAppointments.length;
        const monthAttended = monthAppointments.filter((a: AppointmentWithPatient) => a.status === 'concluido').length;

        monthlyEvolution.push({
          month: format(monthDate, 'MMM', { locale: ptBR }),
          attendanceRate: monthTotal > 0 ? Math.round((monthAttended / monthTotal) * 100) : 0,
          total: monthTotal
        });
      }

      // Therapist breakdown
      const therapistMap = new Map<string, TherapistAttendance>();
      appointmentsList.forEach((apt: AppointmentWithPatient) => {
        const therapistId = apt.therapist_id || 'unknown';
        const therapistName = therapistNames.get(therapistId) || 'Não atribuído';

        if (!therapistMap.has(therapistId)) {
          therapistMap.set(therapistId, {
            id: therapistId,
            name: therapistName,
            total: 0,
            attended: 0,
            noShow: 0,
            cancelled: 0,
            rate: 0
          });
        }

        const data = therapistMap.get(therapistId)!;
        data.total++;
        if (apt.status === 'concluido') data.attended++;
        if (apt.status === 'faltou') data.noShow++;
        if (apt.status === 'cancelado') data.cancelled++;
      });

      const therapistData = Array.from(therapistMap.values())
        .map(t => ({ ...t, rate: t.total > 0 ? Math.round((t.attended / t.total) * 100) : 0 }))
        .sort((a, b) => b.rate - a.rate);

      // Hourly analysis
      const hourlyMap = new Map<number, { total: number; noShow: number }>();
      for (let h = 7; h <= 21; h++) {
        hourlyMap.set(h, { total: 0, noShow: 0 });
      }

      appointmentsList.forEach((apt: AppointmentWithPatient) => {
        const hour = parseInt(apt.appointment_time.split(':')[0]);
        if (hourlyMap.has(hour)) {
          const data = hourlyMap.get(hour)!;
          data.total++;
          if (apt.status === 'faltou') data.noShow++;
        }
      });

      const hourlyAnalysis: HourlyAnalysis[] = Array.from(hourlyMap.entries())
        .map(([hour, data]) => ({
          hour: `${hour.toString().padStart(2, '0')}h`,
          total: data.total,
          noShow: data.noShow,
          noShowRate: data.total > 0 ? Math.round((data.noShow / data.total) * 100) : 0
        }))
        .filter(h => h.total > 0);

      // Appointment details
      const appointmentDetails: AppointmentDetail[] = appointmentsList
        .map((apt: AppointmentWithPatient) => ({
          id: apt.id,
          patientName: apt.patients?.full_name || apt.patients?.name || 'Paciente',
          patientPhone: apt.patients?.phone,
          date: apt.appointment_date,
          time: apt.appointment_time,
          therapistName: therapistNames.get(apt.therapist_id || '') || 'Não atribuído',
          status: apt.status || 'agendado',
          notes: apt.notes
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Generate insights
      const insights: Insight[] = [];

      // Best performing therapist
      if (therapistData.length > 0 && therapistData[0].rate >= 90) {
        insights.push({
          type: 'success',
          message: `${therapistData[0].name} tem ${therapistData[0].rate} % de comparecimento - excelente!`
        });
      }

      // Worst day for no-shows
      const worstDay = dayOfWeekData.filter(d => d.total >= 3).sort((a, b) => b.noShowRate - a.noShowRate)[0];
      if (worstDay && worstDay.noShowRate >= 15) {
        insights.push({
          type: 'warning',
          message: `Não - comparecimento predomina às ${worstDay.day.toLowerCase()}s(${worstDay.noShowRate} %)`
        });
      }

      // Worst hour for no-shows
      const worstHour = hourlyAnalysis.filter(h => h.total >= 3).sort((a, b) => b.noShowRate - a.noShowRate)[0];
      const bestHour = hourlyAnalysis.filter(h => h.total >= 3).sort((a, b) => a.noShowRate - b.noShowRate)[0];

      if (worstHour && worstHour.noShowRate >= 15) {
        insights.push({
          type: 'warning',
          message: `Horário com maior falta: ${worstHour.hour} - ${parseInt(worstHour.hour) + 1
            }h(${worstHour.noShowRate
            } %)`
        });
      }

      if (bestHour && bestHour.noShowRate <= 5 && bestHour.total >= 5) {
        insights.push({
          type: 'success',
          message: `Horário com menor falta: ${bestHour.hour} -${parseInt(bestHour.hour) + 1} h(${bestHour.noShowRate} %)`
        });
      }

      // Overall performance
      if (attendanceRate >= 90) {
        insights.push({
          type: 'success',
          message: `Taxa de comparecimento geral de ${attendanceRate}% - excelente desempenho!`
        });
      } else if (attendanceRate < 70) {
        insights.push({
          type: 'warning',
          message: `Taxa de comparecimento de ${attendanceRate}% está abaixo do ideal.Considere enviar lembretes automáticos.`
        });
      }

      return {
        totalAppointments: total,
        attended,
        noShow,
        cancelled,
        attendanceRate,
        cancellationRate,
        noShowRate,
        pieChartData,
        dayOfWeekData,
        monthlyEvolution,
        therapistData,
        hourlyAnalysis,
        appointments: appointmentDetails,
        insights
      };
    },
    refetchInterval: 60000
  });
};

export const useTherapists = () => {
  return useQuery({
    queryKey: ['therapists-list'],
    queryFn: async () => {
      // Query user_roles for admin and fisioterapeuta roles
      const q = firestoreQuery(
        collection(db, 'user_roles'),
        where('role', 'in', ['admin', 'fisioterapeuta'])
      );

      const snapshot = await getDocs(q);
      const userRoles = snapshot.docs.map(doc => normalizeFirestoreData(doc.data())) as UserRole[];

      const userIds = [...new Set(userRoles.map((ur: UserRole) => ur.user_id))];

      const profiles = await Promise.all(userIds.map(async (id) => {
        const profileDoc = await getDoc(doc(db, 'profiles', id));
        return profileDoc.exists() ? { id, full_name: profileDoc.data().full_name as string | undefined } : null;
      }));

      return profiles.filter(Boolean) || [];
    }
  });
};