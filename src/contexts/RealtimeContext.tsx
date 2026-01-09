import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/errors/logger';
import { useAppointments } from '@/hooks/useAppointments';
import { AppointmentType, AppointmentStatus } from '@/types/appointment';

// Tipos para as subscrições realtime
interface RealtimeSubscription {
  unsubscribe: () => void;
}

export interface DashboardMetrics {
  totalAppointments: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  patientsInSession: number;
  todayRevenue: number;
  occupancyRate: number;
}

export interface Appointment {
  id: string;
  patient_name: string;
  therapist_id: string;
  start_time: string;
  end_time?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  type?: string;
}

interface RealtimeContextType {
  appointments: Appointment[];
  metrics: DashboardMetrics;
  lastUpdate: number;
  subscribeToAppointments: () => void;
  updateMetrics: () => Promise<void>;
}

// Criar o contexto
const RealtimeContext = createContext<RealtimeContextType | null>(null);

/**
 * Hook customizado para acessar o contexto de Realtime
 * @throws Error se usado fora do RealtimeProvider
 */
export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime deve ser usado dentro do RealtimeProvider');
  }
  return context;
};

/**
 * Provider central para gerenciar todas as subscrições realtime em um único lugar
 * Elimina a duplicação de subscriptions em múltiplos componentes
 */
export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalAppointments: 0,
    confirmedAppointments: 0,
    cancelledAppointments: 0,
    patientsInSession: 0,
    todayRevenue: 0,
    occupancyRate: 0,
  });
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [isSubscribed, setIsSubscribed] = useState(false);

  /**
   * Subscrever às mudanças na tabela de appointments via Supabase Realtime
   * Esta é a única subscrição central para appointments
   */
  const subscribeToAppointments = useCallback(() => {
    logger.info('Realtime: Subscribing to appointments via Context', {}, 'RealtimeContext');

    const channel = supabase
      .channel('appointments-realtime-central')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: organizationId ? `organization_id=eq.${organizationId}` : undefined,
        },
        (payload) => {
          logger.info('Realtime: Appointment change received', { event: payload.eventType }, 'RealtimeContext');

          if (payload.eventType === 'INSERT') {
            setAppointments(prev => [...prev, payload.new as Appointment]);
          } else if (payload.eventType === 'UPDATE') {
            setAppointments(prev => prev.map(a => a.id === payload.new.id ? payload.new as Appointment : a));
          } else if (payload.eventType === 'DELETE') {
            setAppointments(prev => prev.filter(a => a.id !== payload.old.id));
          }

          setLastUpdate(Date.now());
        }
      )
      .subscribe();

    setIsSubscribed(true);

    return () => {
      logger.info('Realtime: Unsubscribing from appointments channel', {}, 'RealtimeContext');
      supabase.removeChannel(channel);
      setIsSubscribed(false);
    };
  }, [organizationId]);

  /**
   * Carregar appointments iniciais ao montar o provider
   * Isso garante que o estado inicial esteja preenchido
   */
  useEffect(() => {
    const loadInitialAppointments = async () => {
      try {
        logger.info('Realtime: Loading initial appointments', {}, 'RealtimeContext');

        let query = supabase
          .from('appointments')
          .select('*')
          .order('start_time', { ascending: false })
          .limit(50);

        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query;

        if (error) {
          logger.error('Realtime: Error loading initial appointments', error, 'RealtimeContext');
          return;
        }

        if (data) {
          setAppointments(data as Appointment[]);
          logger.info(`Realtime: Loaded ${data.length} initial appointments`, {}, 'RealtimeContext');
        }
      } catch (error) {
        logger.error('Realtime: Error in loadInitialAppointments', error, 'RealtimeContext');
      }
    };

    loadInitialAppointments();
  }, [organizationId]); // Recarregar se mudar a organização

  /**
   * Atualizar métricas baseadas nos appointments atuais
   * Isso elimina a necessidade de múltiplas consultas ao Supabase
   */
  const updateMetrics = useCallback(async () => {
    logger.info('Realtime: Updating metrics', {}, 'RealtimeContext');

    try {
      // Calcular métricas a partir dos appointments
      const total = appointments.length;
      const confirmed = appointments.filter(a => a.status === 'confirmed').length;
      const cancelled = appointments.filter(a => a.status === 'cancelled').length;

      // Calcular receita de hoje
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0); // Meia-noite
      const todayRevenue = appointments
        .filter(a => {
          const apptDate = new Date(a.start_time);
          return apptDate >= todayStart && a.status === 'confirmed';
        })
        .reduce((sum, a) => sum + (a.type === 'paid' ? 100 : 0), 0); // Simulação: 100 por consulta paga

      // Calcular taxa de ocupação
      const occupancyRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;

      // Buscar pacientes em sessão (simplificado)
      const patientsInSession = appointments
        .filter(a => a.status === 'confirmed')
        .map(a => a.patient_name)
        .filter((value, index, self) => self.indexOf(value) === index)
        .length;

      setMetrics({
        totalAppointments: total,
        confirmedAppointments: confirmed,
        cancelledAppointments: cancelled,
        patientsInSession,
        todayRevenue,
        occupancyRate,
      });

      logger.info('Realtime: Metrics updated', { total, confirmed, cancelled, revenue, occupancyRate }, 'RealtimeContext');
    } catch (error) {
      logger.error('Realtime: Error in updateMetrics', error, 'RealtimeContext');

      // Manter valores padrão em caso de erro
      setMetrics(prev => ({
        ...prev,
        totalAppointments: appointments.length,
      }));
    }
  }, [appointments]);

  const value: RealtimeContextType = {
    appointments,
    metrics,
    lastUpdate,
    subscribeToAppointments,
    updateMetrics,
    isSubscribed,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};
