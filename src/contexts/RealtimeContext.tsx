import { createContext, useState, useCallback, useEffect, useRef } from 'react';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { app } from '@/integrations/firebase/app';
import { appointmentsApi } from '@/integrations/firebase/functions';
import { useAuth } from '@/contexts/AuthContext';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { useDebounce } from '@/hooks/performance/useDebounce';
import { parseResponseDate } from '@/utils/dateUtils';

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
  const [retryCount, setRetryCount] = useState(0);

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
  const handleRealtimeChange = useCallback((payload: {
    eventType: string;
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }) => {
    const updateFn = (prev: Appointment[]) => {
      if (payload.eventType === 'INSERT') {
        const newData = payload.new as Appointment;
        // Só adiciona se for futuro ou hoje (reduz tamanho do array)
        // Usar parseResponseDate para evitar problemas de timezone com strings "YYYY-MM-DD"
        const dateStr = newData.start_time || (newData as unknown).date || '';
        const apptDate = dateStr ? parseResponseDate(dateStr) : new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (apptDate >= today) {
          return [...prev, newData];
        }
        return prev;
      } else if (payload.eventType === 'UPDATE') {
        const newData = payload.new as Appointment;
        return prev.map(a => a.id === newData.id ? newData : a);
      } else if (payload.eventType === 'DELETE') {
        const oldData = payload.old as { id: string };
        return prev.filter(a => a.id !== oldData.id);
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
        setAppointments(response.data as Appointment[]);
        logger.debug(`Realtime: Loaded ${response.data.length} initial appointments`, {}, 'RealtimeContext');
      }
    } catch (error) {
      logger.error('Realtime: Error in loadInitialAppointments', error, 'RealtimeContext');
    }
  }, [organizationId]);

  /**
   * Subscrever às mudanças na agenda via Firebase Realtime Database
   * Otimizado com triggers para reduzir tráfego
   *
   * FIX: Tracka estado de subscription para evitar erros
   */
  const subscribeToAppointments = useCallback(() => {
    if (!organizationId) {
      if (!_loggedRealtimeNoOrgId) {
        _loggedRealtimeNoOrgId = true;
        logger.debug('Realtime: No organization_id, skipping subscription', {}, 'RealtimeContext');
      }
      return () => { };
    }

    logger.debug('Realtime: Subscribing to appointments via RTDB', { organizationId, retryCount }, 'RealtimeContext');

    let db;
    try {
      db = getDatabase(app);
    } catch (error) {
      logger.debug('Realtime: RTDB not available, skipping subscription', error, 'RealtimeContext');
      return () => { };
    }

    const triggerRef = ref(db, `orgs/${organizationId}/agenda/refresh_trigger`);

    const unsubscribe = onValue(triggerRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        // RTDB trigger contains both the signal and optional payload
        logger.debug('Realtime (RTDB): Agenda refresh signal received', { organizationId, val }, 'RealtimeContext');

        // If payload contains event data, process it
        if (val.data && typeof val.data === 'object') {
          handleRealtimeChange(val.data as {
            eventType: string;
            new: Record<string, unknown>;
            old: Record<string, unknown>;
          });
        } else {
          // No detailed payload, reload from API
          loadInitialAppointments();
        }
      }
    });

    setIsSubscribed(true);

    return () => {
      logger.debug('Realtime (RTDB): Unsubscribing from agenda trigger', { organizationId }, 'RealtimeContext');
      off(triggerRef, 'value', unsubscribe);
      setIsSubscribed(false);

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [organizationId, handleRealtimeChange, retryCount, loadInitialAppointments]);

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
