/**
 * useTherapistOccupancy - Migrated to Firebase
 */

import { useQuery } from '@tanstack/react-query';
import { collection, query as firestoreQuery, where, getDocs, db } from '@/integrations/firebase/app';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { normalizeFirestoreData } from '@/utils/firestoreData';
import { useAuth } from '@/contexts/AuthContext';
import type { AvailableHours } from '@/types/auth';
import { fisioLogger as logger } from '@/lib/errors/logger';

export interface TherapistOccupancyData {
  id: string;
  name: string;
  avatarUrl?: string;
  consultasHoje: number;
  horasTrabalhadas: number;
  capacidadeHoras: number;
  taxaOcupacao: number;
  status: 'otimo' | 'bom' | 'baixo';
}

export interface OccupancyMetrics {
  ocupacaoMedia: number;
  totalConsultasHoje: number;
  totalHorasTrabalhadas: number;
  fisioterapeutasAtivos: number;
  therapists: TherapistOccupancyData[];
  hourlyData: { hour: string;[key: string]: number | string }[];
  suggestions: { type: 'success' | 'warning' | 'info'; message: string }[];
}

type PeriodFilter = 'today' | 'week' | 'month' | 'custom';

interface UseTherapistOccupancyOptions {
  period: PeriodFilter;
  startDate?: Date;
  endDate?: Date;
}

const THERAPIST_ROLES = new Set(['admin', 'fisioterapeuta', 'estagiario']);
const CANCELED_STATUSES = new Set(['cancelado', 'cancelada', 'cancelled', 'canceled']);

type AvailableHoursLike = AvailableHours | Record<string, unknown> | undefined;

// Horas disponíveis por dia da semana
const getAvailableHours = (dayOfWeek: number): number => {
  // 0 = Domingo, 6 = Sábado
  if (dayOfWeek === 0) return 0; // Domingo fechado
  if (dayOfWeek === 6) return 6; // Sábado 7h-13h
  return 14; // Seg-Sex 7h-21h
};

const parseHourRange = (startTime: unknown, endTime: unknown): number | null => {
  if (typeof startTime !== 'string' || typeof endTime !== 'string') return null;
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  if ([startHour, startMinute, endHour, endMinute].some(Number.isNaN)) return null;
  const total = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60;
  return total > 0 ? total : null;
};

const getProfileDailyHours = (availableHours: AvailableHoursLike, dayOfWeek: number): number => {
  if (!availableHours || typeof availableHours !== 'object') {
    return getAvailableHours(dayOfWeek);
  }

  const dayKeys = [
    String(dayOfWeek),
    ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek],
    ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'][dayOfWeek],
    ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][dayOfWeek],
  ];

  const hoursRecord = availableHours as Record<string, unknown>;
  for (const key of dayKeys) {
    const value = hoursRecord[key];
    if (!value || typeof value !== 'object') continue;

    const dayConfig = value as Record<string, unknown>;
    if (dayConfig.available === false) return 0;

    const parsed = parseHourRange(dayConfig.start ?? dayConfig.start_time, dayConfig.end ?? dayConfig.end_time);
    if (parsed !== null) return parsed;
  }

  return getAvailableHours(dayOfWeek);
};

const getCapacityHoursForPeriod = (start: Date, end: Date, availableHours?: AvailableHoursLike): number => {
  let total = 0;
  const currentDate = new Date(start);

  while (currentDate <= end) {
    total += getProfileDailyHours(availableHours, currentDate.getDay());
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return Math.round(total * 10) / 10;
};

const getAppointmentHour = (appointment: { appointment_time?: string; start_time?: string }): number | null => {
  const value = appointment.appointment_time || appointment.start_time;
  if (!value || typeof value !== 'string') return null;
  const hour = Number.parseInt(value.split(':')[0], 10);
  return Number.isNaN(hour) ? null : hour;
};

const getDateRange = (period: PeriodFilter, startDate?: Date, endDate?: Date) => {
  const today = new Date();

  switch (period) {
    case 'today':
      return { start: startOfDay(today), end: endOfDay(today) };
    case 'week':
      return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(today), end: endOfMonth(today) };
    case 'custom':
      return {
        start: startDate ? startOfDay(startDate) : startOfDay(today),
        end: endDate ? endOfDay(endDate) : endOfDay(today)
      };
    default:
      return { start: startOfDay(today), end: endOfDay(today) };
  }
};

export const useTherapistOccupancy = (options: UseTherapistOccupancyOptions = { period: 'today' }) => {
  const { organizationId } = useAuth();

  return useQuery({
    queryKey: ['therapist-occupancy', organizationId, options.period, options.startDate?.toISOString(), options.endDate?.toISOString()],
    enabled: !!organizationId,
    queryFn: async (): Promise<OccupancyMetrics> => {
      if (!organizationId) {
        return {
          ocupacaoMedia: 0,
          totalConsultasHoje: 0,
          totalHorasTrabalhadas: 0,
          fisioterapeutasAtivos: 0,
          therapists: [],
          hourlyData: [],
          suggestions: []
        };
      }

      const { start, end } = getDateRange(options.period, options.startDate, options.endDate);
      const today = format(new Date(), 'yyyy-MM-dd');

      interface TherapistProfile {
        id: string;
        user_id?: string;
        full_name?: string;
        avatar_url?: string;
        role?: string;
        is_active?: boolean;
        available_hours?: AvailableHoursLike;
      }

      const profilesQ = firestoreQuery(
        collection(db, 'profiles'),
        where('organization_id', '==', organizationId)
      );
      const profilesSnap = await getDocs(profilesQ);

      const therapists: TherapistProfile[] = profilesSnap.docs
        .map((doc) => {
          const data = normalizeFirestoreData(doc.data()) as Record<string, unknown>;
          return {
            id: doc.id,
            user_id: typeof data.user_id === 'string' ? data.user_id : undefined,
            full_name: typeof data.full_name === 'string' ? data.full_name : undefined,
            avatar_url: typeof data.avatar_url === 'string' ? data.avatar_url : undefined,
            role: typeof data.role === 'string' ? data.role.toLowerCase() : undefined,
            is_active: data.is_active as boolean | undefined,
            available_hours: data.available_hours as AvailableHoursLike
          };
        })
        .filter((profile) =>
          profile.is_active !== false &&
          profile.role !== 'pending' &&
          (profile.role ? THERAPIST_ROLES.has(profile.role) : false)
        );

      if (therapists.length === 0) {
        logger.info('[useTherapistOccupancy] No active therapists found for organization', { organizationId }, 'useTherapistOccupancy');
        return {
          ocupacaoMedia: 0,
          totalConsultasHoje: 0,
          totalHorasTrabalhadas: 0,
          fisioterapeutasAtivos: 0,
          therapists: [],
          hourlyData: [],
          suggestions: []
        };
      }

      const therapistLookup = new Map<string, TherapistProfile>();
      therapists.forEach((therapist) => {
        therapistLookup.set(therapist.id, therapist);
        if (therapist.user_id) therapistLookup.set(therapist.user_id, therapist);
      });

      interface Appointment {
        id: string;
        therapist_id?: string;
        appointment_date?: string;
        appointment_time?: string;
        start_time?: string;
        status?: string;
        duration?: number;
        organization_id?: string;
      }

      let rawAppointments: Appointment[] = [];
      const dateFrom = format(start, 'yyyy-MM-dd');
      const dateTo = format(end, 'yyyy-MM-dd');

      try {
        const appointmentsQ = firestoreQuery(
          collection(db, 'appointments'),
          where('organization_id', '==', organizationId),
          where('appointment_date', '>=', dateFrom),
          where('appointment_date', '<=', dateTo)
        );
        const appointmentsSnap = await getDocs(appointmentsQ);
        rawAppointments = appointmentsSnap.docs.map((doc) => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) } as Appointment));
      } catch (error) {
        logger.warn('[useTherapistOccupancy] Date-range query failed, falling back to org-only query', { organizationId, error }, 'useTherapistOccupancy');
        const appointmentsFallbackQ = firestoreQuery(
          collection(db, 'appointments'),
          where('organization_id', '==', organizationId)
        );
        const appointmentsFallbackSnap = await getDocs(appointmentsFallbackQ);
        rawAppointments = appointmentsFallbackSnap.docs
          .map((doc) => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) } as Appointment))
          .filter((appointment) => {
            const date = appointment.appointment_date;
            return typeof date === 'string' && date >= dateFrom && date <= dateTo;
          });
      }

      const appointments = rawAppointments.flatMap((appointment) => {
        const therapistId = typeof appointment.therapist_id === 'string' ? appointment.therapist_id : '';
        const mappedTherapist = therapistLookup.get(therapistId);
        if (!mappedTherapist) return [];

        const status = String(appointment.status || '').toLowerCase();
        if (CANCELED_STATUSES.has(status)) return [];

        return [{
          ...appointment,
          therapist_id: mappedTherapist.id
        }];
      });

      const todayAppointments = appointments.filter((appointment) => appointment.appointment_date === today);

      // Calcular métricas por fisioterapeuta
      const therapistMetrics: TherapistOccupancyData[] = therapists.map(therapist => {
        const therapistAppointments = (appointments || []).filter(a => a.therapist_id === therapist.id);
        const todayTherapistAppointments = therapistAppointments.filter(a => a.appointment_date === today);

        // Calcular horas trabalhadas
        const totalMinutes = therapistAppointments.reduce((acc, apt) => {
          const duration = Number(apt.duration);
          return acc + (Number.isFinite(duration) && duration > 0 ? duration : 50);
        }, 0);
        const horasTrabalhadas = totalMinutes / 60;

        // Calcular capacidade total do período com base no horário do perfil
        const capacidadeTotal = getCapacityHoursForPeriod(start, end, therapist.available_hours);

        const taxaOcupacao = capacidadeTotal > 0
          ? Math.min(100, Math.max(0, Math.round((horasTrabalhadas / capacidadeTotal) * 100)))
          : 0;

        let status: 'otimo' | 'bom' | 'baixo' = 'baixo';
        if (taxaOcupacao >= 80) status = 'otimo';
        else if (taxaOcupacao >= 50) status = 'bom';

        return {
          id: therapist.id,
          name: therapist.full_name || 'Sem nome',
          avatarUrl: therapist.avatar_url || undefined,
          consultasHoje: todayTherapistAppointments.length,
          horasTrabalhadas: Math.round(horasTrabalhadas * 10) / 10,
          capacidadeHoras: capacidadeTotal,
          taxaOcupacao,
          status
        };
      });

      // Calcular dados horários (7h-21h)
      const hourlyData: { hour: string;[key: string]: number | string }[] = [];
      for (let hour = 7; hour <= 21; hour++) {
        const hourStr = `${hour.toString().padStart(2, '0')}:00`;
        const hourData: { hour: string;[key: string]: number | string } = { hour: hourStr };

        therapistMetrics.forEach(therapist => {
          const appointmentsAtHour = (todayAppointments || []).filter(apt => {
            if (apt.therapist_id !== therapist.id) return false;
            const aptHour = getAppointmentHour(apt);
            if (aptHour === null) return false;
            return aptHour === hour;
          });
          hourData[therapist.name] = appointmentsAtHour.length;
        });

        hourlyData.push(hourData);
      }

      // Gerar sugestões
      const suggestions: { type: 'success' | 'warning' | 'info'; message: string }[] = [];

      therapistMetrics.forEach(therapist => {
        if (therapist.taxaOcupacao >= 85) {
          suggestions.push({
            type: 'success',
            message: `${therapist.name} tem ${therapist.taxaOcupacao}% de ocupação - excelente desempenho!`
          });
        } else if (therapist.taxaOcupacao < 40) {
          suggestions.push({
            type: 'warning',
            message: `${therapist.name} tem apenas ${therapist.taxaOcupacao}% de ocupação - considere agendar mais pacientes`
          });
        }
      });

      // Verificar desequilíbrio
      const taxas = therapistMetrics.map(t => t.taxaOcupacao);
      if (taxas.length > 1) {
        const maxTaxa = Math.max(...taxas);
        const minTaxa = Math.min(...taxas);
        if ((maxTaxa - minTaxa) > 30) {
          suggestions.push({
            type: 'info',
            message: `Há um desequilíbrio de ${maxTaxa - minTaxa}% entre os fisioterapeutas. Considere redistribuir os agendamentos.`
          });
        }
      }

      // Calcular totais
      const totalConsultasHoje = therapistMetrics.reduce((acc, t) => acc + t.consultasHoje, 0);
      const totalHorasTrabalhadas = therapistMetrics.reduce((acc, t) => acc + t.horasTrabalhadas, 0);
      const ocupacaoMedia = therapistMetrics.length > 0
        ? Math.round(therapistMetrics.reduce((acc, t) => acc + t.taxaOcupacao, 0) / therapistMetrics.length)
        : 0;

      return {
        ocupacaoMedia,
        totalConsultasHoje,
        totalHorasTrabalhadas: Math.round(totalHorasTrabalhadas * 10) / 10,
        fisioterapeutasAtivos: therapistMetrics.length,
        therapists: therapistMetrics.sort((a, b) => b.taxaOcupacao - a.taxaOcupacao),
        hourlyData,
        suggestions
      };
    },
    refetchInterval: 60000 // Atualiza a cada minuto
  });
};
