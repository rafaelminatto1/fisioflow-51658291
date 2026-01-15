import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/errors/logger';
import { useDebounce } from '@/hooks/performance/useDebounce';

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
  isSubscribed: boolean;
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
 * Otimizado para evitar memory leaks com cleanup adequado
 *
 * OTIMIZAÇÕES IMPLEMENTADAS:
 * 1. Batch updates para múltiplas mudanças rápidas
 * 2. Debounce inteligente para evitar recálculos excessivos
 * 3. Filtragem por data (só appointments futuros/recentes em memória)
 * 4. Métricas calculadas em memória (sem queries adicionais)
 * 5. Cleanup adequado de channels
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

  // Ref para tracking de updates em batch
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingUpdatesRef = useRef<Array<(prev: Appointment[]) => Appointment[]>>([]);

  /**
   * Atualizar métricas baseadas nos appointments atuais
   * Usa memoização interna para evitar recálculos desnecessários
   */
  const updateMetrics = useCallback(async () => {
    // Early return se não houver appointments
    if (appointments.length === 0) {
      setMetrics({
        totalAppointments: 0,
        confirmedAppointments: 0,
        cancelledAppointments: 0,
        patientsInSession: 0,
        todayRevenue: 0,
        occupancyRate: 0,
      });
      return;
    }

    try {
      // Calcular métricas em uma única passagem (O(n) em vez de O(n*5))
      let confirmed = 0;
      let cancelled = 0;
      let revenue = 0;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const patientSet = new Set<string>();

      for (const a of appointments) {
        if (a.status === 'confirmed') {
          confirmed++;
          patientSet.add(a.patient_name);

          const apptDate = new Date(a.start_time);
          if (apptDate >= todayStart && a.type === 'paid') {
            revenue += 100;
          }
        } else if (a.status === 'cancelled') {
          cancelled++;
        }
      }

      const total = appointments.length;
      const occupancyRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;

      setMetrics({
        totalAppointments: total,
        confirmedAppointments: confirmed,
        cancelledAppointments: cancelled,
        patientsInSession: patientSet.size,
        todayRevenue: revenue,
        occupancyRate,
      });
    } catch (error) {
      logger.error('Realtime: Error in updateMetrics', error, 'RealtimeContext');
    }
  }, [appointments]);

  // Debounced appointments para evitar recálculos em mudanças rápidas
  const debouncedAppointments = useDebounce(appointments, 300);

  // Atualizar métricas quando appointments debounced mudar
  useEffect(() => {
    updateMetrics();
  }, [updateMetrics, debouncedAppointments]);

  /**
   * Processa updates em batch para múltiplas mudanças rápidas
   * Reduz número de re-renders significativamente
   */
  const flushPendingUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.length === 0) return;

    setAppointments(prev => {
      let result = prev;
      for (const updateFn of pendingUpdatesRef.current) {
        result = updateFn(result);
      }
      return result;
    });

    pendingUpdatesRef.current = [];
    setLastUpdate(Date.now());
  }, []);

  /**
   * Handler otimizado para mudanças de Realtime
   * Acumula mudanças e processa em batch
   */
  const handleRealtimeChange = useCallback((payload: { eventType?: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
    const updateFn = (prev: Appointment[]) => {
      if (payload.eventType === 'INSERT') {
        // Só adiciona se for futuro ou hoje (reduz tamanho do array)
        const apptDate = new Date(payload.new.start_time || payload.new.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (apptDate >= today) {
          return [...prev, payload.new as Appointment];
        }
        return prev;
      } else if (payload.eventType === 'UPDATE') {
        return prev.map(a => a.id === payload.new.id ? payload.new as Appointment : a);
      } else if (payload.eventType === 'DELETE') {
        return prev.filter(a => a.id !== payload.old.id);
      }
      return prev;
    };

    pendingUpdatesRef.current.push(updateFn);

    // Limpar timeout anterior e agendar novo
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(flushPendingUpdates, 100);
  }, [flushPendingUpdates]);

  /**
   * Subscrever às mudanças na tabela de appointments via Supabase Realtime
   * Otimizado com filtros específicos para reduzir tráfego
   *
   * FIX: Tracka estado de subscription para evitar erros de WebSocket
   */
  const subscribeToAppointments = useCallback(() => {
    if (!organizationId) {
      logger.warn('Realtime: No organization_id, skipping subscription', {}, 'RealtimeContext');
      return () => {};
    }

    logger.info('Realtime: Subscribing to appointments via Context', { organizationId }, 'RealtimeContext');

    let isSubscribed = false;
    const channel = supabase.channel(`appointments-realtime-${organizationId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: '' }
        }
      });

    // Type assertion para postgres_changes devido ao tipo Database genérico
    (channel as any)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `organization_id=eq.${organizationId}`,
        },
        handleRealtimeChange
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          isSubscribed = true;
          setIsSubscribed(true);
          logger.info('Realtime: Successfully subscribed', { organizationId }, 'RealtimeContext');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Realtime: Channel error', { organizationId }, 'RealtimeContext');
          setIsSubscribed(false);
        }
      });

    return () => {
      logger.info('Realtime: Unsubscribing from appointments channel', { organizationId, isSubscribed }, 'RealtimeContext');

      // Só remove channel se foi inscrito com sucesso
      // Isso previne "WebSocket is closed before the connection is established"
      if (isSubscribed) {
        supabase.removeChannel(channel).catch((err) => {
          logger.debug('Erro ao remover canal (ignorado)', err, 'RealtimeContext');
        });
      }

      setIsSubscribed(false);

      // Limpar timeouts pendentes
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [organizationId, handleRealtimeChange]);

  /**
   * Carregar appointments iniciais ao montar o provider
   * OTIMIZADO: Só carrega appointments futuros e dos últimos 7 dias
   */
  useEffect(() => {
    const loadInitialAppointments = async () => {
      if (!organizationId) return;

      try {
        logger.info('Realtime: Loading initial appointments', {}, 'RealtimeContext');

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('date', sevenDaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(100);

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
  }, [organizationId]);

  /**
   * Setup realtime subscription quando o componente monta
   * Cleanup automático quando desmonta para evitar memory leaks
   */
  useEffect(() => {
    const unsubscribe = subscribeToAppointments();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [subscribeToAppointments]);

  const value: RealtimeContextType = {
    appointments,
    metrics,
    lastUpdate,
    isSubscribed,
    subscribeToAppointments,
    updateMetrics,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};
