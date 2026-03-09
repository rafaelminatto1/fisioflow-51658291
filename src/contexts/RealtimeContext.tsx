import { createContext, useState, useCallback, useEffect } from 'react';
import { appointmentsApi } from '@/lib/api/workers-client';
import { useAuth } from '@/contexts/AuthContext';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { useDebounce } from '@/hooks/performance/useDebounce';

let _loggedRealtimeNoOrgId = false;

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

// Criar o contexto (exportado para useRealtimeContext)
export const RealtimeContext = createContext<RealtimeContextType | null>(null);

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
   * Carregar appointments iniciais ao montar o provider
   * OTIMIZADO: Só carrega appointments futuros e dos últimos 7 dias
   */
  const loadInitialAppointments = useCallback(async () => {
    if (!organizationId) return;

    try {
      logger.debug('Realtime: Loading initial appointments via Functions', {}, 'RealtimeContext');

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateFrom = sevenDaysAgo.toISOString().split('T')[0];

      const response = await appointmentsApi.list({
        dateFrom,
        limit: 100
      });

      if (response.data) {
        setAppointments(response.data as unknown as Appointment[]);
        setLastUpdate(Date.now());
        logger.debug(`Realtime: Loaded ${response.data.length} initial appointments`, {}, 'RealtimeContext');
      }
    } catch (error) {
      logger.error('Realtime: Error in loadInitialAppointments', error, 'RealtimeContext');
    }
  }, [organizationId]);

  /**
   * Substitui o antigo RTDB por polling leve contra a Workers API.
   */
  const subscribeToAppointments = useCallback(() => {
    if (!organizationId) {
      if (!_loggedRealtimeNoOrgId) {
        _loggedRealtimeNoOrgId = true;
        logger.debug('Realtime: No organization_id, skipping subscription', {}, 'RealtimeContext');
      }
      return () => { };
    }

    logger.debug('Realtime: Starting appointments polling', { organizationId }, 'RealtimeContext');
    setIsSubscribed(true);
    loadInitialAppointments();
    const intervalId = window.setInterval(() => {
      loadInitialAppointments();
    }, 30000);

    return () => {
      logger.debug('Realtime: Stopping appointments polling', { organizationId }, 'RealtimeContext');
      window.clearInterval(intervalId);
      setIsSubscribed(false);
    };
  }, [organizationId, loadInitialAppointments]);

  /**
   * Carregar appointments iniciais ao montar o provider
   * OTIMIZADO: Só carrega appointments futuros e dos últimos 7 dias
   */
  useEffect(() => {
    loadInitialAppointments();
  }, [loadInitialAppointments]);

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

export { useRealtime } from '@/hooks/useRealtimeContext';
