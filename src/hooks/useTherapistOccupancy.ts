import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

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

// Horas disponíveis por dia da semana
const getAvailableHours = (dayOfWeek: number): number => {
  // 0 = Domingo, 6 = Sábado
  if (dayOfWeek === 0) return 0; // Domingo fechado
  if (dayOfWeek === 6) return 6; // Sábado 7h-13h
  return 14; // Seg-Sex 7h-21h
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
  return useQuery({
    queryKey: ['therapist-occupancy', options.period, options.startDate?.toISOString(), options.endDate?.toISOString()],
    queryFn: async (): Promise<OccupancyMetrics> => {
      const { start, end } = getDateRange(options.period, options.startDate, options.endDate);
      const today = format(new Date(), 'yyyy-MM-dd');

      // Buscar todos os user_ids com role de fisioterapeuta ou admin
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'fisioterapeuta']);

      if (rolesError) throw rolesError;

      const therapistUserIds = [...new Set((userRoles || []).map(ur => ur.user_id))];

      // Buscar profiles dos fisioterapeutas
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url')
        .in('user_id', therapistUserIds);

      if (profilesError) throw profilesError;

      const therapists = (profiles || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        avatar_url: p.avatar_url
      }));

      // Buscar agendamentos do período (usando therapist_id que é o profile id)
      const therapistIds = therapists.map(t => t.id);

      // Se não há therapists, retornar arrays vazios
      let appointments: Array<{ id?: string; patient_id?: string; appointment_date?: string }> = [];
      let todayAppointments: Array<{ id?: string }> = [];

      if (therapistIds.length > 0) {
        const { data: appointmentsData, error: aptsError } = await supabase
          .from('appointments')
          .select('id, therapist_id, appointment_date, appointment_time, duration, status')
          .gte('appointment_date', format(start, 'yyyy-MM-dd'))
          .lte('appointment_date', format(end, 'yyyy-MM-dd'))
          .neq('status', 'cancelado')
          .in('therapist_id', therapistIds);

        if (aptsError) throw aptsError;
        appointments = appointmentsData || [];

        // Buscar agendamentos de hoje para dados horários
        const { data: todayData } = await supabase
          .from('appointments')
          .select('id, therapist_id, appointment_time, duration, status')
          .eq('appointment_date', today)
          .neq('status', 'cancelado')
          .in('therapist_id', therapistIds);

        todayAppointments = todayData || [];
      }

      // Calcular métricas por fisioterapeuta
      const therapistMetrics: TherapistOccupancyData[] = therapists.map(therapist => {
        const therapistAppointments = (appointments || []).filter(a => a.therapist_id === therapist.id);
        const todayTherapistAppointments = therapistAppointments.filter(a => a.appointment_date === today);

        // Calcular horas trabalhadas
        const totalMinutes = therapistAppointments.reduce((acc, apt) => acc + (apt.duration || 50), 0);
        const horasTrabalhadas = totalMinutes / 60;

        // Calcular capacidade total para o período
        let capacidadeTotal = 0;
        const currentDate = new Date(start);
        while (currentDate <= end) {
          capacidadeTotal += getAvailableHours(currentDate.getDay());
          currentDate.setDate(currentDate.getDate() + 1);
        }

        const taxaOcupacao = capacidadeTotal > 0 ? Math.round((horasTrabalhadas / capacidadeTotal) * 100) : 0;

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
            const aptHour = parseInt(apt.appointment_time.split(':')[0]);
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
